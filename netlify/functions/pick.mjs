/* 今天吃什么 · 把「一句话」变成候选池的代理
 *
 * 为什么需要它：key 放在浏览器里就等于公开，任何人都能从 index.html 里读走。
 * 所以浏览器只发一句话，key 只以环境变量形式存在于 Netlify 的服务器上。
 *
 * 三条必须守住的规则（少一条就等于把 key 转送出去）：
 *   1. 只接受一个 q，不接受 messages —— 否则别人能拿它当免费通用 API
 *   2. system prompt 固定在服务端，前端改不了
 *   3. 返回的菜名必须真的在菜库里，3–12 道，否则整条作废
 *
 * 环境变量：AI_KEY / AI_BASE / AI_MODEL（在 Netlify 后台设，不进仓库）
 *           AI_MODELS 可选，逗号分隔的候选链；不设时智谱 base 会自动接两个免费型号兜底
 * 菜库：由 tools/sync-ai.mjs 从 index.html 同步，不要手改下面 DISHES 段
 */

/* DISHES:BEGIN */
const DISHES = `
白切鸡|荤,清淡
香菇滑鸡|荤,清淡
冬瓜排骨汤|荤,清淡,汤
玉米排骨汤|荤,清淡,汤
蒜蓉蒸排骨|荤,清淡
番茄牛腩|荤,清淡
土豆炖牛肉|荤,清淡
山药炖鸡|荤,清淡
萝卜牛腩煲|荤,清淡
木须肉|荤,清淡
番茄炒蛋|素,清淡
清蒸蛋羹|素,清淡,汤
蒜蓉油麦菜|素,清淡
上汤娃娃菜|素,清淡
香菇青菜|素,清淡
凉拌黄瓜|素,清淡
清炒时蔬|素,清淡
番茄豆腐汤|素,清淡,汤
家常豆腐|素,清淡
紫菜蛋花汤|素,清淡,汤
麻婆豆腐|荤,辣
宫保鸡丁|荤,辣
回锅肉|荤,辣
水煮牛肉|荤,辣
辣子鸡|荤,辣
鱼香肉丝|荤,辣
小炒黄牛肉|荤,辣
干锅花菜|荤,辣
麻辣香锅|荤,辣
毛血旺|荤,辣
泡椒鸡杂|荤,辣
香辣鸡翅|荤,辣
农家小炒肉|荤,辣
孜然羊肉|荤,辣
干煸四季豆|素,辣
酸辣土豆丝|素,辣
醋溜白菜|素,辣
凉拌木耳|素,辣
擂辣椒皮蛋|素,辣
虎皮青椒|素,辣
手撕包菜|素,辣
清蒸鲈鱼|荤,海鲜,清淡
白灼虾|荤,海鲜,清淡
虾仁滑蛋|荤,海鲜,清淡
葱油花蛤|荤,海鲜,清淡
蒜蓉粉丝扇贝|荤,海鲜,重口
酸菜鱼|荤,海鲜,辣
剁椒鱼头|荤,海鲜,辣
香辣虾|荤,海鲜,辣
干烧带鱼|荤,海鲜,辣
水煮鱼|荤,海鲜,辣
小龙虾|荤,海鲜,辣
兰州牛肉面|荤,面,清淡,饭
牛肉粉丝汤|荤,面,清淡,饭
过桥米线|荤,面,清淡,饭
冷面|荤,面,清淡,饭
炸酱面|荤,面,重口,饭
刀削面|荤,面,重口,饭
牛肉拌面|荤,面,重口,饭
豆角焖面|荤,面,重口,饭
阳春面|素,面,清淡,饭
西红柿鸡蛋面|素,面,清淡,饭
麻酱凉面|素,面,清淡,饭
热干面|素,面,重口,饭
葱油拌面|素,面,重口,饭
重庆小面|素,面,辣,饭
油泼面|素,面,辣,饭
螺蛳粉|素,面,辣,饭
酸辣粉|素,面,辣,饭
担担面|荤,面,辣,饭
蛋炒饭|素,清淡,饭
咖喱鸡饭|荤,重口,饭
卤肉饭|荤,重口,饭
黄焖鸡米饭|荤,重口,饭
猪脚饭|荤,重口,饭
煲仔饭|荤,重口,饭
石锅拌饭|素,辣,饭
红烧肉|荤,重口
糖醋排骨|荤,重口
京酱肉丝|荤,重口
三杯鸡|荤,重口
可乐鸡翅|荤,重口
蒜香排骨|荤,重口
梅菜扣肉|荤,重口
糖醋里脊|荤,重口
蚂蚁上树|荤,辣
酸汤肥牛|荤,辣
铁板豆腐|素,辣
干锅土豆片|素,辣
鱼香茄子|素,辣
清炒藕片|素,清淡
红烧茄子|素,重口
蒜蓉西兰花|素,清淡
韭菜炒鸡蛋|素,清淡
西葫芦炒蛋|素,清淡
蒸南瓜|素,清淡
凉拌海带丝|素,辣
蚝油生菜|素,清淡
皮蛋豆腐|素,清淡
拌菠菜|素,清淡
韭菜鸡蛋饺子|素,清淡,饭
猪肉白菜饺子|荤,清淡,饭
荠菜馄饨|素,清淡,饭
小笼包|荤,清淡,饭
皮蛋瘦肉粥|荤,清淡,饭
小米粥|素,清淡,饭
白粥咸菜|素,清淡,饭
生煎包|荤,重口,饭
锅贴|荤,重口,饭
煎饼果子|素,重口,饭
豆浆油条|素,清淡,饭
葱油饼|素,重口,饭
烧麦|荤,重口,饭
鸡蛋肠粉|素,清淡,饭
番茄鸡蛋汤|素,清淡,汤
冬瓜丸子汤|荤,清淡,汤
萝卜排骨汤|荤,清淡,汤
莲藕排骨汤|荤,清淡,汤
老鸭汤|荤,清淡,汤
冬瓜薏米汤|素,清淡,汤
菌菇鸡汤|荤,清淡,汤
酸辣汤|素,辣,汤
胡辣汤|荤,辣,汤
海带豆腐汤|素,清淡,汤
白菜豆腐汤|素,清淡,汤
丝瓜蛋汤|素,清淡,汤
罗宋汤|荤,清淡,汤
云吞面|荤,面,清淡,饭
雪菜肉丝面|荤,面,清淡,饭
猪肝面|荤,面,清淡,饭
排骨面|荤,面,清淡,饭
肥肠面|荤,面,重口,饭
新疆炒米粉|荤,面,辣,饭
干炒牛河|荤,面,重口,饭
臊子面|荤,面,辣,饭
大盘鸡拌面|荤,面,重口,饭
凉皮|素,面,辣,饭
小锅米线|素,面,辣,饭
菌汤面|素,面,清淡,饭
干煸杏鲍菇|素,辣
香菇烧豆腐|素,清淡
蒜蓉茼蒿|素,清淡
清炒芦笋|素,清淡
白灼菜心|素,清淡
蘑菇炒蛋|素,清淡
番茄土豆片|素,清淡
醋溜豆芽|素,辣
芹菜炒香干|素,清淡
香煎豆腐|素,辣
青椒炒蛋|素,辣
红烧冬瓜|素,重口
凉拌豆腐丝|素,清淡
凉拌腐竹|素,辣
凉拌莴笋丝|素,清淡
凉拌苦菊|素,清淡
凉拌藕片|素,辣
蒜泥茄子|素,辣
凉拌三丝|素,清淡
盐水毛豆|素,清淡
清蒸多宝鱼|荤,海鲜,清淡
姜葱炒蟹|荤,海鲜,清淡
蒜蓉生蚝|荤,海鲜,重口
椒盐皮皮虾|荤,海鲜,重口
番茄龙利鱼|荤,海鲜,清淡
红烧鸡腿|荤,重口
啤酒鸭|荤,重口
豆豉蒸排骨|荤,清淡
洋葱炒牛肉|荤,清淡
蒜苗炒腊肉|荤,辣
青椒肉丝|荤,清淡
口蘑炒肉片|荤,清淡
盐煎肉|荤,辣
腐竹焖鸭|荤,重口
土豆烧鸡|荤,重口
粉蒸肉|荤,重口
东坡肉|荤,重口
酱大骨|荤,重口
铁锅炖大鹅|荤,重口
干锅肥肠|荤,辣
水煮肉片|荤,辣
`;
/* DISHES:END */

const NAMES = DISHES.split("\n")
  .map(function (s) { return s.split("|")[0]; })
  .filter(Boolean);
const NAME_SET = new Set(NAMES);

const SYSTEM =
  "你在帮一个「今天吃什么」的页面缩小选菜范围。\n" +
  "下面是全部 " + NAMES.length + " 道菜，每行是「菜名|标签」，标签取值范围：辣 清淡 重口 面 荤 素 海鲜 汤 饭。\n\n" +
  DISHES +
  "\n\n" +
  "用户会用一句话说自己的处境。请从中挑出 6 到 12 道最符合的。\n" +
  "规则：\n" +
  "- 菜名必须一字不差来自上面，不许编造、不许改写、不许加数量词。\n" +
  "- 「感冒」「胃不舒服」「没胃口」优先 清淡 和 汤。\n" +
  "- 「加班」「累了」「想热乎」优先 汤 和 清淡。\n" +
  "- 「省钱」「月底」优先 素、面、清淡。\n" +
  "- 「庆祝」「请客」优先 荤 和 重口。\n" +
  "- 「减脂」优先 清淡、素，避开 重口。\n" +
  "- 用户没说自己能吃辣时，不要整池都是辣的。\n" +
  "只输出 JSON，不要解释、不要代码围栏：" +
  '{"dishes":["菜名","菜名"],"label":"不超过8个字的概括"}';

/* 预览部署也要能用，所以放行 xxx--gilded-griffin-5da339.netlify.app */
const OK_ORIGIN = /^https:\/\/([a-z0-9-]+--)?gilded-griffin-5da339\.netlify\.app$/;
const TIMEOUT = 8500;

function json(body, status, cache) {
  const useCache = cache !== false;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET, OPTIONS"
  };
  /* 成功才让 CDN 缓存一天：失败要是也被缓存，同一句话一天之内都救不回来 */
  headers["cache-control"] = useCache ? "public, max-age=3600" : "no-store";
  if (useCache) headers["netlify-cdn-cache-control"] = "public, s-maxage=86400";
  return new Response(JSON.stringify(body), { status: status || 200, headers: headers });
}

/* 模型偶尔会套一层 ```json，或者在 JSON 前后说两句客套话 */
function parseLoose(raw) {
  let t = String(raw || "").trim();
  if (!t) return null;
  if (t.indexOf("```") > -1) t = t.replace(/```[a-zA-Z]*\s*/g, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1));
  } catch (e) {
    return null;
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return json({ ok: false }, 405, false);

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q || q.length > 60) return json({ ok: false, why: "q" }, 200, false);

  /* 同源请求不带 Origin；带了的就必须是自己人 */
  const origin = req.headers.get("origin");
  if (origin && !OK_ORIGIN.test(origin)) return json({ ok: false, why: "origin" }, 403, false);

  const base = (process.env.AI_BASE || "").replace(/\/+$/, "");
  const key = process.env.AI_KEY || "";
  const primary = process.env.AI_MODEL || "";
  /* why 只说明缺了哪一项，绝不回显值——key 永远是黑的 */
  if (!base || !key || !primary) {
    const miss = [!base && "AI_BASE", !key && "AI_KEY", !primary && "AI_MODEL"].filter(Boolean);
    return json({ ok: false, why: "config", miss: miss }, 200, false);
  }

  /* 免费模型的高峰经常整条排队（1305），所以准备一个候选链：
     AI_MODELS 用逗号分隔可完全自定义；智谱 base 下只配了一个模型时，
     自动接上另外两个免费文本模型兜底。 */
  let models = (process.env.AI_MODELS || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  if (!models.length) {
    models = [primary];
    if (/bigmodel\.cn/i.test(base)) {
      ["glm-4.5-flash", "glm-4-flash-250414"].forEach(function (m) {
        if (models.indexOf(m) < 0) models.push(m);
      });
    }
  }

  /* 总共 8.5s 预算，单次最多 7s。超时说明这个模型此刻就是慢，不再等第二个；
     1305（排队）/ 1211（模型不存在）/ 5xx / 网络错误才换下一个模型。 */
  const started = Date.now();
  const budget = TIMEOUT;
  const ATTEMPT = 7000;
  const ms = function () { return Date.now() - started; };

  async function once(name) {
    const left = started + budget - Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, Math.max(800, Math.min(ATTEMPT, left)));
    try {
      return await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + key
        },
        body: JSON.stringify({
          model: name,
          temperature: 0.2,
          max_tokens: 400,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: q }
          ]
        }),
        signal: ctl.signal
      });
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    let r = null;
    let detail = "";
    let err = null;
    let used = "";

    outer:
    for (let mi = 0; mi < models.length; mi++) {
      used = models[mi];
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt) {
          if (Date.now() + 2600 > started + budget) break outer;
          await new Promise(function (res) { setTimeout(res, 300); });
        }
        try {
          r = await once(used);
          err = null;
        } catch (e) {
          r = null;
          err = e;
        }
        if (r && r.ok) break outer;

        if (r) {
          /* 上游的错误正文里没有 key，截一段带回来，模型名写错时一眼能看出来 */
          detail = (await r.text().catch(function () { return ""; })).slice(0, 240);
          /* 1302 是账户限流，换模型也没用，越试越糟 */
          if (r.status === 429 && detail.indexOf("1302") > -1) break outer;
          /* 1211 / 1214 = 模型不存在或不支持：换下一个；其他 4xx（钥匙错、参数错）换也没用 */
          const modelMissing = /"code"\s*:\s*"12(11|14)"/.test(detail);
          if (r.status < 500 && r.status !== 429 && !modelMissing) break outer;
          /* 排队 / 5xx / 模型不存在 → 下一个模型 */
          break;
        }
        /* 超时：模型太慢，剩下的预算也不够再等一个 */
        if (err && err.name === "AbortError") break outer;
        /* 网络错误是瞬时的，同一个模型再试一次 */
      }
      if (Date.now() + 1200 > started + budget) break;
    }

    if (!r) {
      const aborted = err && err.name === "AbortError";
      return json({ ok: false, why: aborted ? "timeout" : "error", ms: ms(), model: used, detail: String((err && err.message) || "") }, 200, false);
    }
    if (!r.ok) {
      const rate = detail.indexOf("1302") > -1;
      return json({
        ok: false,
        why: rate ? "rate" : (r.status === 429 ? "busy" : "upstream"),
        status: r.status,
        ms: ms(),
        model: used,
        tried: models,
        detail: detail
      }, 200, false);
    }

    const data = await r.json();
    const choice = data && data.choices && data.choices[0];
    const out = parseLoose(choice && choice.message ? choice.message.content : "");
    if (!out || !Array.isArray(out.dishes)) return json({ ok: false, why: "parse", ms: ms() }, 200, false);

    const seen = new Set();
    const dishes = out.dishes
      .map(function (n) { return String(n).trim(); })
      .filter(function (n) {
        if (!NAME_SET.has(n) || seen.has(n)) return false;
        seen.add(n);
        return true;
      });

    if (dishes.length < 3) {
      return json({ ok: false, why: "few", ms: ms(), got: dishes.length, raw: String(choice && choice.message ? choice.message.content : "").slice(0, 240) }, 200, false);
    }

    return json({
      ok: true,
      dishes: dishes.slice(0, 12),
      label: String(out.label || "").slice(0, 12),
      model: used,
      ms: ms()
    });
  } catch (e) {
    return json({ ok: false, why: e && e.name === "AbortError" ? "timeout" : "error", ms: ms(), detail: String((e && e.message) || "") }, 200, false);
  }
}
