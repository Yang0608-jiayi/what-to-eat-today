#!/usr/bin/env node
/**
 * 菜库校验：零依赖，直接读 index.html 里的 DISHES 数组。
 * 用法：node tools/validate.mjs
 * 任何一条不通过都会返回非 0 退出码，适合在推送前跑一次。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML = path.join(ROOT, "index.html");

const ALLOWED = ["辣", "清淡", "重口", "面", "荤", "素", "海鲜"];
const FLAVORS = ["辣", "清淡", "重口"];
const KINDS = ["荤", "素"];
const EXPECTED_TOTAL = 450;
/* 扩库时只改 EXPECTED_TOTAL，下面全是比例 */
const FLOORS = [["素", 0.40], ["面", 0.15], ["海鲜", 0.06], ["清淡", 0.39]];
const SPICY_MAX_RATIO = 0.24;
const SOUP_MIN = 24;
const STAPLE_MIN = 100;
const SIDE_MIN = 300;
const GENTLE_SOUP_MIN = 8;
const DESC_MIN = 8;
const DESC_MAX = 12;

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}

/* ── 解析 ───────────────────────────── */
let dishes;
try {
  const html = fs.readFileSync(HTML, "utf8");
  const start = html.indexOf("var DISHES = [");
  if (start < 0) throw new Error("找不到 DISHES 数组");
  const end = html.indexOf("\n  ];", start);
  if (end < 0) throw new Error("找不到 DISHES 数组结尾（期望形如 `  ];`）");
  const literal = html.slice(start + "var DISHES = ".length, end) + "]";
  dishes = new Function("return " + literal)();
} catch (e) {
  console.error("✗ 无法读取菜库：" + e.message);
  process.exit(1);
}

if (!Array.isArray(dishes) || !dishes.length) {
  console.error("✗ DISHES 不是非空数组");
  process.exit(1);
}

/* ── 单道菜 ─────────────────────────── */
const seenName = new Map();
const seenDesc = new Map();
const seenTagSet = new Map();

for (const [i, d] of dishes.entries()) {
  const at = "第 " + (i + 1) + " 道" + (d && d.name ? "「" + d.name + "」" : "");

  if (!d || typeof d !== "object") {
    fail(at + "：不是对象");
    continue;
  }
  if (typeof d.name !== "string" || !d.name.trim()) {
    fail(at + "：name 为空");
    continue;
  }
  if (typeof d.desc !== "string" || !d.desc.trim()) {
    fail(at + "：desc 为空");
    continue;
  }
  if (!Array.isArray(d.tags)) {
    fail(at + "：tags 不是数组");
    continue;
  }

  if (seenName.has(d.name)) fail(at + "：菜名重复（另见第 " + (seenName.get(d.name) + 1) + " 道）");
  else seenName.set(d.name, i);

  if (seenDesc.has(d.desc)) fail(at + "：文案与第 " + (seenDesc.get(d.desc) + 1) + " 道完全相同");
  else seenDesc.set(d.desc, i);

  const nameLen = [...d.name].length;
  if (nameLen < 2) fail(at + "：菜名太短（" + nameLen + " 字）");
  if (nameLen > 7) warnings.push(at + "：菜名 " + nameLen + " 字，可能挤压签面排版");

  const descLen = [...d.desc.replace(/\s/g, "")].length;
  if (descLen < DESC_MIN || descLen > DESC_MAX) {
    fail(at + "：文案 " + descLen + " 字，要求 " + DESC_MIN + "–" + DESC_MAX + " 字 —— " + d.desc);
  }
  if (/[!！]/.test(d.desc)) fail(at + "：文案不能带感叹号");

  if (d.tags.length < 2 || d.tags.length > 3) {
    fail(at + "：标签 " + d.tags.length + " 个，要求 2–3 个");
  }

  const unknown = d.tags.filter((t) => ALLOWED.indexOf(t) < 0);
  if (unknown.length) fail(at + "：出现词表外的标签 " + unknown.join("、"));

  const kinds = d.tags.filter((t) => KINDS.indexOf(t) > -1);
  if (kinds.length !== 1) fail(at + "：荤/素 必须且只能有一个（当前 " + (kinds.join("、") || "无") + "）");

  const flavors = d.tags.filter((t) => FLAVORS.indexOf(t) > -1);
  if (flavors.length !== 1) fail(at + "：辣/清淡/重口 必须且只能有一个（当前 " + (flavors.join("、") || "无") + "）");

  if (new Set(d.tags).size !== d.tags.length) fail(at + "：标签重复");

  if (d.tags.length === 3 && !d.tags.includes("面") && !d.tags.includes("海鲜")) {
    fail(at + "：三个标签必须是「荤/素 + 面或海鲜 + 味道」，当前多了一个无效组合");
  }

  for (const flag of ["soup", "staple"]) {
    if (flag in d && d[flag] !== 1) fail(at + "：" + flag + " 只能写 1");
  }
  if (d.soup === 1 && d.staple === 1) fail(at + "：soup 与 staple 不能同时标（汤是配菜，主食是自带饭）");
  if (d.soup === 1 && d.tags.includes("面")) fail(at + "：面类不该进汤池");

  const sig = [...d.tags].sort().join("|");
  if (seenTagSet.has(sig)) seenTagSet.get(sig).push(d.name);
  else seenTagSet.set(sig, [d.name]);
}

/* ── 近似重名（只提醒，不阻断）─────────── */
const allNames = [...seenName.keys()];
for (let i = 0; i < allNames.length; i++) {
  for (let j = i + 1; j < allNames.length; j++) {
    const a = allNames[i];
    const b = allNames[j];
    if (a.length !== b.length || a.length < 3) continue;
    let diff = 0;
    for (let k = 0; k < a.length && diff < 2; k++) if (a[k] !== b[k]) diff++;
    if (diff === 1) warnings.push("近名：「" + a + "」和「" + b + "」只差一个字");
  }
}

/* ── 8 种 chip 组合 ─────────────────── */
function match(d, noSpicy, gentle, noodle) {
  const t = d.tags;
  if (noSpicy && t.indexOf("辣") > -1) return false;
  if (gentle && t.indexOf("清淡") < 0) return false;
  if (noodle && t.indexOf("面") < 0) return false;
  return true;
}

function candidates(noSpicy, gentle, noodle) {
  let g = gentle;
  let n = noodle;
  let msg = "";
  let pool = dishes.filter((d) => match(d, noSpicy, g, n));
  if (!pool.length && n) {
    n = false;
    pool = dishes.filter((d) => match(d, noSpicy, g, n));
    msg = "想吃面";
  }
  if (!pool.length && g) {
    g = false;
    pool = dishes.filter((d) => match(d, noSpicy, g, n));
    msg = "清淡点";
  }
  return { pool, msg };
}

const combos = [];
for (const noSpicy of [false, true]) {
  for (const gentle of [false, true]) {
    for (const noodle of [false, true]) {
      const r = candidates(noSpicy, gentle, noodle);
      const label = [
        "不吃辣=" + (noSpicy ? "开" : "关"),
        "清淡点=" + (gentle ? "开" : "关"),
        "想吃面=" + (noodle ? "开" : "关"),
      ].join("  ");
      combos.push({ label, count: r.pool.length, relaxed: r.msg });
      if (!r.pool.length) fail("chip 组合无解：" + label);
      if (r.msg) warnings.push("chip 组合触发让步（" + label + " → 放开「" + r.msg + "」）");
    }
  }
}

/* ── 分布 ───────────────────────────── */
function count(tag) {
  return dishes.filter((d) => d.tags.includes(tag)).length;
}
const dist = {
  素: count("素"),
  荤: count("荤"),
  面: count("面"),
  海鲜: count("海鲜"),
  辣: count("辣"),
  清淡: count("清淡"),
  重口: count("重口"),
};

if (dishes.length !== EXPECTED_TOTAL) {
  fail("总数 " + dishes.length + " 道，预期 " + EXPECTED_TOTAL + " 道");
}

for (const [tag, ratio] of FLOORS) {
  const min = Math.ceil(EXPECTED_TOTAL * ratio);
  if (dist[tag] < min) {
    fail(tag + " 只有 " + dist[tag] + " 道，低于下限 " + min + "（" + Math.round(ratio * 100) + "%）");
  }
}
const spicyMax = Math.floor(EXPECTED_TOTAL * SPICY_MAX_RATIO);
if (dist.辣 > spicyMax) fail("辣 " + dist.辣 + " 道，超过上限 " + spicyMax + "（" + Math.round(SPICY_MAX_RATIO * 100) + "%）");

/* ── 一餐：汤池 / 自带主食 / 配菜 ───────── */
const soups = dishes.filter((d) => d.soup === 1);
const staples = dishes.filter((d) => d.staple === 1);
const sides = dishes.filter((d) => d.soup !== 1 && d.staple !== 1);

if (soups.length < SOUP_MIN) fail("汤池只有 " + soups.length + " 道，低于下限 " + SOUP_MIN);
if (staples.length < STAPLE_MIN) fail("自带主食只有 " + staples.length + " 道，低于下限 " + STAPLE_MIN);
if (sides.length < SIDE_MIN) fail("可当配菜的只有 " + sides.length + " 道，低于下限 " + SIDE_MIN + "，加菜会很快无解");

/* 「不吃辣 + 清淡点」下汤池必须还有得选 */
const gentleSoups = soups.filter((d) => !d.tags.includes("辣") && d.tags.includes("清淡"));
if (gentleSoups.length < GENTLE_SOUP_MIN) fail("清淡汤池只有 " + gentleSoups.length + " 道，低于下限 " + GENTLE_SOUP_MIN);

/* ── 输出 ───────────────────────────── */
console.log("菜库总数：" + dishes.length + " 道\n");

console.log("分布：");
for (const k of ["素", "荤", "面", "海鲜", "辣", "清淡", "重口"]) {
  const pct = ((dist[k] / dishes.length) * 100).toFixed(0);
  console.log("  " + k.padEnd(3, "　") + " " + String(dist[k]).padStart(3) + " 道  " + String(pct).padStart(3) + "%");
}

console.log("\n8 种 chip 组合可用数：");
for (const c of combos) {
  console.log("  " + c.label + "  →  " + String(c.count).padStart(3) + " 道" + (c.relaxed ? "  ⚠ 让步：" + c.relaxed : ""));
}
console.log("  最少的一组：" + Math.min(...combos.map((c) => c.count)) + " 道");

console.log("\n一餐：");
console.log("  汤池 " + soups.length + " 道（清淡 " + gentleSoups.length + " 道）");
console.log("  自带主食 " + staples.length + " 道，可当配菜 " + sides.length + " 道");

if (warnings.length) {
  console.log("\n提醒（不阻断）：");
  for (const w of warnings) console.log("  · " + w);
}

if (errors.length) {
  console.error("\n✗ " + errors.length + " 项不通过：");
  for (const e of errors) console.error("  · " + e);
  process.exit(1);
}

console.log("\n✓ 全部通过");
