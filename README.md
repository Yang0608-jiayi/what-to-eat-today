# 今天吃什么

摇一签，出一道菜，然后去吃饭。

一个**单文件**的抽签式决策工具：打开 → 摇一签 → 出一道家常菜 → 接受或再摇 → 结束。
无账号、无后端、无第三方请求，断网可用。

---

## 文件

| 文件 | 说明 |
|---|---|
| `index.html` | **唯一需要部署的文件**。CSS / JS / 100 道菜库 / 音效合成全内联 |
| `dist/` | 已初始化的 Git 仓库，只含 `index.html` + 极简 README，直接推 Gitee 即可 |
| `PRD.md` | 产品规格：状态机、交互规则、验收标准 |
| `dishes.md` | 菜库清单（已定稿，内容已同步进 `index.html`，仅作审校留档） |

> `dist/index.html` 是根目录 `index.html` 的副本。**改完根目录的文件后，记得覆盖到 `dist/` 再推送**：
> `Copy-Item index.html dist\index.html -Force`

## 推到 Gitee

`dist/` 已经 `git init` 并完成了首次提交，只差一个远端：

```powershell
cd dist
git remote add origin https://gitee.com/<你的用户名>/<仓库名>.git
git branch -M master
git push -u origin master
```

然后在 Gitee 仓库页 → 服务 → **Gitee Pages** → 部署分支选 `master`、部署目录留空 → 启动。

以后更新：改根目录的 `index.html` → 覆盖到 `dist/` → `git commit -am "update"` → `git push`。
Gitee Pages **不会自动重新部署**，每次推送后需要回仓库页点一次「更新」。

## 本地预览

- 直接双击 `index.html` 即可（`file://` 下也能用，localStorage 正常）。
- 起个本地服务更接近线上：`python -m http.server 8731`，然后访问 `http://127.0.0.1:8731/index.html`。

---

## 部署到 EdgeOne Makers

EdgeOne Makers 就是 2026-06 更名后的 EdgeOne Pages，静态资源**不需要构建、不需要 `package.json`**。

**三步：**

1. 打开 [EdgeOne Makers 控制台](https://console.tencentcloud.com/edgeone/makers) → 新建项目 → 选择 **直接上传（Upload Directly）**。
2. 把 `dist/` 里的内容拖进去（`dist/` 根上就是 `index.html`）。也可以直接用它连 Git 仓库——`dist/` 已经是干净的仓库根。
   - 若上传的是文件夹，确保根目录下就是 `index.html`——不要多套一层 `dist/` 或 `今天吃什么/`。
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
| 按钮、收尾语、提示文案 | 搜索 `今天吃什么` / `摇一签` / `就它了` |
| 纸色、墨色、朱红 | `:root` 里的 `--paper` / `--ink` / `--seal` |
| 签的高宽比 | `--sign-h` 与 `.sign` 的 `aspect-ratio` |
| 摇签时长 | 搜索 `500 + Math.round(Math.random() * 300)` |
| 音效音量 | 搜索 `var MASTER =` |
| chip 的响声音高/音量 | 搜索 `function playTick` |
| 翻篇时间（默认凌晨 4 点） | 搜索 `4 * 3600 * 1000` |

### 改菜库的硬规则（否则过滤会失灵）

- 标签**只能**用这七个：`辣` `清淡` `重口` `面` `荤` `素` `海鲜`
- 每道菜 2–3 个标签，必须含且仅含 `荤` 或 `素` 之一，且 `辣`/`清淡`/`重口` 三选一
- `desc` 8–12 字，写感受不写做法，不带感叹号
- 蛋类、豆制品、菌菇、面食算 `素`

改完可以这样自查：把菜库贴进 `dishes.md` 的表格格式，或用 `PRD.md` §8.3 的规则逐条比。

---

## 已知边界（都是刻意的）

- 刷新页面回到待摇态，不恢复上一次结果 —— 否则"关掉再开"就是免费重摇。
- 撤消只能一次，且被撤销的菜当天仍不再出现。
- 「不吃辣」会被记住，另外两个 chip 刷新即重置。
- 不做深色模式、不做 PWA、不装统计。
