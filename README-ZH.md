<div align="center">

# 🔮 SocietyBench — Web

反事实社会世界的演化预测
</br>
Forecasting Counterfactual Social-World Evolution

[![License](https://img.shields.io/badge/License-MIT-2a78d6?style=flat-square)](LICENSE)
[![Site](https://img.shields.io/badge/Site-static%20HTML-1baf7a?style=flat-square)](index.html)
[![Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Dataset-SocietyBench-eda100?style=flat-square)](https://huggingface.co/datasets/Social-AI-2026/SocietyBench)
[![Code](https://img.shields.io/badge/GitHub-SocietyBench--codebase-eb6834?style=flat-square&logo=github&logoColor=white)](https://github.com/Social-AI-2026/SocietyBench-codebase)
[![Pages](https://img.shields.io/badge/Pages-2-e87ba4?style=flat-square)](https://github.com/Social-AI-2026/SocietyBench-web)

[English](./README.md) | [中文文档](./README-ZH.md)

</div>

## ⚡ 项目概述

这个仓库是 SocietyBench 的**项目主页**——那个基准要问的是：当模型认不出这是哪件事的时候，它还能不能预测这件事接下来怎么走。基准本身在另外两个仓库里，这里只负责把它讲清楚。

站点刻意做得很朴素：静态 HTML，没有构建步骤、没有框架、没有打包器，打开 `index.html` 就能跑。所有不用改标记就能变的东西——榜单、交互演示、深入分析的表格、中英两套文案——都放在 JSON 和 `i18n.js` 里。

> **站点上每一个数字都是实测的。** 榜单就是论文的 Table 2，深入分析的表格就是论文的消融表，演示页回放的是我们真实的逐题模型输出。全站没有任何推算值或示意性数字。

## 🎯 两个页面

| 页面 | 内容 |
|------|------|
| **`index.html`** | 概述、摘要、方法、榜单、深入分析、参与贡献、引用 |
| **`demo.html`** | *逐题回放* —— 选一个事件和一个截止点，看模型看到了什么、答了什么、离真相差多远 |

两个页面共用同一套导航栏、同一份样式表、同一张翻译表，所以改其中任何一样，两个页面同时生效。
深入分析原来是第三个页面，现在并进了首页，位置在榜单之后。

## 🔄 数据是怎么流过来的

1. **实验** —— [SocietyBench-codebase](https://github.com/Social-AI-2026/SocietyBench-codebase)
   的流水线把逐题结果写在 `runs_new/<event>/final/<lang>/results/run_main/` 下
2. **生成** —— `_gen/build_site_data.py` 和 `_gen/build_experiments.py` 读取这些结果和论文表格，
   产出下面那六个 JSON
3. **渲染** —— `app.js` 画榜单和深入分析，`demo.js` 驱动交互页，`i18n.js` 负责中英切换
4. **上线** —— 没有构建步骤；仓库里是什么样，服务出去就是什么样

## 🚀 快速开始

### 前置要求

| 工具 | 版本要求 | 说明 | 安装检查 |
|------|---------|------|---------|
| **任意静态服务器** | — | 本地起服务 | `python3 -m http.server --help` |
| **Python** | 3.10+ | 仅在重新生成数据文件时需要 | `python3 --version` |
| **ffmpeg** | 任意 | 仅在重新编码视频时需要 | `ffmpeg -version` |

#### 1. 本地跑起来

```bash
git clone https://github.com/Social-AI-2026/SocietyBench-web
cd SocietyBench-web

python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。直接双击 `index.html` 也能看到版式，但加载 JSON 的
`fetch()` 会被浏览器的文件源策略挡掉，榜单和演示会是空的——所以要起服务。

> **主页有密码门。** 这是私密预览：页面里存的是一个 SHA-256 哈希，在浏览器里校验解锁，
> 能挡住随手点进来的人，但**不是真正的访问控制**。要公开发布，把 `index.html` 里的
> `#auth-gate` 整块删掉即可。

#### 2. 重新生成数据

只有跑了新实验、或者论文表格改了才需要：

```bash
python3 _gen/build_site_data.py     # 榜单 + 交互演示，中英两版
python3 _gen/build_experiments.py   # 压力事件 + 四个消融，中英两版
```

前一个脚本读的是真实实验产物，后一个誊写的是论文表格。两个都直接写进本目录，并打印产出概要。

#### 3. 重新编码视频

源片是 2560×1440、27 Mbps，远超 GitHub 单文件 100 MB 上限。仓库里放的是两个派生版本：

```bash
# 首屏背景：静音、循环、轻量
ffmpeg -i source.mp4 -vf "scale=1280:-2,fps=30" -c:v libx264 -crf 30 \
       -pix_fmt yuv420p -movflags +faststart -an videos/hero.mp4

# 摘要区播放器：带窗口、有声
ffmpeg -i source.mp4 -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 27 \
       -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k videos/abstract-demo.mp4
```

换完记得把 `index.html` 里 `<source>` 标签上的 `?v=` 版本号也改掉，否则浏览器会继续用缓存里的旧片。

## 🏗️ 项目结构

| 路径 | 内容 |
|------|------|
| `index.html` · `demo.html` | 两个页面 |
| `styles.css` | 三页共用的样式表 |
| `app.js` | 榜单、深入分析表格、导航、滚动动画 |
| `demo.js` | 交互页（实时模式代码接好了，本次构建未开启）|
| `i18n.js` | 所有用户可见文案，中英各一套 |
| `leaderboard.json` · `.zh.json` | 论文 Table 2，外加智能体与基线 |
| `demo_index.json` · `.zh.json` | 缓存模式——事件与预测点清单 |
| `demo/<语言>/<事件>/P<NN>.json` | 每个预测点一个文件：全部题目、全部作答 |
| `experiments.json` · `.zh.json` | 压力事件与正文四个消融 |
| `figures/` | 论文里的 teaser 图与方法图 |
| `videos/` | `hero.mp4`（背景）与 `abstract-demo.mp4`（播放器） |
| `_gen/` | 产出上述 JSON 的两个生成脚本 |

> `uploads/` 已被 gitignore。那里装的是设计工具的临时产物——粘贴的截图、源视频、PDF——
> 没有任何页面引用它，收进仓库会让每次克隆多背 88 MB。

## 📚 文档

| 文档 | 回答什么问题 |
|------|-------------|
| [`HANDOFF.md`](HANDOFF.md) | 页面是怎么搭的：版式类名、滚动显现机制、怎么加一个新板块 |
| [`_gen/build_site_data.py`](_gen/build_site_data.py) | 哪些实验产物变成了榜单和演示，预测点是怎么挑的 |
| [`_gen/build_experiments.py`](_gen/build_experiments.py) | 论文的哪张表对应深入分析的哪一块 |
| [`i18n.js`](i18n.js) | 所有用户可见文案；键名规则写在文件开头 |
| [方法](https://github.com/Social-AI-2026/SocietyBench-codebase/blob/main/docs/methodology.md) | 基准本身——框架、匿名化、两条评分轴 |
| [评分](https://github.com/Social-AI-2026/SocietyBench-codebase/blob/main/docs/scoring.md) | 这些数字背后校准与时间两个公式的确切定义 |

## 💾 数据

页面上的一切都由脚本生成，从不手改。

| 文件 | 行数 | 来源 |
|------|------|------|
| `leaderboard.json` · `.zh.json` | 6 个 LLM + 3 个智能体 | 论文 Table 2 与智能体表 |
| `demo_index.json` · `.zh.json` | 5 个事件、125 个预测点 | 我们真实的逐题实验产物 |
| `demo/<语言>/<事件>/P<NN>.json` | 25,364 道校准题 + 3,112 个时间题，10 个系统各自作答 | 同一批实验产物，每个点一个文件 |
| `demo/<语言>/<事件>/P<NN>_context.md` | 该点的完整匿名化上下文 | 已发布数据集原样拷贝 |
| `experiments.json` · `.zh.json` | 难度来源的三个消融 | 论文的消融表 |

两场考试是**整套放出**的：每个预测点的每一道题，不是抽样。一共 250 个点文件加 250 份上下文、约 37 MB，
所以页面先加载索引，选中哪个点再去取那个点的题目。

**缓存模式不是演示样例。** 每个预测点展示的都是真实的截止日期、模型当时真实看到的上下文、
一道真实的校准题连同它的真实答案，以及六个模型各自真实的作答：

| 字段 | 来源 |
|------|------|
| `p_hat` | 模型自己给出的概率，来自 `brier/<model>/P<NN>_brier.json` |
| `pred_date` · `abs_error_days` | 模型自己预测的日期，来自 `time/<model>/P<NN>_time.json` |
| `context_excerpt` | 已发布的 `contexts/P<NN>_context.md` |
| `gt` · `gt_date` | 被扣留的标准答案 |

**125 个预测点、以及它们下面的每一道题，全都放出来了。** 覆盖本来就不齐，页面选择直说而不是藏起来：
三个外文模型在五个事件中的四个上只跑了省钱子集，所以有的点不足六个模型——点选择器里会写明有几个；
某个模型没答的题，那一格显示"—"而不是编一个数。落在 90 天评分窗口外的时间题从来没有向模型提问过，
它们照样列出来，并标注**未评测**。实时模式（请求时调用模型 API）不在本次构建里：面板已从页面移除，
驱动它的代码遇不到元素就直接返回。

匿名时间线与题库本身在
[🤗 Social-AI-2026/SocietyBench](https://huggingface.co/datasets/Social-AI-2026/SocietyBench)。

## 🤝 参与贡献

欢迎修正站点问题。有两点要留意：页面上的数字来自生成脚本，不要手改 JSON；
任何访客能看到的文案，都必须在 `i18n.js` 里中英两套都有。

**永远不要提交实体替换表、真名版本或真实日期偏移量。** 这个基准的有效性完全依赖它们保持私密——
见 [SocietyBench-codebase](https://github.com/Social-AI-2026/SocietyBench-codebase) 的安全政策。

## 📄 引用

```bibtex
@misc{societybench2026,
  title  = {SocietyBench: Forecasting Counterfactual Social-World Evolution},
  author = {Wang, Zhenran and Bian, Zhonghan and Li, Jinsong and Qi, Zhangyang},
  year   = {2026},
  note   = {\url{https://github.com/Social-AI-2026/SocietyBench-codebase}}
}
```

## 🙏 致谢

榜单上的 MiroFish 智能体基线基于 **[MiroFish](https://github.com/666ghj/MiroFish)** 构建，
其仿真引擎由 CAMEL-AI 团队的 **[OASIS](https://github.com/camel-ai/oasis)** 驱动。
另外两个智能体基线分别使用 **[LangGraph](https://github.com/langchain-ai/langgraph)** 和
**[AutoGen](https://github.com/microsoft/autogen)**。

## ⚖️ 许可

站点代码采用 [MIT 许可证](LICENSE)。评测数据单独以 CC BY 4.0 发布，流水线代码以 MIT 发布。
