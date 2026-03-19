const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

const SKILL_DIR = path.join(__dirname, '..');
const DEFAULT_OUTPUT = path.join(os.homedir(), "my_project_area", "documents", "ai-daily-news", "green-book");
const GEMINI_WEB_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-danger-gemini-web", "scripts", "main.ts");
const GEMINI_WEB_MODEL = process.env.GREEN_BOOK_GEMINI_MODEL || "gemini-3-flash";

// --- 针对高频限流的深度调优参数 ---
const MAX_CONCURRENCY = 1;      // 强制改为串行，这是解决 RPM/TPM 的终极方案
const MAX_RETRIES = 5;         // 增加重试次数
const MIN_RETRY_DELAY = 10000; // 失败后至少等待 10s
const COOLDOWN_MS = 5000;     // 正常生成后的强制冷却时间

function getIllustrationPrompt(keywords) {
  return `${keywords}, professional digital editorial illustration, minimalist high-end flat design, premium vector art style, clean composition, volumetric lighting, vibrant professional color palette, masterpiece, 16:9, no text, no watermark`;
}

function normalizeLen(text) {
  return String(text || '').replace(/\s+/g, '').length;
}

function validateNewsItem(news, index) {
  const summaryLen = normalizeLen(news.summary);
  if (summaryLen < 150 || summaryLen > 170) {
    console.warn(`⚠️ [${index}] ${news.filename} summary 字数为 ${summaryLen}，建议 150-170。`);
  }

  const headerLen = normalizeLen(news.headerTitle).toString();
  if (!String(news.headerTitle).includes('\n') && Number(headerLen) > 20) {
    console.warn(`⚠️ [${index}] ${news.filename} headerTitle 超过 20 字且未换行，建议按语义断成两行。`);
  }

  const coverLen = normalizeLen(news.coverTitle);
  if (coverLen > 20) {
    console.warn(`⚠️ [${index}] ${news.filename} coverTitle 超过 20 字（当前 ${coverLen}）。`);
  }
}

/**
 * 极度稳健的生图逻辑
 */
async function resolveIllustrationWithRetry(news, targetDir, forceAiImage, retryCount = 0) {
  const generatedImagePath = path.join(targetDir, `ill-${news.filename}.png`);
  
  // 优先策略：仅当用户明确上传了图片（uploadedImage）时才走本地图。
  // 未上传图片时默认使用 AI 生图，避免误用历史/抓取图片。
  if (news.uploadedImage && fs.existsSync(news.uploadedImage) && !forceAiImage) {
    return { path: news.uploadedImage, isAiGenerated: false };
  }
  if (fs.existsSync(generatedImagePath)) return { path: generatedImagePath, isAiGenerated: true };

  const prompt = getIllustrationPrompt(news.visualKeywords);
  
  try {
    const command = `bun "${GEMINI_WEB_SCRIPT}" --model ${GEMINI_WEB_MODEL} --prompt "${prompt.replace(/"/g, '\\"')}" --image "${generatedImagePath}"`;
    const { stdout, stderr } = await execPromise(command);

    if (fs.existsSync(generatedImagePath)) {
      return { path: generatedImagePath, isAiGenerated: true };
    }
    throw new Error(`Gemini Web 生图未产出文件。stdout: ${stdout}\nstderr: ${stderr}`);
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      // 随机退避延迟：(基础延迟 + 随机抖动) * 2 ^ 重试次数
      const waitTime = MIN_RETRY_DELAY + Math.random() * 5000;
      console.warn(`   ⚠️ [${news.filename}] 触发限流或网络错误，${(waitTime/1000).toFixed(1)}s 后进行第 ${retryCount + 1} 次重试...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return resolveIllustrationWithRetry(news, targetDir, forceAiImage, retryCount + 1);
    }
    throw err;
  }
}

const NEWS = [
  {
    coverTitle: "小米认领神秘榜一\n万亿MiMo V2发布",
    headerTitle: "小米认领神秘榜一\n万亿MiMo-V2-Pro亮相",
    summary: "小米正式发布MiMo-V2家族并确认此前在OpenRouter榜首的Hunter Alpha即MiMo-V2-Pro。该模型强调万亿参数、百万上下文与真实世界智能体工作流，在代码生成、复杂任务规划和工具调用方面表现突出，也让外界重新评估国产旗舰模型在工程可用性与商业落地上的进展速度，并被不少开发者视为近期最值得实测的新模型之一。",
    visualKeywords: "Xiaomi AI model launch, futuristic control room, trillion-parameter neural network visualization, Chinese tech keynote, premium editorial illustration",
    uploadedImage: path.join(os.homedir(), "my_project_area", "images", "green-book", "xiaomi-mimo.webp"),
    imagePosition: "center 60%",
    filename: "xiaomi-mimo"
  },
  {
    coverTitle: "特斯拉百万机器人\nO链五企浮出水面",
    headerTitle: "特斯拉百万机器人提速\nO链五企分工浮出水面",
    summary: "随着特斯拉Optimus量产目标逼近，三花智控、拓普集团、旭升集团、新剑传动与贝特科技等中国供应商赴泰建厂的消息集中曝光。公开信息显示，这些企业已围绕执行器、关节模组与行星滚柱丝杠形成分工，但当前仍以送样和产线准备为主，确定性大单与明确交付节奏仍待进一步验证，供应链虽已就位，但量产兑现仍取决于主机厂节奏与成本目标。",
    visualKeywords: "Tesla humanoid robot supply chain, precision actuators and joints, industrial factories in Thailand, advanced manufacturing network, business editorial illustration",
    filename: "tesla-ochain"
  },
  {
    coverTitle: "马斯克点赞Kimi\n同算力效率+25%",
    headerTitle: "Kimi重构模型底层架构\n同算力训练效率提升25%",
    summary: "月之暗面发布Attention Residuals研究，尝试重构大模型长期沿用的残差连接机制。论文称在相同算力和数据条件下，新架构训练出的模型可达到基线约1.25倍算力的效果，并在科学推理、数学与代码任务上取得明显增益。相关成果引发行业关注，马斯克等技术圈人士也在社交平台公开点赞讨论，不少开发团队正关注其在长训练周期下的稳定收益。",
    visualKeywords: "AI research breakthrough, neural architecture redesign, attention residuals concept art, efficiency gain chart, futuristic lab editorial style",
    filename: "kimi-attnres"
  },
  {
    coverTitle: "黄仁勋押注龙虾\n下个ChatGPT？",
    headerTitle: "黄仁勋高调点赞OpenClaw\n直言可能成为下个ChatGPT",
    summary: "在GTC期间接受媒体采访时，黄仁勋高度评价开源智能体平台OpenClaw，称其有机会成为“下一个ChatGPT”。他同时介绍英伟达推出企业版NemoClaw，目标是在开源生态基础上叠加安全性、可控性与可扩展能力，帮助企业将自主智能体更稳妥地部署到真实业务流程与生产环境中。这一表态进一步强化了“智能体平台化”成为下一阶段竞争焦点的预期。",
    visualKeywords: "Jensen Huang interview moment, open-source AI agent platform, futuristic stage lighting, enterprise AI deployment, high-impact editorial illustration",
    filename: "openclaw-nextgpt"
  },
  {
    coverTitle: "日本最强AI塌房\n底座竟是DeepSeek",
    headerTitle: "日本最强AI争议爆发\n底座关联DeepSeek引热议",
    summary: "乐天发布号称“日本最强”的Rakuten AI 3.0后，社区在开源仓库与配置文件中发现其底座与DeepSeek-V3存在直接关联，随即引发广泛争议。事件焦点并非“二次开发”本身，而是发布沟通与许可信息披露是否充分合规。舆论迅速升温，也让“本土创新叙事与开源透明边界”再次成为讨论核心，日本社交平台相关话题持续发酵。",
    visualKeywords: "AI controversy in Japan, source code audit, open-source license dispute, social media backlash, dramatic investigative editorial illustration",
    filename: "rakuten-deepseek"
  }
];

async function main() {
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseOutputDir = process.env.GREEN_BOOK_OUTPUT_DIR || DEFAULT_OUTPUT;
  const forceAiImage = process.env.GREEN_BOOK_FORCE_AI_IMAGES === '1';
  
  if (!fs.existsSync(baseOutputDir)) fs.mkdirSync(baseOutputDir, { recursive: true });
  const targetDir = path.join(baseOutputDir, `智造三点三 ${date}V_ULTRA_STABLE`);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\n🚀 开启【极致稳健】模式 (强制串行 + 冷却机制)...`);
  const startTime = Date.now();

  NEWS.forEach((n, idx) => validateNewsItem(n, idx + 1));

  // 1. 生成封面
  const coverPath = path.join(targetDir, '01-cover.png');
  if (!fs.existsSync(coverPath)) {
    await screenshot(coverHTML(NEWS.map(n => n.coverTitle)), coverPath);
  }

  // 2. 串行处理 (保证 RPM 安全)
  const results = { success: [], failed: [] };
  
  for (let i = 0; i < NEWS.length; i++) {
    const news = NEWS[i];
    try {
      console.log(`📌 [${i + 1}/${NEWS.length}] 正在处理: ${news.filename}`);
      const { path: imgPath } = await resolveIllustrationWithRetry(news, targetDir, forceAiImage);
      const innerPath = path.join(targetDir, `0${i + 2}-${news.filename}.png`);
      
      if (!fs.existsSync(innerPath)) {
        await screenshot(innerHTML(news.headerTitle, news.summary, toBase64(imgPath), news.imagePosition || 'center center'), innerPath);
      }
      results.success.push(news.filename);
      console.log(`   ✅ 完成`);

      // 关键：在成功生成后强制冷却，防止下一条请求冲击频率限制
      if (i < NEWS.length - 1) {
        console.log(`   ⏳ 正在进入请求间冷却窗口 (${COOLDOWN_MS/1000}s)...`);
        await new Promise(r => setTimeout(r, COOLDOWN_MS));
      }
    } catch (err) {
      console.error(`   ❌ [${i + 1}/${NEWS.length}] 最终失败: ${err.message}`);
      results.failed.push({ filename: news.filename, error: err.message });
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  console.log(`\n🎉 任务结束！耗时: ${duration.toFixed(2)}s`);
  console.log(`📊 统计: 成功 ${results.success.length}, 失败 ${results.failed.length}`);
  console.log(`📍 目录: ${targetDir}`);
  if (os.platform() === 'darwin') exec(`open "${targetDir}"`);
}

main().catch(console.error);
