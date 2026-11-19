#!/usr/bin/env node
/* 把 index.html 里的菜库同步进 Netlify 函数的 SYSTEM 提示里。
   两处各存一份必然漂移，所以以 index.html 为准，这里只做搬运。

   用法：
     node tools/sync-ai.mjs           写入
     node tools/sync-ai.mjs --check   只检查，不一致就退出 1（给提交前用）
*/
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(root, "index.html");
/* 主部署是 Cloudflare Pages（functions/api/pick.js）；
   Netlify 那份留作回滚备份，两边一起同步，免得提示词漂移。 */
const TARGETS = [
  join(root, "functions", "api", "pick.js"),
  join(root, "netlify", "functions", "pick.mjs")
];
const BEGIN = "/* DISHES:BEGIN */";
const END = "/* DISHES:END */";

function rel(p) {
  return p.slice(root.length + 1).replace(/\\/g, "/");
}

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

const html = readFileSync(PAGE, "utf8");
const start = html.indexOf("var DISHES = [");
if (start < 0) die("index.html 里找不到 var DISHES = [");

const open = html.indexOf("[", start);
const close = html.indexOf("];", open);
if (close < 0) die("菜库数组没有结尾");

let dishes;
try {
  dishes = new Function("return " + html.slice(open, close + 1))();
} catch (e) {
  die("菜库解析失败：" + e.message);
}
if (!Array.isArray(dishes) || dishes.length < 10) die("菜库解析结果不对劲");

/* 一行一道：菜名|标签,标签,汤/饭
   汤和饭不是标签而是结构位，压成同一行能让模型知道「这碗能当一顿」 */
const block = dishes.map((d) => {
  const tags = (d.tags || []).slice();
  if (d.soup === 1) tags.push("汤");
  if (d.staple === 1) tags.push("饭");
  return d.name + "|" + tags.join(",");
});

const fresh =
  BEGIN + "\nconst DISHES = `\n" + block.join("\n") + "\n`;\n" + END;

/* Windows 检出会把行尾变成 CRLF，而这里生成的块固定用 LF：
   先归一化再比较，否则 --check 会在干净的仓库上误报「不同步」 */
const pending = [];
for (const file of TARGETS) {
  const fn = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const i = fn.indexOf(BEGIN);
  const j = fn.indexOf(END);
  if (i < 0 || j < 0) die(rel(file) + " 里缺少 DISHES:BEGIN / DISHES:END 标记");
  const next = fn.slice(0, i) + fresh + fn.slice(j + END.length);
  if (next !== fn) pending.push({ file: file, next: next });
}

if (process.argv.includes("--check")) {
  if (pending.length) {
    die("菜库不同步：" + pending.map(function (p) { return rel(p.file); }).join("、") + "，跑一次 node tools/sync-ai.mjs");
  }
  console.log("✓ 菜库已同步（" + dishes.length + " 道 × " + TARGETS.length + " 个文件）");
  process.exit(0);
}

/* 统一写回 LF，和仓库里的 blob 保持一致 */
for (const p of pending) writeFileSync(p.file, p.next, "utf8");
console.log("✓ 已同步 " + dishes.length + " 道菜 → " + TARGETS.map(rel).join("、"));
