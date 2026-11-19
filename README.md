# 今天吃什么

摇一签，出一道菜，然后去吃饭。不知道自己想吃什么、但知道自己**不想**吃什么，就走划掉；两个都想要、选不出来，就上二选一。

一个**单文件**的决策工具，内置三种玩法：**摇一签**（直接抽）、**划掉**（划掉不想吃的，再从剩下的里抽）、**二选一**（两张牌里点一个，另一张换新的）。
打开 → 拿到一道菜 → 接受 → 结束。无账号、断网可用；正式地址上还能用一句话（「感冒了」「加班到九点」）让 AI 先把池子缩小，签筒仍然由你摇。

---

## 文件

| 文件 | 说明 |
|---|---|
| `index.html` | **唯一需要部署的页面**，也是唯一需要修改的页面。CSS / JS / 180 道菜库 / 三种玩法 / 音效合成全内联 |
| `PRD.md` | 产品规格：状态机、交互规则、验收标准 |
| `dishes.md` | 菜库清单（180 道，由 `index.html` 同源数据生成，仅作审校留档） |
| `tools/validate.mjs` | 菜库校验脚本，零依赖，推送前跑一次 |
| `netlify/functions/pick.mjs` | AI 筛选的代理（约 150 行），key 只在这里以环境变量出现 |
| `netlify.toml` | 把函数挂到 `/api/pick`；Node 20 写在 `[build.environment] NODE_VERSION`（不能写在 `[functions]` 下） |
| `tools/sync-ai.mjs` | 把菜库从 `index.html` 同步进函数，防止两处漂移 |

> `dist/` 是早期遗留的旧副本，**已废弃**，不以它为准，任何修改都只发生在根目录的 `index.html`。

## 推到两个远端（Gitee + GitHub）

两个远端并存：`origin` 是 Gitee（`main` 跟踪它），`github` 是 GitHub。仓库根目录就是部署产物（`index.html` 在根上），两边内容应始终保持一致。

```powershell
git add index.html dishes.md PRD.md README.md tools/validate.mjs
git commit -m "v4.2: 一句话说明这一版改了什么"
git tag -a v4.2 -m "v4.2 一句话说明"

git push origin main      # Gitee
git push github main      # GitHub
git push origin v4.2      # 标签要单独推，两个远端各一次
git push github v4.2
```

- `git push github main` 里的 `main` **不能省**：本地只跟踪 `origin/main`，直接敲 `git push github` 会提示没有上游分支。
- **GitHub 每一次 push 都会自动触发 Netlify 重新部署**，所以正式地址（`*.netlify.app`）不需要任何手工操作；Gitee Pages 仍是手动点「更新」。
- 两边仓库内容始终一致：AI 的 key 不在仓库里，只在 Netlify 后台的环境变量。
- 推送时 PowerShell 会把 git 的 stderr 当异常，输出一片红字。那是进度信息，不是错误；成不成功看引用：

```powershell
git ls-remote --heads --tags github
```

`main` 的 hash 应与 `git log -1 --format=%h` 相同，标签应与 Gitee 齐全。

### Gitee Pages 需要手动更新

Gitee Pages **不会自动重新部署**，每次推送后要回仓库页 → 服务 → **Gitee Pages** → 点一次「更新」，否则线上还是旧版本。

### 连不上 GitHub 时

GitHub 的 HTTPS 在部分网络下会在 TLS 握手阶段被重置（`Recv failure: Connection was reset`），`git ls-remote` 直接失败。若本机有代理（如 Clash 默认 `127.0.0.1:7897`），只给 github.com 配代理，不要动全局：

```powershell
git config http.https://github.com.proxy http://127.0.0.1:7897
```

这是**仓库本地配置**（写在 `.git/config`），重新 clone 后要重设，代理换端口也要改。Gitee 保持直连，不受影响。

## 版本标签

每次推代码都给这一次打一个**附注标签**，格式 `vX.Y`（与 PRD 的版本号、提交信息里的 `vX` 对齐），方便以后按标签回看任意一版：

```powershell
git add index.html PRD.md README.md
git commit -m "v4.2: 一句话说明这一版改了什么"
git tag -a v4.2 -m "v4.2 一句话说明"
git push origin main
git push github main
git push origin v4.2      # 标签不会跟着分支自动走，两个远端各推一次
git push github v4.2
```

- 功能版本用 `vX.0`；只改文档 / 文案这类小改动用 `vX.Y`（如 `v3.1`）。
- 标签必须是**附注标签**（带 `-a`），这样 `git show v3.0` 能看到这一版改了什么。
- 打错了可以删掉重打：`git tag -d v3.1`，再 `git push origin :refs/tags/v3.1` 和 `git push github :refs/tags/v3.1`。

已发布的标签：

| 标签 | 内容 |
|---|---|
| `v1.0` | 基础版：摇一签、100 道菜 |
| `v2.0` | 180 道菜、长按换方向、触觉反馈、动效升级、接受后复制 |
| `v3.0` | 排除法玩法、底部悬浮导航切换 |
| `v3.1` | 文档：补充版本标签约定 |
| `v4.0` | 守擂玩法、三段玩法切换 |
| `v4.1` | 守擂硬上限：最多 5 道菜，最后一轮必须二选一 |
| `v4.2` | 文档：新增 GitHub 远端与双远端推送流程 |
| `v4.3` | 配色（Fields of Barley）、卡片圆角加大、底部导航上移 |
| `v4.4` | 玩法导航从底部移到页面顶部，音效按钮并入同一行 |
| `v4.5` | 导航改下划线文字 tab（去胶囊）、标题与音效合行、修正未选中 tab 对比度 |
| `v4.6` | 确认后可配一餐：主食推导、汤池、加菜（上限 3 道） |
| `v4.7` | 摇签音改「收音机故障」呲呲声；「排除法」→「划掉」、「守擂」→「二选一」 |
| `v4.8` | 摇签音改成签筒木签（击打 + 木身 + 泛音 + 筒壁延迟），去掉高频噪音 |
| `v4.9` | 接受态签放大改为只向下长（原点在顶边、1.05），不再压住导航线 |
| `v5.0` | AI 一句话筛菜：Netlify 函数代理（key 不下发）+ 候选池 + 四级降级 |

## 本地预览

- 直接双击 `index.html` 即可（`file://` 下也能用，localStorage 正常）。
- 起个本地服务更接近线上：`python -m http.server 8731`，然后访问 `http://127.0.0.1:8731/index.html`。
- **本地看不到 AI 入口**：它按域名判断，只在 `*.netlify.app` 上渲染（`index.html` 里的 `var AI =`）。要测 AI 就推到 Netlify。

---

## AI 筛选（只在 Netlify 版）

### 一次性配置

Netlify 后台 → Site configuration → Environment variables，建三个：

| Key | Value | Secret |
|---|---|---|
| `AI_KEY` | 供应商给的 key | ✅ 勾上（值填在 **Production** 一栏，其余留空） |
| `AI_BASE` | 例 `https://open.bigmodel.cn/api/paas/v4` | ⬜ |
| `AI_MODEL` | 例 `glm-4.5-flash`（以控制台里的免费型号为准） | ⬜ |

换供应商只改这两个变量，代码一行不动。改完等下一次 push 触发的部署生效。

### 验证

浏览器直接打开：

```
https://你的站点.netlify.app/api/pick?q=感冒了
```

- 正常：`{"ok":true,"dishes":[...],"label":"..."}`
- 一直 `{"ok":false}`：看 Netlify → Functions → `pick` → 日志，多半是 key / base / model 三者之一不对

### 改菜库之后

函数里有一份菜的清单（提示词要用），它由脚本从 `index.html` 生成，**不要手改**：

```powershell
node tools/sync-ai.mjs           # 写入
node tools/sync-ai.mjs --check   # 只检查，不一致就报错
```

忘了跑的话，AI 永远挑不到新加的菜（旧菜名仍在池子里）。

---

## 部署到 EdgeOne Makers

EdgeOne Makers 就是 2026-06 更名后的 EdgeOne Pages，静态资源**不需要构建、不需要 `package.json`**。

**三步：**

1. 打开 [EdgeOne Makers 控制台](https://console.tencentcloud.com/edgeone/makers) → 新建项目 → 选择 **直接上传（Upload Directly）**。
2. 把根目录的 `index.html` 拖进去。
   - 若上传的是文件夹，确保根目录下就是 `index.html`——不要多套一层 `今天吃什么/`，也不要用 `dist/`。
   - 也可以直接用当前 Git 仓库连 EdgeOne，构建命令留空即可。
3. 部署完成后会拿到一个 `*.edgeone.app` 之类的默认域名，直接访问即可。

**换自定义域名（可选，以后再做）**：项目 → 域名管理 → 添加自定义域名 → 按提示在 DNS 加一条 CNAME → 证书用平台的免费证书。

### 部署后注意事项

- **静态资源会被 CDN 缓存**。改完代码重新上传后，如果看到的还是旧版本，先强制刷新（Ctrl/Cmd+Shift+R）；仍然旧的话在控制台对该次部署做「刷新缓存 / 重新部署」。
- 页面里没有任何跨域请求，所以**不存在**"某个 CDN 挂了导致页面坏掉"的情况。
- 音效由 Web Audio 实时合成，**没有音频文件**，不用配置 MIME、也不用担心大文件。

---

## 怎么改

打开 `index.html`，按注释分块找：

| 想改什么 | 位置 |
|---|---|
| 加/删/换菜 | 搜索 `var DISHES = [`，数组里每项 `{name, desc, tags}` |
| 汤池 / 自带主食的菜 | 在菜上写 `soup:1` 或 `staple:1`（两者互斥；不写就是普通菜，默认配米饭） |
| 一餐最多几道菜 | 搜索 `var MEAL_MAX_DISHES =`（默认 3，主菜算第一道） |
| 按钮、收尾语、提示文案 | 搜索 `今天吃什么` / `摇一签` / `就它了` |
| 纸色、墨色、朱红 | `:root` 里的 `--paper` / `--ink` / `--seal` |
| 配色（珊瑚/蜜桃/奶黄/青/鼠尾草） | `:root` 里的 `--coral` ~ `--sage`，浅色铺面、`*-ink` 写字 |
| 卡片圆角 | `.card` 的 `border-radius`（14px），按钮在 `.btn` |
| 顶部导航的形态 | `.switch` 的 `border-bottom` 是那条发丝线；`.switch button` 的 `height`（44px）是点击区；`::after` 的 `height` / `bottom` 是选中下划线，`[aria-selected="true"]` 决定文字色 |
| 签的高宽比 | `--sign-h` 与 `.sign` 的 `aspect-ratio` |
| 接受态签的放大 | `[data-state="accepted"] .sign` 的 `scale(1.05)`；`.sign` 的 `transform-origin:50% 0` 决定它只向下长、不顶导航线 |
| 摇签时长 | 搜索 `500 + Math.round(Math.random() * 300)` |
| 音效音量 | 搜索 `var MASTER =` |
| 摇签的"签筒木签"音 | 搜索 `function playRattle`：`strike()` 里三段带通分别是击打（1100–1600Hz）、木身（180–240Hz）、泛音（380–450Hz）；`room.delayTime` 是筒壁的 30ms 反射 |
| 木签的节奏 | 同一段里的 `var gap = 0.095` 与 `gap *= 1.14`：改前者是起手快慢，改后者是"越摇越慢"的衰减 |
| 木签的轻重 | `MASTER * 0.5`（击打）/ `0.22`（木身）/ `0.08`（泛音），抽牌音另有 `intensity 0.6` |
| 划掉抽牌音的轻重 | 搜索 `playRattle(reduced ? 0.12 : 0.455, 0.6)`，第二个参数是强度 |
| chip 的响声音高/音量 | 搜索 `function playTick` |
| 长按判定时长（默认 450ms） | 搜索 `var PRESS_MS =` |
| 振动时长 | 搜索 `function vibrate`，落定 `vibrate(12)`、盖章 `vibrate(20)` |
| 复制文案格式 | 搜索 `今天吃：` |
| 摇签虚影签条 | `.ghost`（宽度、位置、动画都在这一块） |
| 划掉发几张牌 | 搜索 `var CARD_COUNT =`（默认 6） |
| 划掉的分层规则 | 搜索 `function dealCards`（`辣/清淡/重口 × 荤/素` 六组 + 海鲜保底） |
| 划掉的抽签节奏 | 搜索 `var step = reduced ? 0 : 55` |
| 二选一配对的反差级别 | 搜索 `var tiers = [`（味道相反 + 荤素相反优先，逐级放宽） |
| 二选一一局最多几道菜 | 搜索 `var PK_MAX_DISHES =`（默认 5，改大就等于放宽耐心上限） |
| 二选一换牌动画时长 | 搜索 `reduced ? 0 : 170` |
| 玩法切换按钮 | `.switch` 与 `<nav class="switch">` |
| 翻篇时间（默认凌晨 4 点） | 搜索 `4 * 3600 * 1000` |
| AI 入口在哪些域名出现 | 搜索 `var AI =` 那一行的正则；Gitee 上不匹配就整颗按钮都不渲染 |
| AI 的提示词与规则 | `netlify/functions/pick.mjs` 的 `SYSTEM`（菜库那段由脚本生成，别手改） |
| AI 一次挑几道 | `SYSTEM` 里的「6 到 12 道」，以及函数返回前的 `slice(0, 12)` |
| AI 的超时（默认 5 秒） | 函数里的 `var TIMEOUT` 与页面里的 `AI_TIMEOUT`，两边要一致 |
| AI 结果缓存多久 | 函数响应头的 `s-maxage=86400`（CDN）与页面里的 `AI_CACHE_TTL`（本地） |
| 纸片里的示例句 | 搜索 `sheet-egs`，改 `data-q` |

### 改菜库的硬规则（否则过滤会失灵）

- 标签**只能**用这七个：`辣` `清淡` `重口` `面` `荤` `素` `海鲜`
- 每道菜 2–3 个标签，必须含且仅含 `荤` 或 `素` 之一，且 `辣`/`清淡`/`重口` 三选一
- `desc` 8–12 字，写感受不写做法，不带感叹号
- 蛋类、豆制品、菌菇、面食算 `素`
- `soup:1` / `staple:1` 可选，只能写 `1`，且不能同时出现在同一道菜上；面类不能进汤池
- 汤是配菜、主食菜自带饭，两者都靠这两个标记推导，不写默认就是「配米饭的普通菜」

改完**必须**跑一次校验（零依赖，只需要 Node）：

```powershell
node tools/validate.mjs
```

它会检查：总数是否 180、菜名/文案是否重复、文案是否 8–12 字、标签是否在词表内、荤素是否互斥、味道是否唯一、三标签是否只有 `面`/`海鲜` 两种第三种、`soup`/`staple` 标记是否合法（互斥、面类不进汤池）、汤池与配菜池是否够用，以及 8 种 chip 组合是否都至少有一道菜。任何一项不过就返回非 0 退出码。

`dishes.md` 是从 `index.html` 的同源数据生成的留档，改完菜库后重新生成一次即可（或手动同步，不影响运行）。

---

## 已知边界（都是刻意的）

- 刷新页面回到待摇态，不恢复上一次结果 —— 否则"关掉再开"就是免费重摇。
- 撤消只能一次，且被撤销的菜当天仍不再出现。
- 「不吃辣」会被记住，另外两个 chip 刷新即重置。
- 长按产生的味道排除**不持久化**，刷新即清空；最多同时排两种味道，第三次排完自动重置。
- 长按换方向是增强手感，**不做成显式按钮**——它是"我懒得再解释我要什么"的偷懒路径，摆成按钮会让页面变成筛选器。
- 复制只在接受后出现，刻意不做"分享"。
- 划掉**只发一轮**：不记录历史、不做多轮淘汰、不做评分，发完就抽，抽完就吃。
- 划掉抽中的菜计入当日去重，6 张候选不计入——否则玩三轮就把池子刷空。
- 划掉的「换一组」不做动效、不限次数，因为它只是"这组都不想要"的出口，不是主要玩法。
- 二选一的新牌**刻意配对成相反方向**（辣 ↔ 清淡、荤 ↔ 素），不做纯随机——两道差不多的菜摆在一起，等于没做选择。
- 二选一**一局最多看 5 道菜**（`PK_MAX_DISHES`）。没有上限时，人会下意识一直换到底，把"快速决定"变成"一直决定"。
- 二选一的最后一轮是**决赛季**：不再换牌、收回主按钮，点两张牌里的任意一张就是最终决定。
- `都不想，换一个` 也消耗换牌额度——它是"这两道我都不想要"的出口，不是无限的刷新按钮。
- 二选一只把最终留下的那张写进当日去重，被换掉的牌不写；回执写「比了 N 道」而不是「打赢了某某」，因为台上那张换过之后后者是假的。
- **一餐组合只在确认之后出现**，不进决策流程：主食靠 `staple` 推导、汤靠一个链接开关、加菜靠点击追加。它不新增玩法，也不问人数。
- 汤和加菜**不写入当日去重**：配菜若也占池子，连配几次就会把 180 道提前吃空，触发「今日签已尽」。
- 一餐组合不持久化，刷新即清——和主菜的行为保持一致，避免"刷新就能重新配一桌"。
- **AI 只缩小池子，永远不选最终那道菜**：它要是能拍板，签筒就成了表演，"随机"这个承诺也就假了。
- AI 条件不持久化，刷新即清；它不写进 `localStorage` 的偏好里，因为它描述的是"此刻的处境"，不是"长期的忌口"。
- AI 只在 `*.netlify.app` 上出现（按域名判断）。Gitee Pages 那份仍然是零请求的静态页，两边共用同一份 `index.html`。
- AI 失败一律静默退回 180 道，不弹错误框——这个页面的语气里不该出现"请求失败"。
- 上次用的玩法会被记住（含二选一）；想换回来点一下顶部导航即可。
- 不做深色模式、不做 PWA、不装统计。
