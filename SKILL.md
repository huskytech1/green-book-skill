---
name: green-book
description: >
  智造三点三（Zhi Zao San Dian San）品牌专用小绿书新闻生图技能。
  当用户明确提到“小绿书”“Green Book”或“智造三点三”时使用。
---

# Green Book Skill

## 触发规则

为避免“小绿书”和“小红书”混淆，按以下规则判断：
1. 用户明确提到“小绿书”“Green Book”“智造三点三”时，使用本技能。
2. 用户只说“小红书”或未提及“绿书”时，不使用本技能。
3. 若语义不清晰，先用一句话确认目标是否为“智造三点三小绿书”。

## 工作流（严格顺序）

### Step 1：内容解析与事实核查
1. 获取新闻正文后，先做“主体-动作-对象”三元组核查。
2. 每条新闻生成：
   - `coverTitle`：封面标题，总字数不超过 20，单行不超过 11（超出时使用 `\n`）。
   - `headerTitle`：内页标题，目标约 20 字；过长时必须按语义断成两行（使用 `\n`）。
   - `summary`：正文摘要，严格控制在 120-150 字。
   - `visualKeywords`：英文视觉关键词。
   - `filename`：英文短文件名（如 `qclaw`）。

### Step 2：文案预审（阻断）
向用户展示“事实核查与文案预览表（第一轮：封面）”：
| 序号 | 事实核查 (主体-动作-对象) | 封面标题 (双行平衡) |
| :--- | :--- | :--- |
| 01 | 腾讯-公测-远程控电脑 | 微信就能控电脑\n腾讯 QClaw 开启公测 |

用户确认封面后，必须进入“第二轮：内页标题与摘要审核”，逐条展示：
| 序号 | 内页标题（可两行） | 摘要（150-170字） |
| :--- | :--- | :--- |
| 01 | 腾讯远程控电脑\nQClaw 开启公测 | （120-150字摘要） |

等待用户再次回复“确认”后进入 Step 3。

### Step 3：执行生成
1. 将确认后的数据写入 `scripts/run.js` 的 `NEWS` 数组。
2. 运行命令：
```bash
cd "$HOME/.claude/skills/green-book"
node scripts/run.js
```
3. 若要强制所有内页都使用 AI 生图：
```bash
GREEN_BOOK_FORCE_AI_IMAGES=1 node scripts/run.js
```

## 图片来源策略（更新）

1. 默认优先使用 AI 生图（Gemini Web）。
2. 仅当用户明确上传图片时，才在对应新闻项填写 `uploadedImage` 并使用本地图片。
3. 禁止在未上传图片的情况下使用抓取图/历史图作为默认内页图。

### 默认生图后端

- 默认后端：`baoyu-danger-gemini-web`（通过 `bun scripts/main.ts` 调用）
- 默认模型：`gemini-3-flash`
- 可通过环境变量覆盖：`GREEN_BOOK_GEMINI_MODEL=gemini-3-pro`

## 质量闸门（新增）

在执行 Step 3 前，需逐条自检：
1. `coverTitle`：≤20 字，且双行平衡。
2. `headerTitle`：目标约20字；若过长已按语义断行。
3. `summary`：长度在 120-150 字。
4. 图片来源：未上传图片时，来源必须为 AI 生图。

## 路径与输出

- 技能目录：`$HOME/.claude/skills/green-book`
- 默认输出目录：`$HOME/my_project_area/images`
- 支持环境变量覆盖输出目录：`GREEN_BOOK_OUTPUT_DIR=/your/path`
- 实际输出子目录格式：`san-dian-san-MMDD`
- 断点续传：若目标图片已存在，会自动跳过。

## 稳健参数（来自脚本）

- 并发生图：`MAX_CONCURRENCY = 2`（每批 2 张）
- 批次冷却：`COOLDOWN_MS = 5000`
- 重试：最多 `3` 次，退避 8-12s，第 3 次起切换极短 prompt
- 渲染：`deviceScaleFactor = 2`，输出 `1800x2400`

## 按需加载参考文档

仅在以下场景读取 `references/api_reference.md`：
1. 需要修改命令参数、重试策略、输出目录规则时。
2. 需要核对环境变量、数据结构、文件命名规则时。
