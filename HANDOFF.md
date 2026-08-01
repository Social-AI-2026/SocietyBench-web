# SocietyBench 网页 — 接手须知

> 截至 2026-05-28，最新 commit `4725209`。
> Git remote：`git@github.com:Zhenran-Wang/societybench-web.git` (main 分支)
> 上游 GitHub Pages 部署：https://zhenran-wang.github.io/societybench-web/
> 配套论文：上一级目录 `/overleaf_69e60208/`（NeurIPS 2026 投稿，匿名版）

---

## 0. 项目角色

`societybench-web` 是 NeurIPS 论文 SocietyBench 的**项目主页**（GitHub Pages 静态站，brutalist 风格）。
- 论文：`overleaf_69e60208/`（英文投稿版）+ `overleaf_69e60208_cn/`（中文翻译版）
- 配套代码仓库：`Zhenran-Wang/societybench`（开源 release，与本仓库**不是同一个 repo**）
- 数据仓库：HuggingFace（计划中，未上）

主页**自身不跑实验、不调用模型 API**（除 Try-it Live mode 可选调一个 `/api/predict` 后端，目前没部署）。它只是展示 + 内嵌排行榜 + Try-it widget。

---

## 1. 文件骨架

```
site/
├── index.html                845 行  整页 + 密码门 + hero 视频(img) + sidebar + 所有 section
├── styles.css                ~2900 行  brutalist 配色 + 全部组件
├── app.js                    1340 行  路由 + 排行榜 + Try widget + Deep-dive + 切语言重渲染
├── i18n.js                   ~1100 行  EN/中 双语字典 369 对 + setLang / applyLang / sb:langchange
│
├── crowd-animation.js        ~700 行  底部行走人群（首次进 overview 入场，离开永不重生）
├── crowd-links.js            ~400 行  人群之间动态连线
├── network-animation.js      未引用（已废弃但保留文件）
│
├── leaderboard.json          英文排行榜数据（数字 + 名称）
├── leaderboard.zh.json       中文版（数字相同，仅 string 字段翻译）
├── experiments.json          Deep-dive 5 张表的数据
├── experiments.zh.json       中文版
├── interactive_demo.json     Try widget 缓存数据（4 事件×4 点×4 模型回复）
├── interactive_demo.zh.json  中文版
│
├── figures/
│   ├── crowd/                36 张人群人物 PNG（约 2.4M）
│   ├── fig_methodology_v2.png, fig_anon_workflow-1.png,
│   │   fig_qualitative-1.png, fig_dataset_pipeline-1.png 等
│   └── hero-poster.jpg       hero 视频 fallback 静态图
│
├── videos/
│   ├── hero.webp             ★ 当前 hero 背景（animated WebP, 128 帧, 2.8M）
│   └── hero.mp4              原素材（H.264, 4.3M）— 改 hero 重新转码用
│
├── paper.pdf                 论文最新版（10M）
└── HANDOFF.md                本文件
```

---

## 2. 架构要点

### 2.1 i18n 体系（自己实现的，非 i18next）

- HTML 元素打 `data-i18n="key.path"`（textContent）/ `data-i18n-html="key.path"`（innerHTML）/ `data-i18n-attr="placeholder:key,title:key2"`
- 字典在 `i18n.js`：`{ en: {...}, zh: {...} }`，全部 369 对 key，**en/zh 完全对称**，无缺失
- 切换按钮在 sidebar 顶部 `.lang-toggle`，存 `localStorage.sb_lang`
- 默认语言 **EN**（论文是英文投稿）
- 切语言触发 `sb:langchange` 自定义事件 → app.js 监听后**重新 fetch 中文版 JSON + 重新渲染所有动态部分**（保留用户在 widget 里的选择）

### 2.2 数据加载

`app.js` 里 `dataUrl(name)` 根据当前 lang 选 `leaderboard.json` 或 `leaderboard.zh.json`，同理 experiments / interactive_demo。**英文版 JSON 是 source of truth，中文版手动维护、数字必须一致**。

### 2.3 路由

```
#/<page>  其中 page ∈ overview / method / try / contribute / leaderboard / deepdive / qualitative / limitations / cite
```

`navigate()` 在 app.js 顶部，切换 `body[data-active-page]` 属性，CSS 用这个属性显示 / 隐藏各 section。也触发 `sb:page-change` 事件给人群动画做 start / stop。

### 2.4 密码门（重要——影响 autoplay）

`index.html` 末尾的 IIFE：用户输的密码 SHA-256 后与 `EXPECTED` 比对（明文密码哈希写死，目前是 sha256("socbench")，可改）。通过后存 `localStorage.sb_pwd_hash`。**重复访问时直接 unlock —— 这次 unlock 是 page-load context，不是 user gesture，所以 Chrome strict autoplay 不放行 video.play()**。这就是 hero 从 `<video>` 改成 animated WebP `<img>` 的原因。

---

## 3. 最近 10 个 commit 主线

```
4725209  Re-encode hero.webp + lift reduced-motion 隐藏规则       ← 最新
cce34e5  Hero min-height: 100vh / 100dvh，全屏 + 内容垂直居中
1bdac86  ★ hero <video> → <img src="hero.webp"> (animated WebP)
a458bd0  尝试: unlock() 里加 play() + JS/CSS poster fallback（未生效，下一个 commit 改为 WebP）
e3845ac  尝试: 强制 v.play() 与多事件兜底（仍被 Chrome 拦）
9a71230  CSS + video cache busting (?v=)
c6b6f1a  hero overlay 蒙层从过浓改为软 radial
1c7427c  最初的 hero <video> 实现

b21ffb6  「反事实」→「模拟」中文翻译（参照论文中文版风格，但与论文用语分叉）
0838205  contrib.c01 中文标题修正：counterfactual 修饰 world 不修饰 anonymization
```

完整 git log 在 `.git/` 里，commit message 都写得比较详细，**强烈建议接手前 `git log --oneline -30` 通读一遍**。

---

## 4. 当前已知问题 / 未完成

### 4.1 ★ Hero 动画在用户浏览器里"不动"
- 文件本身完好：PIL 验证 128 帧 / animated=True / loop=0 / 1280×720 / 2.8M
- 上一次 commit (`4725209`) 已经 cache-bust ?v=20260528e + 移除 reduced-motion display:none
- 仍未在用户浏览器复现成功，**未排查**：浏览器/CDN 缓存层、扩展拦截 animated webp、GPU 解码、service worker 干扰、或用户实际看的是 `.hero-video-bg` background-image (fallback poster) 而 `.hero-video` 元素 0 宽高
- F12 Console 诊断命令（请让用户跑）：
  ```js
  const img = document.querySelector('.hero-video');
  console.log({
    src: img.src,
    natural: img.naturalWidth + 'x' + img.naturalHeight,
    complete: img.complete,
    display: getComputedStyle(img).display,
    rect: img.getBoundingClientRect(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches
  });
  ```

### 4.2 浏览器实测尚未做完
- 切语言：所有 page 是否正确切换？跨页保持？localStorage 记忆？— 静态 check 通过、未浏览器实测
- Try widget Live mode：`/api/predict` 后端目前没部署，预计 fetch 失败后 fallback 到 cached mode；这条 graceful-degrade 路径未实测

### 4.3 翻译一致性
- 网页 zh 用了「模拟社会世界」，但论文中文版用「反事实社会世界」。用户 Zhenran 倾向网页保留「模拟」（更直观），论文保留「反事实」（学术准确）。详见 commit `b21ffb6`。
- 其它术语已对齐论文中文版风格（「Web 新闻」/「社媒」/「桶中点」/「真实弧」/「渲染为」）

### 4.4 占位链接（设计上的待办，与代码无关）
- Paper PDF / arXiv / Dataset / Video 按钮都还是 `#`
- Submission guide / Pipeline guide / Open PR / GitHub Discussions 链接也是 `#`
- 顶部 sidebar 4 处外链 + 顶部 header 4 处快速链接

### 4.5 5 个事件顺序在 leaderboard JSON / index.html 卡片 / release 数据目录之间不一致
- paper：Wuhan / US-Iran / TikTok / SMCI / Trump
- leaderboard.json events 数组同 paper
- index.html 5 张事件卡片按 PUB/TRADE/TECH/GEO/MKT 排（即 01-05 = library/trump/tiktok/us_iran/smci）
- release 数据目录按抓取顺序 library/trump/tiktok/us_iran/smci
- 如果要统一，建议以 paper 为准

---

## 5. 开发流程

### 5.1 本地启动

```bash
cd site/
python3 -m http.server 8766
# 访问 http://localhost:8766
```

绕开密码门（让 hero 测试更快）：在 `<head>` 顶部塞一行：
```html
<script>localStorage.setItem('sb_pwd_hash','e54fc6b51915e222ba6196747a19ebb8dfa651fd2b46a385a0ded647fbfefda0');document.documentElement.classList.remove('auth-locked');</script>
```

### 5.2 部署

`git push origin main` 后 GitHub Pages **约 1-2 分钟**完成 CDN 同步。GitHub Pages 不支持自定义 cache headers，所以涉及静态资源更新（CSS / JS / 视频）必须用 `?v=YYYYMMDDx` 后缀 cache-bust。

### 5.3 i18n 字典扩展

加新 key 时**en 和 zh 都必须加**，否则 `t()` 找不到会 fallback 到 key 名本身。

校验脚本（验证 en/zh 完全对称、引用的 key 都有定义）：

```bash
python3 << 'PY'
import re
referenced = set()
with open('index.html') as f: html = f.read()
for m in re.findall(r'data-i18n(?:-html)?="([^"]+)"', html): referenced.add(m.strip())
for m in re.findall(r'data-i18n-attr="([^"]+)"', html):
    for p in m.split(','):
        if ':' in p: referenced.add(p.split(':',1)[1].strip())
with open('app.js') as f: js = f.read()
for m in re.findall(r"\bt\(\s*['\"]([a-zA-Z0-9_.\-]+)['\"]", js): referenced.add(m)
with open('i18n.js') as f: dic = f.read()
en_blk = dic.split("en: {")[1].split("zh: {")[0]
zh_blk = dic.split("zh: {")[1]
en = set(re.findall(r"^\s*'([a-zA-Z0-9_.\-]+)':", en_blk, flags=re.M))
zh = set(re.findall(r"^\s*'([a-zA-Z0-9_.\-]+)':", zh_blk, flags=re.M))
print(f"referenced: {len(referenced)}, en: {len(en)}, zh: {len(zh)}")
print(f"missing in en: {referenced - en}")
print(f"missing in zh: {referenced - zh}")
print(f"en only: {en - zh}")
print(f"zh only: {zh - en}")
PY
```

### 5.4 中文版 JSON 同步

修改 `leaderboard.json` / `experiments.json` / `interactive_demo.json` 时，对应 `.zh.json` 也要同步更新（结构必须一样，仅 string 字段翻译）。

---

## 6. 用户偏好（来自之前对话）

- 默认全自动，不要在每一步弹确认框
- 翻译要参照论文中文版的措辞与术语
- 代码改动要 commit message 写清楚 why，不只是 what
- push 必带，commits 不堆积本地
- 不要随便加新文件 / 文档，除非用户明确要求

---

## 7. 推送凭据

- HTTPS：远程 URL 用 HTTPS 但**没装 credential helper**，所以 HTTPS push 会失败
- SSH：`~/.ssh/id_ed25519_zhenran` 关联 GitHub 账号 `Zhenran-Wang`，**直接 push 即可**
- 当前 remote 已经是 `git@github.com:Zhenran-Wang/societybench-web.git`（SSH）

---

接手愉快。
