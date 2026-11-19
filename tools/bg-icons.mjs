#!/usr/bin/env node
/* 生成背景食材暗纹，替换 index.html 里的 sprite / bg-icons 两块。
   素材在 icon_images/，16 个 SVG 全部用上；彩色会统一成墨色（currentColor + fill-opacity）。

   用法：
     node tools/bg-icons.mjs           写入
     node tools/bg-icons.mjs --check   只检查，不一致就退出 1
*/
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = join(root, "index.html");
const ICON_DIR = join(root, "icon_images");

/* 文件名 → symbol id（ASCII，避免 URL 片段里的中文转义问题） */
const ICONS = [
  ["ji-dan", "食品_鸡蛋.svg"],
  ["shu-cai", "食品_蔬菜.svg"],
  ["niu-nai", "食品_牛奶.svg"],
  ["xiang-chang", "食品_香肠.svg"],
  ["ci-ba", "食品_糍粑.svg"],
  ["san-ming-zhi", "食品_三明治.svg"],
  ["bu-ding", "食品_布丁.svg"],
  ["xing-ren", "食品_杏仁.svg"],
  ["yao-guo", "食品-腰果.svg"],
  ["zhi-bei-dan-gao", "食品_纸杯蛋糕.svg"],
  ["tang-guo", "食品_糖果.svg"],
  ["han-bao", "食品_汉堡.svg"],
  ["pi-sa", "食品_披萨.svg"],
  ["rou-pu", "食品-肉铺.svg"],
  ["peng-hua-shi-pin", "膨化食品.svg"],
  ["xiu-xian-shi-pin", "休闲食品.svg"]
];

/* 原色 → 透明度：浅色做底、深色做轮廓，同色系才不糊成一团 */
const TONE = {
  "#FFFFFF": 0.22,
  "#FFE9D1": 0.28,
  "#FFDEAA": 0.32,
  "#FFD192": 0.45,
  "#B6DFE1": 0.55,
  "#FFAA99": 0.68,
  "#C49F86": 0.82,
  "#E3985B": 0.9
};

/* 22 个实例：x/y 百分比、s 尺寸、o 不透明度、r 角度、dur 漂移周期、delay 相位
   中间内容走廊由 CSS 遮罩兜底，所以这里可以放心铺满四周 */
const SPOTS = [
  ["ji-dan", 6, 14, 76, 0.36, -14, 10, -3],
  ["shu-cai", 90, 9, 34, 0.32, 18, 13, -9],
  ["niu-nai", 3, 36, 46, 0.34, -9, 9, -16],
  ["xiang-chang", 93, 30, 72, 0.38, 12, 12, -6],
  ["ci-ba", 9, 68, 42, 0.34, 21, 14, -12],
  ["san-ming-zhi", 88, 62, 50, 0.35, -17, 9, -20],
  ["bu-ding", 4, 88, 30, 0.3, 8, 15, -4],
  ["xing-ren", 94, 84, 64, 0.38, -11, 11, -14],
  ["yao-guo", 16, 24, 28, 0.3, 15, 13, -8],
  ["zhi-bei-dan-gao", 84, 18, 40, 0.33, -20, 10, -11],
  ["tang-guo", 12, 52, 56, 0.36, 6, 12, -2],
  ["han-bao", 90, 46, 32, 0.32, -6, 14, -18],
  ["pi-sa", 7, 78, 44, 0.35, 22, 9, -5],
  ["rou-pu", 96, 72, 36, 0.33, -15, 12, -13],
  ["peng-hua-shi-pin", 18, 8, 38, 0.34, 11, 14, -7],
  ["xiu-xian-shi-pin", 82, 92, 34, 0.32, -8, 10, -15],
  ["shu-cai", 2, 60, 26, 0.3, 17, 16, -10],
  ["bu-ding", 97, 55, 28, 0.3, -12, 13, -1],
  ["ci-ba", 14, 92, 30, 0.31, -19, 11, -17],
  ["tang-guo", 86, 4, 26, 0.3, 9, 13, -6],
  ["xing-ren", 8, 30, 22, 0.3, -16, 16, -9],
  ["yao-guo", 92, 66, 22, 0.3, 13, 12, -3]
];

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

function toSymbol(id, file) {
  let raw;
  try {
    raw = readFileSync(join(ICON_DIR, file), "utf8");
  } catch (e) {
    die("读不到素材：" + file);
  }
  const paths = raw.match(/<path\b[^>]*>/g) || [];
  if (!paths.length) die("素材里没有 path：" + file);
  const body = paths.map(function (p) {
    const fill = ((p.match(/fill="([^"]+)"/) || [])[1] || "").toUpperCase();
    const tone = TONE[fill] != null ? TONE[fill] : 0.7;
    const d = (p.match(/\sd="([^"]+)"/) || [])[1];
    if (!d) return "";
    return '<path d="' + d + '" fill="currentColor" fill-opacity="' + tone + '"/>';
  }).join("");
  return '<symbol id="fi-' + id + '" viewBox="0 0 1024 1024">' + body + "</symbol>";
}

const sprite = '<svg class="sprite" aria-hidden="true" focusable="false">' +
  ICONS.map(function (x) { return toSymbol(x[0], x[1]); }).join("") + "</svg>";

const layer = '<div class="bg-icons" aria-hidden="true">' + SPOTS.map(function (s) {
  const style = "--x:" + s[1] + "%;--y:" + s[2] + "%;--s:" + s[3] + "px;--o:" +
    s[4] + ";--r:" + s[5] + "deg;--dur:" + s[6] + "s;--delay:" + s[7] + "s";
  return '<svg viewBox="0 0 1024 1024" style="' + style + '" aria-hidden="true"><use href="#fi-' +
    s[0] + '"/></svg>';
}).join("") + "</div>";

function replaceBlock(src, startMark, endMark, replacement) {
  const i = src.indexOf(startMark);
  if (i < 0) return null;
  const j = src.indexOf(endMark, i);
  if (j < 0) return null;
  return src.slice(0, i) + replacement + src.slice(j + endMark.length);
}

const html = readFileSync(PAGE, "utf8").replace(/\r\n/g, "\n");
let next = replaceBlock(html, '<svg class="sprite"', "</svg>", sprite);
if (!next) die("index.html 里找不到 sprite 块");
next = replaceBlock(next, '<div class="bg-icons"', "</div>", layer);
if (!next) die("index.html 里找不到 bg-icons 块");

if (process.argv.includes("--check")) {
  if (next !== html) die("背景暗纹与脚本不一致，跑一次 node tools/bg-icons.mjs");
  console.log("✓ 背景暗纹已同步（" + ICONS.length + " 个素材 × " + SPOTS.length + " 个实例）");
  process.exit(0);
}

writeFileSync(PAGE, next, "utf8");
console.log("✓ 已写入 " + ICONS.length + " 个素材 / " + SPOTS.length + " 个实例");
