# 小绿书 Green Book Skill
智造三点三品牌专用小绿书新闻生图技能。

## 功能说明
快速生成小绿书风格的图文新闻卡片，支持批量处理多条新闻。

## 触发规则
用户明确提到「小绿书」「Green Book」「智造三点三」时使用。

## 使用方法
1. 输入新闻链接或内容，自动解析「主体-动作-对象」三元组
2. 生成封面标题、内页标题、正文摘要、视觉关键词
3. 将确认后的数据写入 `scripts/news.js`
4. 运行 `node scripts/run.js` 生成封面、内页与插图缓存
5. 支持自定义上传配图，默认使用 Gemini AI 生成插图

## 数据格式
`scripts/news.js` 需导出数组，每项包含：

```js
module.exports = [
  {
    coverTitle: "主标题\n副标题",
    headerTitle: "内页标题\n第二行",
    summary: "120-150字摘要",
    visualKeywords: "english visual keywords",
    filename: "kebab-case-name",
    uploadedImage: "/absolute/path/to/local-image.png" // 可选
  }
];
```

## 运行命令

默认读取 `scripts/news.js`：

```bash
node scripts/run.js
```

强制所有新闻都走 AI 生图：

```bash
GREEN_BOOK_FORCE_AI_IMAGES=1 node scripts/run.js
```

指定自定义数据文件：

```bash
GREEN_BOOK_NEWS_FILE=/absolute/path/to/news.js node scripts/run.js
```

## 规范要求
| 字段 | 要求 |
|:---|:---|
| 封面标题 | ≤20字，双行平衡，单行≤11字 |
| 内页标题 | 约20字，过长需断行 |
| 正文摘要 | **120-150字** |
| 文件名 | kebab-case，便于缓存与输出命名 |
| 输出尺寸 | 1800x2400 px |

## 输出路径
默认输出到 `~/my_project_area/images/san-dian-san-MMDD`

## 技术优化
- 失败重试自动切换极短prompt，提升通过率
- 仅全部成功时自动打开文件夹
- 支持自定义Gemini模型版本
- 支持本地 `uploadedImage` 和 `GREEN_BOOK_FORCE_AI_IMAGES=1` 覆盖策略
- 运行前自动校验标题长度、摘要长度和图片路径

## 环境依赖
- `baoyu-danger-gemini-web` 技能作为生图后端
- Node.js + Playwright 用于页面渲染
