/* 今天吃什么 · 把「一句话」变成候选池的代理（Cloudflare Pages Functions）
 *
 * 文件路径即路由：functions/api/pick.js → /api/pick，不需要任何 redirect 配置。
 * 页面和函数同源，所以前端不用处理跨域。
 *
 * 为什么需要它：key 放在浏览器里就等于公开，任何人都能从 index.html 里读走。
 * 所以浏览器只发一句话，key 只以环境变量形式存在于 Cloudflare 的 Worker 上。
 *
 * 三条必须守住的规则（少一条就等于把 key 转送出去）：
 *   1. 只接受一个 q，不接受 messages —— 否则别人能拿它当免费通用 API
 *   2. system prompt 固定在服务端，前端改不了
 *   3. 返回的菜名必须真的在菜库里，3–12 道，否则整条作废
 *
 * 环境变量：AI_KEY / AI_BASE / AI_MODEL（在 Pages → Settings → Variables and secrets 设）
 *           AI_MODELS 可选，逗号分隔的候选链；不设时智谱 base 会自动接两个免费型号兜底
 * 菜库：由 tools/sync-ai.mjs 从 index.html 同步，不要手改下面 DISHES 段
 *
 * 缓存：Netlify 的 netlify-cdn-cache-control 在这里无效，改用 Cache API。
 *       同一句话一天内只打一次上游，免费额度才够用。
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
醋溜白菜|素,清淡
凉拌木耳|素,清淡
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
蚂蚁上树|荤,重口
酸汤肥牛|荤,辣
铁板豆腐|素,重口
干锅土豆片|素,辣
鱼香茄子|素,重口
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
醋溜豆芽|素,清淡
芹菜炒香干|素,清淡
香煎豆腐|素,辣
青椒炒蛋|素,辣
红烧冬瓜|素,重口
凉拌豆腐丝|素,清淡
凉拌腐竹|素,辣
凉拌莴笋丝|素,清淡
凉拌苦菊|素,清淡
凉拌藕片|素,辣
蒜泥茄子|素,重口
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
蒜苗炒腊肉|荤,重口
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
白灼秋葵|素,清淡
清炒荷兰豆|素,清淡
蒜蓉丝瓜|素,清淡
清炒山药|素,清淡
蚝油杏鲍菇|素,清淡
清炒莴笋|素,清淡
清炒豆苗|素,清淡
上汤菠菜|素,清淡
蒜蓉秋葵|素,清淡
清炒芥蓝|素,清淡
素炒三菇|素,清淡
清炒冬瓜|素,清淡
蒜蓉蒸丝瓜|素,清淡
清炒南瓜丝|素,清淡
蒸芋头|素,清淡
蒜蓉金针菇|素,清淡
葱油芋艿|素,清淡
清炒苦瓜|素,清淡
蒜蓉空心菜|素,清淡
腐乳空心菜|素,清淡
清炒苋菜|素,清淡
上汤豆苗|素,清淡
清炒豌豆尖|素,清淡
清蒸娃娃菜|素,清淡
白灼芦笋|素,清淡
清炒木耳菜|素,清淡
清炒萝卜丝|素,清淡
蒸秋葵|素,清淡
香菇蒸豆腐|素,清淡
清炒鸡毛菜|素,清淡
地三鲜|素,重口
干锅娃娃菜|素,重口
干锅茶树菇|素,重口
酱爆茄子|素,重口
红烧土豆|素,重口
红烧萝卜|素,重口
油焖春笋|素,重口
油焖茭白|素,重口
糖醋藕丁|素,重口
炸茄盒|素,重口
干锅藕片|素,重口
酱烧豆腐|素,重口
咸蛋黄焗南瓜|素,重口
孜然土豆|素,重口
椒盐蘑菇|素,重口
咖喱土豆|素,重口
葱烧豆腐|素,重口
铁板茄子|素,重口
四喜烤麸|素,重口
雪菜炒毛豆|素,重口
干煸藕丝|素,重口
素鸡红烧|素,重口
腐竹烧木耳|素,重口
豆角烧茄子|素,重口
干锅千叶豆腐|素,重口
酸辣藕丁|素,辣
剁椒蒸豆腐|素,辣
香辣豆干|素,辣
辣炒年糕|素,辣
尖椒豆皮|素,辣
辣炒藕带|素,辣
剁椒蒸茄子|素,辣
香辣土豆丁|素,辣
小炒香干|素,辣
辣炒魔芋|素,辣
泡椒木耳|素,辣
辣炒豆芽|素,辣
辣炒海带丝|素,辣
小米辣炒蛋|素,辣
香辣腐竹|素,辣
凉拌金针菇|素,辣
凉拌粉丝|素,辣
凉拌豆芽|素,清淡
凉拌秋葵|素,清淡
凉拌西芹|素,清淡
凉拌洋葱|素,清淡
凉拌花生|素,重口
凉拌粉皮|素,清淡
凉拌蕨根粉|素,辣
凉拌魔芋丝|素,辣
凉拌萝卜皮|素,辣
凉拌豆干|素,重口
凉拌腐皮|素,清淡
凉拌紫甘蓝|素,清淡
凉拌菠菜粉丝|素,清淡
凉拌裙带菜|素,清淡
凉拌香干|素,辣
凉拌豇豆|素,清淡
凉拌空心菜|素,清淡
凉拌白菜心|素,清淡
糖拌西红柿|素,清淡
凉拌苦瓜|素,清淡
凉拌芹菜花生|素,清淡
凉拌油麦菜|素,清淡
芥末木耳|素,辣
老醋花生|素,重口
凉拌折耳根|素,辣
凉拌藕带|素,辣
凉拌豆皮|素,辣
凉拌贡菜|素,辣
南瓜粥|素,清淡,饭
红枣小米粥|素,清淡,饭
蔬菜粥|素,清淡,饭
山药粥|素,清淡,饭
绿豆粥|素,清淡,饭
银耳羹|素,清淡,汤
八宝粥|素,清淡,饭
素菜包子|素,清淡,饭
香菇青菜包|素,清淡,饭
豆沙包|素,清淡,饭
花卷|素,清淡,饭
馒头|素,清淡,饭
素馅饼|素,清淡,饭
手抓饼|素,重口,饭
鸡蛋灌饼|素,重口,饭
素炒面|素,面,重口,饭
素炒河粉|素,面,重口,饭
香菇面|素,面,清淡,饭
雪菜面|素,面,清淡,饭
酸汤面|素,面,辣,饭
麻辣拌面|素,面,辣,饭
藤椒面|素,面,辣,饭
素臊子面|素,面,重口,饭
素三鲜面|素,面,清淡,饭
蒸红薯|素,清淡,饭
蒸玉米|素,清淡,饭
藕粉|素,清淡,饭
红烧猪蹄|荤,重口
咕咾肉|荤,重口
焦溜丸子|荤,重口
四喜丸子|荤,重口
红烧狮子头|荤,重口
猪肉炖粉条|荤,重口
酸菜炖排骨|荤,重口,汤
排骨炖豆角|荤,重口
干豆角烧肉|荤,重口
蒜苔炒肉|荤,清淡
芦笋炒肉|荤,清淡
荷兰豆炒肉|荤,清淡
茭白炒肉|荤,清淡
菜花炒肉|荤,清淡
黄瓜炒肉|荤,清淡
木耳炒肉|荤,清淡
冬笋炒肉|荤,清淡
莴笋炒肉|荤,清淡
西芹炒肉|荤,清淡
苦瓜炒肉|荤,清淡
山药炒肉|荤,清淡
毛豆炒肉|荤,清淡
豆干炒肉|荤,清淡
榨菜炒肉丝|荤,清淡
雪菜炒肉丝|荤,清淡
尖椒炒肉|荤,辣
泡椒肉丝|荤,辣
豆角炒肉|荤,重口
干锅猪蹄|荤,辣
香辣猪蹄|荤,辣
辣炒猪肝|荤,辣
爆炒腰花|荤,辣
溜肝尖|荤,重口
红烧大肠|荤,重口
九转大肠|荤,重口
脆皮五花肉|荤,重口
蒜泥白肉|荤,辣
咸烧白|荤,重口
把子肉|荤,重口
白油肚条|荤,清淡
猪肝汤|荤,清淡,汤
肉丸汤|荤,清淡,汤
酸菜丸子汤|荤,清淡,汤
猪血汤|荤,清淡,汤
红烧排骨|荤,重口
土豆排骨|荤,重口
芋头烧肉|荤,重口
大排面|荤,面,清淡,饭
猪蹄面|荤,面,重口,饭
肉末蒸蛋|荤,清淡
红烧牛肉|荤,重口
咖喱牛肉|荤,重口
黑椒牛柳|荤,重口
铁板牛柳|荤,重口
蚝油牛肉|荤,清淡
番茄牛肉汤|荤,清淡,汤
清炖牛腩|荤,清淡,汤
牛肉丸汤|荤,清淡,汤
手抓羊肉|荤,重口
葱爆羊肉|荤,重口
红焖羊肉|荤,重口
羊肉汤|荤,清淡,汤
羊杂汤|荤,重口,汤
涮羊肉|荤,清淡
牛肉炖萝卜|荤,清淡
孜然牛肉|荤,辣
杭椒牛柳|荤,辣
麻辣牛肉|荤,辣
小炒羊肉|荤,辣
牛腩面|荤,面,重口,饭
红烧牛肉面|荤,面,重口,饭
番茄牛腩面|荤,面,清淡,饭
酸菜牛肉面|荤,面,辣,饭
羊肉烩面|荤,面,清淡,饭
牛肉饭|荤,重口,饭
咖喱牛肉饭|荤,重口,饭
羊肉串|荤,辣
烤羊排|荤,重口
夫妻肺片|荤,辣
灯影牛肉|荤,辣
红烧鸡翅|荤,重口
豉油鸡|荤,清淡
盐焗鸡|荤,重口
口水鸡|荤,辣
大盘鸡|荤,辣
香菇焖鸡|荤,清淡
蒜香鸡翅|荤,重口
烤鸡腿|荤,重口
鸡米花|荤,重口
炸鸡排|荤,重口
咖喱鸡|荤,重口
左宗棠鸡|荤,辣
藤椒鸡|荤,辣
麻辣鸡块|荤,辣
小鸡炖蘑菇|荤,清淡,汤
乌鸡汤|荤,清淡,汤
冬瓜鸡汤|荤,清淡,汤
鸡丝凉面|荤,面,清淡,饭
鸡腿面|荤,面,清淡,饭
鸡杂面|荤,面,辣,饭
三鲜面|荤,面,清淡,饭
鸡排饭|荤,重口,饭
照烧鸡饭|荤,重口,饭
烤鸭|荤,重口
酱鸭|荤,重口
鸭血粉丝汤|荤,清淡,汤
酸萝卜老鸭汤|荤,清淡,汤
盐水鸭|荤,清淡
干锅鸡|荤,辣
鸡公煲|荤,重口
鸭脖|荤,辣
鲫鱼豆腐汤|荤,海鲜,清淡,汤
鱼头豆腐汤|荤,海鲜,清淡,汤
清蒸鲳鱼|荤,海鲜,清淡
清蒸大闸蟹|荤,海鲜,清淡
白灼鱿鱼|荤,海鲜,清淡
蒜蓉开背虾|荤,海鲜,清淡
虾仁豆腐|荤,海鲜,清淡
红烧带鱼|荤,海鲜,重口
糖醋鱼|荤,海鲜,重口
油焖大虾|荤,海鲜,重口
椒盐虾|荤,海鲜,重口
香辣蟹|荤,海鲜,辣
辣炒花蛤|荤,海鲜,辣
烤鱼|荤,海鲜,辣
海鲜面|荤,面,清淡,饭
海鲜炒面|荤,面,重口,饭
虾仁面|荤,面,清淡,饭
花甲粉|荤,面,重口,饭
鱼丸粉|荤,面,清淡,饭
黄鱼面|荤,面,清淡,饭
打卤面|荤,面,重口,饭
炒河粉|荤,面,重口,饭
牛杂面|荤,面,重口,饭
尖椒肉丝面|荤,面,辣,饭
酸菜肉丝面|荤,面,清淡,饭
桂林米粉|荤,面,清淡,饭
炒米粉|荤,面,重口,饭
鸡蛋炒面|素,面,重口,饭
茄丁面|素,面,重口,饭
三丝凉面|素,面,清淡,饭
牛肉炒面|荤,面,重口,饭
砂锅米线|荤,面,重口,饭
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

/* 同源请求本来不带 Origin；带了的就必须是自己人。
   放行正式域名、www、以及 Pages 的预览域名（<hash>.项目名.pages.dev）。 */
const OK_HOSTS = [
  /^([a-z0-9-]+\.)*whatfood\.top$/,
  /^([a-z0-9-]+\.)*what-to-eat-today-b0r\.pages\.dev$/
];

function originAllowed(origin) {
  try {
    const host = new URL(origin).hostname;
    return OK_HOSTS.some(function (re) { return re.test(host); });
  } catch (e) {
    return false;
  }
}

const TIMEOUT = 16000;
const CACHE_TTL = 86400;

/* 下面两个是可选的请求参数，不是每家供应商都认。被 400 明确拒绝过一次就记住，
   同一个 isolate 里后续请求不再带，最多只浪费一次往返。 */
let NO_THINKING = false;
let NO_JSON_MODE = false;

function json(body, status, cache) {
  const useCache = cache !== false;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-methods": "GET, OPTIONS"
  };
  /* 成功才缓存：失败要是也被缓存，同一句话一天之内都救不回来。
     max-age 给浏览器，s-maxage 给 Cloudflare 边缘（Cache API 也按它算 TTL）。 */
  headers["cache-control"] = useCache
    ? "public, max-age=3600, s-maxage=" + CACHE_TTL
    : "no-store";
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

/* Pages Functions 的入口：所有方法都进这里。
   GET 走「先查边缘缓存，没有再算」，OPTIONS 给预检。 */
export async function onRequest(context) {
  const req = context.request;
  const env = context.env || {};

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type"
      }
    });
  }
  if (req.method !== "GET") return json({ ok: false }, 405, false);

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q || q.length > 60) return json({ ok: false, why: "q" }, 200, false);

  /* 同一句话 24h 内只打一次上游。key 只由 q 决定，不含任何用户信息。 */
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request("https://pick-cache.internal/?q=" + encodeURIComponent(q));
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const res = await run(req, env);
  /* 只有成功响应带 s-maxage，失败一律 no-store，不进缓存 */
  if (cache && (res.headers.get("cache-control") || "").indexOf("s-maxage") > -1) {
    context.waitUntil(cache.put(cacheKey, res.clone()));
  }
  return res;
}

async function run(req, env) {
  if (req.method !== "GET") return json({ ok: false }, 405, false);

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q || q.length > 60) return json({ ok: false, why: "q" }, 200, false);

  /* 同源请求不带 Origin；带了的就必须是自己人 */
  const origin = req.headers.get("origin");
  if (origin && !originAllowed(origin)) return json({ ok: false, why: "origin" }, 403, false);

  const base = (env.AI_BASE || "").replace(/\/+$/, "");
  const key = env.AI_KEY || "";
  const primary = env.AI_MODEL || "";
  /* why 只说明缺了哪一项，绝不回显值——key 永远是黑的 */
  if (!base || !key || !primary) {
    const miss = [!base && "AI_BASE", !key && "AI_KEY", !primary && "AI_MODEL"].filter(Boolean);
    return json({ ok: false, why: "config", miss: miss }, 200, false);
  }

  /* 免费模型的高峰经常整条排队（1305），所以准备一个候选链：
     AI_MODELS 用逗号分隔可完全自定义；智谱 base 下只配了一个模型时，
     自动接上另外两个免费文本模型兜底。顺序是「小而快」优先——
     这类任务（从几百道菜里挑 8 道）用不着旗舰模型。 */
  let models = (env.AI_MODELS || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  if (!models.length) {
    models = [primary];
    if (/bigmodel\.cn/i.test(base)) {
      ["glm-4-flash-250414", "glm-4.5-flash"].forEach(function (m) {
        if (models.indexOf(m) < 0) models.push(m);
      });
    }
  }

  /* 总共 9.2s 预算，单次最多 4.2s：宁可换一个模型，也不在一个慢模型上等死。
     1305（排队）/ 1211（模型不存在）/ 5xx / 网络错误 / 超时 都换下一个。 */
  const started = Date.now();
  const budget = TIMEOUT;
  const ATTEMPT = 9000;
  const ms = function () { return Date.now() - started; };

  async function once(name) {
    const left = started + budget - Date.now();
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, Math.max(800, Math.min(ATTEMPT, left)));
    const body = {
      model: name,
      temperature: 0.2,
      /* 只要 12 个菜名 + 一句概括，192 够用；少解码就少等 */
      max_tokens: 192,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: q }
      ]
    };
    /* 关思考：Qwen3 系列默认可开思考，思考的 token 一样要逐个解码，
       而这个任务只是从菜库里挑名字。不认这个字段的供应商会在下面被 400 兜住。 */
    if (!NO_THINKING) body.enable_thinking = false;
    /* 强制 JSON：省掉「答得对但裹了客套话」这一类解析失败 */
    if (!NO_JSON_MODE) body.response_format = { type: "json_object" };
    try {
      return await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + key
        },
        body: JSON.stringify(body),
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
          /* 可选参数被拒（有的型号不认 enable_thinking / response_format）：
             记住并去掉它重来一次。400 里只有这一种值得重试，其余重试无意义。 */
          if (r.status === 400) {
            let dropped = false;
            if (!NO_THINKING && /enable_thinking/i.test(detail)) { NO_THINKING = true; dropped = true; }
            if (!NO_JSON_MODE && /response_format|json_object|json mode/i.test(detail)) { NO_JSON_MODE = true; dropped = true; }
            if (dropped) continue;
          }
          /* 1302 是账户限流，换模型也没用，越试越糟 */
          if (r.status === 429 && detail.indexOf("1302") > -1) break outer;
          /* 模型不存在 / 不支持：智谱是 1211/1214，DashScope 是「Model not exist」，
             OpenAI 是 model_not_found。三种都要换下一个模型试，其余 4xx（key 错、
             参数错）换也没用。 */
          const modelMissing = /"code"\s*:\s*"12(11|14)"|model[^"]{0,40}not[^"]{0,20}(exist|found)|model_not_found/i.test(detail);
          if (r.status < 500 && r.status !== 429 && !modelMissing) break outer;
          /* 排队 / 5xx / 模型不存在 → 下一个模型 */
          break;
        }
        /* 超时：这个模型太慢，剩下的预算够就换下一个，不够就收手 */
        if (err && err.name === "AbortError") {
          if (Date.now() + ATTEMPT + 200 > started + budget) break outer;
          break;
        }
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
