---
name: green-book
description: >
  智造三点三（Zhi Zao San Dian San）品牌专用小绿书新闻生图工具。
  当用户明确提到"小绿书"、"Green Book"或"智造三点三"时触发。
github_url: https://github.com/huskytech1/green-book-skill
github_hash: aabfb0adba1bc497b5756e2d0d650bfa7ea37426
---

# Green Book（智造三点三小绿书）

## 技能识别与冲突解决 (Conflict Resolution)

由于"小绿书"与"小红书"在语义上相近，模型在识别意图时必须遵循以下强约束：

1. **关键词识别**：
   - 包含 **"绿"**、**"Green"**、**"智造三点三"** -> **强制**使用本技能 (`green-book`)。
   - 包含 **"红"**、**"XHS"**、**"小红书"** -> 使用通用信息图技能 (`baoyu-xhs-images`)。
2. **排版特征区分**：
   - **Green Book**：单页或 1+5 结构，3:4 写字板风格，蓝色表头，侧重单条新闻深度。
   - **XHS Images**：多页系列图（通常 3-10 张），1:1 或 3:4 比例，侧重高密度信息拆解。
3. **优先权**：如果用户模糊提到了"做小绿书"，模型应立即忽略任何关于小红书的自动化联想，直接加载本技能。

## 资产依赖（必须存在，否则终止）

所有资产存放在本 Skill 的 `assets/` 目录下：

| 文件名 | 用途 | 说明 |
|--------|------|------|
| `assets/cover-template.png` | 封面底图 & 内页背景 | 写字板风格原图，封面作为背景底图，内页作为背景平铺 |
| `assets/logo.png` | 官方 Logo | 智造三点三横版 Logo，用于内页底部 |

**启动前先检查资产是否存在：**
```bash
ls ./assets/
```
若缺失，立即停止并提示用户将文件放入该目录。

---

## Workflow（严格按顺序执行，不可跳步）

### Step 1：内容解析（多路适配 + 搜索发现）

- **内容发现/补充 (Search/General Agent)**：
  - 当用户提供的线索不全（仅有主题无 URL）或需要背景补充时，调用 `general` 子代理进行联网搜索（通常集成了 Brave Search 等引擎）。
  - 通过搜索获取最新报道、多方评论或官方声明，确保摘要的信息量和时效性。
- **多路抓取策略**：
  - **普通新闻类 URL**：优先使用内置 `WebFetch` 工具直接抓取 Markdown 正文，响应速度最快。
  - **特定场景/社交媒体**：对于复杂页面或社交平台（如 X/Twitter），使用专用技能抓取。
- **本地化提炼规范**：
  - 抓取正文后，由主模型统一执行摘要提炼。
  - **摘要要求**：字数严格控制在 **150-170 字** 左右，确保信息高密度且排版丰满。
  - **标题处理**：同步完成 `coverTitle` 和 `headerTitle` 的语义化提炼。
    - **封面标题规范**：`coverTitle` 需具有高度话题性和冲击力，**强制分行显示**（使用 `\n` 断句），**总字数不得超过 20 个字符**，且**单行不得超过 11 个字符**。断句需符合语义逻辑，且应追求两行之间的视觉平衡（建议单行不低于 5 字），严禁单行仅 2-3 字。
    - **表头标题规范**：`headerTitle` 建议在 15-20 字，可与封面标题一致或略微扩充，同样支持 `\n` 换行以优化视觉对齐。

### 封面位置参数

```
const positions = [299, 455, 604, 759, 914];
```
  - `visualKeywords`：提炼 3-5 个英文关键词，驱动 AI 生图。 prompt 需强制包含 `editorial illustration style` 关键词以保持风格。

- **用户自定义插图处理**（Step 1 同步执行）：
  - 用户若提供配图，优先存放在 `~/Pictures/green-book-inputs/`，也兼容 `~/Downloads/`
  - 执行前将对应图片复制到 `assets/` 目录，命名规则：`news{N}-{slug}.png`（N 为新闻序号）
  - 在 NEWS 数组对应条目中设置 `localImage` 字段指向该路径
  - **任务完成后**自动删除 `assets/` 中本次复制的所有 `news{N}-*.png` 临时图片

### Step 2：文案预审（⛔ 阻断式，必须等用户确认）

抓取并提炼完成后，向用户展示如下 **Markdown 格式** 的 **【文案预审表】**，供用户审核：

#### 【封面文案】

| 序号 | 封面标题 (单行，max 13字符) |
| :--- | :--- |
| 01 | 标题内容 |
| 02 | ... |

#### 【内页摘要】

**01 | <headerTitle> (15-20字，语义切分)**

> 摘要正文内容（150-170字，信息密度高，语言专业）。

---

**02 | <headerTitle>**

> 摘要正文内容...

---

**等待用户回复"确认"或提出修改意见后，才能进入 Step 3。**

---

### Step 3：更新 run.js 中的新闻数据

将用户确认后的数据填入 `scripts/run.js` 顶部的 `NEWS` 数组：

```js
const NEWS = [
  {
    coverTitle: '拒绝监控与自主武器\nAnthropic 硬刚战争部！',   // 封面用，\n 换行
    headerTitle: '拒绝监控与自主武器，Anthropic 硬刚战争部！', // 内页蓝色表头，15-20 字
    summary: '美国战争部长宣布将 Anthropic 列为"供应链风险"...（100字左右）',
    visualKeywords: 'AI robot facing military authority courtroom battle, minimalist illustration',
    localImage: '',        // 有用户提供的图片时填写路径，否则留空或删除此字段
    filename: '02-anthropic'  // 输出文件名，需唯一
  },
  // ... 共 5 条
];
```

---

### Step 4：执行生成脚本

```bash
cd [SKILL_DIR] && node scripts/run.js
```

如需强制忽略本地素材、统一改走 AI 生图，可设置：

```bash
GREEN_BOOK_FORCE_AI_IMAGES=1 node scripts/run.js
```

脚本会自动完成以下所有操作：
1. 用 HTML + Playwright 精确渲染封面图（以 `cover-template.png` 为背景底图，标题与序号徽章像素级对齐）
2. 对每条新闻，有 `localImage` 则直接使用；没有素材图时，默认自动调用 `baoyu-image-gen` 生成 16:9 插图底图
3. 用 HTML + Playwright 合成内页，确保布局 100% 一致
4. 输出到 `~/Pictures/green-book/智造三点三 ${mmdd}V${x}/`（自动递增版本号，如 `智造三点三 0303V1`）
5. 自动用 Finder 打开输出目录
6. **自动删除** `assets/` 中本次复制的所有 `news{N}-*.png` 临时图片

---

## 输出规范（已定稿，不可随意修改）

### 封面图（01-cover.png）
- **尺寸**：900 × 1200px（3:4）
- **方案**：HTML + Playwright 精确渲染，以 `assets/cover-template.png` 为背景底图
- **内容**：写字板风格，含品牌 Logo + 5 条新闻编号标题（标题与底图中序号徽章像素级对齐）

### 内页图（02~06，HTML + Playwright 截图）
- **尺寸**：900 × 1200px（3:4）
- **字体**：`Source Han Sans SC VF`（思源黑体，已安装于系统）
- **背景**：`cover-template.jpg` 铺满，`brightness(0.92)` 略暗

**三层结构（固定，不可变）：**

| 区域 | 高度 | 说明 |
|------|------|------|
| 顶部蓝色表头 | 130px | `#1565C0` 蓝底，白色标题居中，字号 34px，行高 1.55 |
| 中部 AI 插图 | 456px | 16:9 AI 生图，`object-fit: cover` |
| 底部文案区 | flex:1（剩余空间） | 白底，摘要 28px 黑色，底部 Logo 小图居中 |

**装饰元素（固定）：**
- 顶部夹子：灰色圆角矩形，水平居中，`z-index: 10`
- 四角便利贴：黄色（`#ffd54f`）+ 绿色（`#aed581`），64×64px，略微旋转
- 白色纸张区域：距四边 48px（顶部 40px），圆角 4px，阴影

---

## 目录结构

```
green-book/
├── SKILL.md                  # 本文件
├── package.json
├── node_modules/             # 含 playwright-core
├── assets/
│   ├── cover-template.png    # 写字板封面模板（必须）
│   └── logo.png              # 官方横版 Logo（必须）
└── scripts/
    ├── generate.js           # HTML 模板函数（coverHTML / innerHTML / screenshot）
    └── run.js                # 主执行脚本（新闻数据 + 生成流程）
```

---

## generate.js 核心 CSS 规范（不可随意改动）

### 封面图 CSS

```css
/* 封面整体：以 cover-template.png 为背景底图 */
body { width: 900px; height: 1200px; font-family: 'Source Han Sans SC VF', ...; position: relative; overflow: hidden; background-image: url(...); background-size: cover; }

/* Logo */
.logo { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); width: 310px; z-index: 10; }

/* 每条标题条目：精确对齐底图序号徽章 */
/* positions（每条 top 值）: [299, 455, 604, 759, 914]px */
/* 徽章右边缘在约 292px，文字起点 left: 320px（间距 ~28px） */
.item { position: absolute; left: 320px; width: 540px; height: 120px; display: flex; align-items: center; }
.title { font-size: 38px; font-weight: 600; color: #333; line-height: 1.2; display: flex; flex-direction: column; text-align: left; }
.title span { display: block; white-space: nowrap; }
```

### 内页 CSS

```css
/* 内页整体 */
body { width: 900px; height: 1200px; background: #d4c9a8; position: relative; overflow: hidden; }

/* 写字板背景 */
.bg { position: absolute; inset: 0; background-image: url(cover-template); background-size: cover; filter: brightness(0.92); }

/* 夹子 */
.clip { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 36px; background: #8a8a8a; border-radius: 0 0 8px 8px; z-index: 10; }

/* 纸张 */
.paper { position: absolute; top: 40px; left: 48px; right: 48px; bottom: 48px; background: white; border-radius: 4px; box-shadow: 2px 4px 16px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; z-index: 5; }

/* 蓝色表头 */
.header { background: #1565C0; height: 130px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0 36px; }
.header-title { color: white; font-size: 34px; font-weight: 700; text-align: center; line-height: 1.55; white-space: pre-line; }

/* 插图 */
.illustration { width: 100%; height: 456px; object-fit: cover; flex-shrink: 0; display: block; }

/* 底部文案 */
.content { flex: 1; padding: 24px 36px 20px; display: flex; flex-direction: column; justify-content: space-between; background: white; }
.summary { font-size: 28px; color: #222; line-height: 1.85; text-align: justify; }

/* Logo 栏 */
.logo-bar { display: flex; justify-content: center; padding-top: 12px; border-top: 1px solid #e8e8e8; margin-top: 8px; }
.logo-small { height: 40px; object-fit: contain; }

/* 便利贴 */
.sticky { position: absolute; z-index: 8; width: 64px; height: 64px; box-shadow: 2px 2px 6px rgba(0,0,0,0.2); }
.sticky-1 { top: 52px; left: 16px; background: #ffd54f; transform: rotate(-8deg); }
.sticky-2 { top: 52px; right: 16px; background: #aed581; transform: rotate(6deg); }
.sticky-3 { bottom: 60px; left: 16px; background: #aed581; transform: rotate(5deg); }
.sticky-4 { bottom: 60px; right: 16px; background: #ffd54f; transform: rotate(-6deg); }
```

---

## 进阶技巧与规范

### 1. 标题语义切分规范
- **强制换行**：在 `NEWS` 数组的 `headerTitle` 中，必须通过 `\n` 进行手动断句，以确保大标题的美观。
- **切分逻辑**：优先在**主体名称**（如产品名、机构名）或**核心动作/结果**（如“首秀”、“正式启动”、“意外泄露”）之后切分。
- **视觉要求**：每行控制在 10-15 字之间，确保视觉重心居中，避免单行过长导致两端拥挤。
- **示例**：`众擎URKL人形机器人自由格斗联赛 \n 正式启动全球招募`

### 2. 图像质量增强协议
- **视网膜级 (High-DPI) 渲染**：`generate.js` 中的 `screenshot` 函数必须开启 `deviceScaleFactor: 2`，以输出 1800x2400 的高清图片。
- **素材预处理**：若使用用户提供的本地素材，在渲染前需使用 ImageMagick 进行锐化处理，以改善放大后的模糊感：
  ```bash
  magick input.png -resize 1200x -unsharp 0x1 output.png
  ```

### 3. 用户素材管理规范
- **路径同步**：用户提供的素材统一下载至 `~/Downloads/`。
- **自动归档**：执行脚本前，需手动或通过命令将素材 `cp` 至 `assets/` 并按 `news{N}-{slug}.png` 命名，确保 `run.js` 中 `localImage` 路径的稳定性。

### 4. 长任务超时处理
- **分批执行**：由于 AI 生图耗时较长，若 5 张图总执行时间超过 120s 导致工具超时，应通过修改 `run.js` 中 `for` 循环的起始索引 `i` 来实现断点续传。

---

## 图像生成故障处理指南

1. **双引擎生图**：脚本默认优先调用 `baoyu-danger-gemini-web` (Gemini Web) 生图，若执行失败（如 Cookie 过期）则自动回退至 `baoyu-image-gen` (标准 API) 方案。
2. **生图超时**：由于网络或 AI 响应原因导致超时，利用 `run.js` 的断点续传机制（检测已存在文件）分批次重新运行脚本。
3. **占位方案**：在极端不可控情况下，可使用 ImageMagick `magick` 命令生成带有主题色块和文字的占位插图，以维持排版结构完整：
   ```bash
   magick -size 1600x900 xc:#COLOR -gravity center -font "Source Han Sans SC VF" -pointsize 80 -fill white -annotate 0 "TITLE" output.png
   ```

## 注意事项
- **高清输出**：最终输出分辨率应为 1800x2400，确保在手机端查看时文字边缘锐利、背景纹理清晰。
- **封面图对齐**：封面图采用 HTML 渲染，标题文字需与底图中的序号徽章实现像素级垂直居中对齐。
- **摘要长度**：摘要严格控制在 150-170 字，配合 `line-height: 1.85` 达到最佳阅读体验。
- **AI 生图**：`visualKeywords` 必须使用英文，且 prompt 应包含 `editorial illustration style` 关键词以保持风格统一。

## 用户自定义插图规范

- 用户将图片存放在 `~/Downloads/` 目录下，无需提前命名
- 执行时将对应图片复制到 `assets/` 并命名为 `news{N}-{slug}.png`（N 为新闻序号）
- NEWS 数组对应条目设置 `localImage` 字段，路径指向 `assets/news{N}-{slug}.png`
- **有 `localImage`** → 直接用作内页插图
- **无 `localImage`**（用户未提供图片）→ 根据 `visualKeywords` 自动 AI 生图，流程与之前完全一致
- **任务完成后自动删除** `assets/` 中所有 `news{N}-*.png` 临时文件，保持目录整洁
