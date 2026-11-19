#!/usr/bin/env node
/* 从 index.html 的 DISHES 生成 dishes.md，避免两份数据漂移。
   用法：
     node tools/md-dishes.mjs           写入
     node tools/md-dishes.mjs --check   只检查，不一致就退出 1
*/
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(root, "index.html");
const MD = join(root, "dishes.md");
const check = process.argv.includes("--check");

const html = readFileSync(PAGE, "utf8");
const start = html.indexOf("var DISHES = [");
if (start < 0) {
  console.error("✗ index.html 里找不到 var DISHES = [");
  process.exit(1);
}
const open = html.indexOf("[", start);
const close = html.indexOf("];", open);
const dishes = new Function("return " + html.slice(open, close + 1))();

const count = (tag) => dishes.filter((d) => d.tags.includes(tag)).length;
const soups = dishes.filter((d) => d.soup === 1).length;
const staples = dishes.filter((d) => d.staple === 1).length;
const sides = dishes.filter((d) => d.soup !== 1 && d.staple !== 1).length;

function match(d, noSpicy, gentle, noodle) {
  const t = d.tags;
  if (noSpicy && t.includes("辣")) return false;
  if (gentle && !t.includes("清淡")) return false;
  if (noodle && !t.includes("面")) return false;
  return true;
}
function poolOf(noSpicy, gentle, noodle) {
  return dishes.filter((d) => match(d, noSpicy, gentle, noodle));
}

let worst = { count: Infinity, label: "" };
for (const noSpicy of [false, true]) {
  for (const gentle of [false, true]) {
    for (const noodle of [false, true]) {
      let g = gentle;
      let n = noodle;
      let pool = poolOf(noSpicy, g, n);
      if (!pool.length && n) {
        n = false;
        pool = poolOf(noSpicy, g, n);
      }
      if (!pool.length && g) {
        g = false;
        pool = poolOf(noSpicy, g, n);
      }
      const label = [
        noSpicy ? "不吃辣" : "",
        gentle ? "清淡点" : "",
        noodle ? "想吃面" : "",
      ].filter(Boolean).join(" + ") || "什么都不选";
      if (pool.length < worst.count) worst = { count: pool.length, label };
    }
  }
}

const GROUPS = [
  ["清淡", "荤"],
  ["清淡", "素"],
  ["辣", "荤"],
  ["辣", "素"],
  ["重口", "荤"],
  ["重口", "素"],
];

const lines = [];
lines.push("# 今天吃什么 · 菜库");
lines.push("");
lines.push("**共 " + dishes.length + " 道**。本文件由 `node tools/md-dishes.mjs` 从 `index.html` 的 `DISHES` 数组生成，请勿手改。");
lines.push("");
lines.push("标签规则（`node tools/validate.mjs` 会强制检查）：");
lines.push("- `荤` / `素` 必选其一（蛋类、豆制品、菌菇、面食计入素）");
lines.push("- `辣` / `清淡` / `重口` 必选其一");
lines.push("- `面`（主食为面条/米线/粉）、`海鲜` 可选，且只能作为第三个标签出现（两者互斥）");
lines.push("- 每道菜 2–3 个标签；文案 8–12 字，不写做法、不带感叹号");
lines.push("");
lines.push("一餐组合的标记：");
lines.push("- `汤` 列有勾的进汤池（" + soups + " 道），可被「配个汤」摇到；汤池里不放面类");
lines.push("- `饭` 列有勾的表示**自带主食**（" + staples + " 道：面/粉/饺/饭/粥/包/饼），不再配米饭");
lines.push("- 两列都空的是普通菜（" + sides + " 道），默认配米饭，可当加菜");
lines.push("");
lines.push("---");

let seq = 0;
for (const [flavor, kind] of GROUPS) {
  const group = dishes.filter((d) => d.tags.includes(flavor) && d.tags.includes(kind));
  lines.push("");
  lines.push("## " + flavor + " · " + kind + "（" + group.length + " 道）");
  lines.push("");
  lines.push("| # | 菜名 | 文案 | 标签 | 汤 | 饭 |");
  lines.push("|---|---|---|---|---|---|");
  for (const d of group) {
    seq++;
    lines.push(
      "| " + seq + " | " + d.name + " | " + d.desc + " | " + d.tags.join(" / ") + " | " +
      (d.soup === 1 ? "✓" : "") + " | " + (d.staple === 1 ? "✓" : "") + " |"
    );
  }
}

const pct = (n) => Math.round((n / dishes.length) * 100) + "%";
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 统计");
lines.push("");
lines.push("- 总数 " + dishes.length + "；素 " + count("素") + " 道（" + pct(count("素")) + "）／荤 " + count("荤") + " 道");
lines.push("- 面 " + count("面") + " 道；海鲜 " + count("海鲜") + " 道；辣 " + count("辣") + " 道；清淡 " + count("清淡") + " 道；重口 " + count("重口") + " 道");
lines.push("- 汤池 " + soups + " 道；自带主食 " + staples + " 道；可当配菜 " + sides + " 道");
lines.push("- 8 种 chip 组合最少一组 " + worst.count + " 道（" + worst.label + "），不会出现无解");
lines.push("");

const out = lines.join("\n");

if (check) {
  let cur = "";
  try {
    cur = readFileSync(MD, "utf8").replace(/\r\n/g, "\n");
  } catch {
    console.error("✗ dishes.md 不存在");
    process.exit(1);
  }
  if (cur !== out) {
    console.error("✗ dishes.md 与 index.html 不一致，请运行 node tools/md-dishes.mjs");
    process.exit(1);
  }
  console.log("✓ dishes.md 与菜库一致（" + dishes.length + " 道）");
} else {
  writeFileSync(MD, out, "utf8");
  console.log("✓ 已生成 dishes.md（" + dishes.length + " 道）");
}
