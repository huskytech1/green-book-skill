# Green Book Runtime Reference

本文件用于补充 `SKILL.md`，仅在需要修改脚本行为时加载。

## 关键文件

- `scripts/run.js`：任务编排、AI 生图调用、重试与输出。
- `scripts/generate.js`：HTML 模板与 Playwright 截图。

## 环境变量

- `GREEN_BOOK_OUTPUT_DIR`
  - 作用：覆盖默认输出根目录。
  - 默认值：`$HOME/my_project_area/documents/ai-daily-news/green-book`
- `GREEN_BOOK_FORCE_AI_IMAGES`
  - 作用：设为 `1` 时忽略 `localImage`，强制全部走 AI 生图。
  - 默认值：未设置（优先使用存在的 `localImage`）。

## NEWS 数据结构（`scripts/run.js`）

每条新闻对象建议包含：

```js
{
  filename: "qclaw",
  coverTitle: "微信就能控电脑\n腾讯QClaw开启公测",
  headerTitle: "微信能远程控制电脑",
  summary: "90-110 字中文摘要",
  visualKeywords: "remote desktop, wechat, productivity app",
  localImage: "/abs/path/example.png" // 可选
}
```

## 生成流程要点

1. 生成封面：`01-cover.png`
2. 逐条生成内页：`0${index + 2}-${filename}.png`
3. 输出目录：`<baseOutputDir>/智造三点三 MMDDV_ULTRA_STABLE`
4. 若目标文件已存在则跳过，支持断点续跑。

## 限流与重试策略

- 串行处理：`MAX_CONCURRENCY = 1`
- 每条成功后冷却：`COOLDOWN_MS = 5000`
- 失败后随机退避：`10000-15000ms`
- 最大重试：`MAX_RETRIES = 5`

## 生图命令与模型

- 默认命令：`alma image generate --model gemini-3.1-flash-image-preview "<prompt>"`
- 输出解析：从命令标准输出中提取图片绝对路径（`png/jpg/jpeg/webp`）。

## 截图渲染参数

- 浏览器：优先本地 Chrome  
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- 视口：`900x1200`
- 渲染倍率：`deviceScaleFactor: 2`
- 最终图片：`1800x2400`
