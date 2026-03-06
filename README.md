# Green Book (智造三点三小绿书)

`green-book` 是一个为 **智造三点三 (Zhi Zao San Dian San)** 品牌量身定制的 AI 新闻生图工具。它能够将复杂的科技新闻自动提炼为适合社交媒体传播的高质量信息图（写字板风格）。

## 🌟 核心特性

- **自动化新闻提炼**：集成多路内容抓取与语义分析，自动生成 100 字左右的高密度新闻摘要。
- **高像素渲染**：基于 Playwright 的 HTML 截图技术，支持 Retina 级渲染（1800x2400px），确保文字边缘锐利，适合移动端高清晰度展示。
- **AI 智能配图**：根据新闻内容自动提取视觉关键词，调用 AI 生图模型生成风格统一的编辑插画（Editorial Illustration）。
- **品牌视觉一致性**：严格遵循品牌视觉规范，包括写字板背景、蓝色表头、特定字体（思源黑体）及装饰元素（便利贴、夹子）。
- **灵活的素材支持**：支持自动 AI 生图与用户自定义本地图片（`localImage`）无缝切换。

## 🛠️ 技术架构

- **Runtime**: Node.js
- **Rendering**: Playwright (HTML to Image)
- **AI Backend**: Claude (Summarization) & Image Generation API
- **Design Strategy**: Clipboard Style Layout (3:4 Ratio)

## 📂 目录结构

```text
green-book/
├── SKILL.md                  # Claude 技能定义与规范流程
├── package.json              # 项目依赖 (playwright-core 等)
├── assets/                   # 静态资产
│   ├── cover-template.png    # 封面/背景底图模板
│   └── logo.png              # 智造三点三横版 Logo
└── scripts/
    ├── generate.js           # HTML 模板与截图核心逻辑
    └── run.js                # 主执行脚本与新闻数据配置
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置资产
确保 `assets/` 目录下存在必要的品牌视觉素材：
- `assets/cover-template.png`
- `assets/logo.png`

### 3. 执行流程
1. **内容解析**：输入新闻 URL 或主题，由 AI 自动提炼标题与摘要。
2. **数据填充**：将确认后的文案填入 `scripts/run.js` 的 `NEWS` 数组。
3. **运行脚本**：
   ```bash
   node scripts/run.js
   ```
4. **结果获取**：图片将自动保存至 `~/Downloads/智造三点三 [日期]V[版本]/` 并自动打开文件夹。

## 🎨 视觉规范

### 封面图 (Cover)
- **尺寸**：900x1200px (2x 渲染输出)
- **布局**：标题需与底图中的序号徽章实现像素级精确对齐。
- **标题**：建议 10-15 字符，支持通过 `\n` 手动控制换行美感。

### 内页图 (Inner Pages)
- **蓝色表头**：130px 高，颜色代码 `#1565C0`，标题居中。
- **中部插图**：456px 高，16:9 比例，支持 `object-fit: cover`。
- **底部摘要**：28px 字号，1.85 行高，确保阅读舒适度。
- **点缀元素**：四角旋转便利贴（黄色/绿色）与顶部复古夹子。

## ⚠️ 开发与使用规范

- **摘要长度**：严格控制在 90-110 字之间，以保持页面布局平衡。
- **生图关键词**：`visualKeywords` 必须为英文，建议包含 `minimalist illustration` 或 `editorial style`。
- **高清输出**：渲染脚本必须开启 `deviceScaleFactor: 2` 以保证输出质量。

---

Built with ❤️ for **智造三点三**.
