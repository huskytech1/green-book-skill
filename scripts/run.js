const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const execPromise = util.promisify(exec);

const DEFAULT_OUTPUT = path.join(os.homedir(), "my_project_area", "images");
const GEMINI_WEB_SCRIPT = path.join(os.homedir(), ".claude", "skills", "baoyu-danger-gemini-web", "scripts", "main.ts");
const GEMINI_WEB_MODEL = process.env.GREEN_BOOK_GEMINI_MODEL || "gemini-3-flash";
const JIMENG_WEB_SCRIPT = path.join(os.homedir(), ".claude", "skills", "jimeng-web", "scripts", "main.ts");
const IMAGE_BACKEND = process.env.GREEN_BOOK_IMAGE_BACKEND || "gemini";

const MAX_CONCURRENCY = 2;     // 每批并发 2 张生图
const MAX_RETRIES = 3;         // 最多重试 3 次
const COOLDOWN_MS = 5000;      // 批次间冷却
const BATCH_GAP = 2000;        // 同批次内间隔

// prompt 精简：Gemini Web 对长 prompt 极敏感，超过 5-6 个标签大概率返回空
function getIllustrationPrompt(keywords) {
  return `${keywords}, digital illustration, editorial style`;
}

function normalizeLen(text) {
  return String(text || '').replace(/\s+/g, '').length;
}

function validateNewsItem(news, index) {
  const s = normalizeLen(news.summary);
  if (s < 120 || s > 150) console.warn(`⚠️ [${index}] ${news.filename} summary ${s}字，建议120-150`);
  const h = normalizeLen(news.headerTitle);
  if (!String(news.headerTitle).includes('\n') && h > 20) console.warn(`⚠️ [${index}] ${news.filename} headerTitle ${h}字，建议断行`);
  const c = normalizeLen(news.coverTitle);
  if (c > 20) console.warn(`⚠️ [${index}] ${news.filename} coverTitle ${c}字`);
}

async function generateIllustration(news, targetDir, forceAiImage) {
  const outPath = path.join(targetDir, `ill-${news.filename}.png`);
  if (news.uploadedImage && fs.existsSync(news.uploadedImage) && !forceAiImage)
    return { path: news.uploadedImage, generated: false };
  if (fs.existsSync(outPath)) return { path: outPath, generated: true };

  const prompt = getIllustrationPrompt(news.visualKeywords);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 第 3 次起用极短 prompt
      const p = attempt >= 2 ? `${news.visualKeywords}, illustration` : prompt;
      let cmd;
      
      if (IMAGE_BACKEND === 'jimeng') {
        // Jimeng Web 后端
        cmd = `bun "${JIMENG_WEB_SCRIPT}" --prompt "${p.replace(/"/g, '\\"')}" --ratio "3:4" --output "${outPath}"`;
      } else {
        // 默认 Gemini Web 后端
        cmd = `bun "${GEMINI_WEB_SCRIPT}" --model ${GEMINI_WEB_MODEL} --prompt "${p.replace(/"/g, '\\"')}" --image "${outPath}"`;
      }
      
      await execPromise(cmd);
      if (fs.existsSync(outPath)) return { path: outPath, generated: true };
      throw new Error('No image returned');
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const wait = 8000 + Math.random() * 4000;
        console.warn(`   ⚠️ ${news.filename} 第${attempt + 1}次重试，等待${(wait / 1000).toFixed(1)}s...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw err;
      }
    }
  }
}

const NEWS = [
  {
    coverTitle: "登顶LMArena！\n阿里 Qwen 超越 GPT-5.4",
    headerTitle: "Qwen3.5-Max 登顶\nLMArena 超越 GPT-5.4",
    summary: "3月20日，阿里千问最新预览版 Qwen3.5-Max 以1464分登顶 LMArena 盲测榜，超越 GPT-5.4、Claude4.5 及 Grok4.1。全球前十强中，中国企业占据五席，阿里巴巴位居中国第一。这标志着国产大模型正式进入全球第一梯队，打破海外厂商长期垄断榜首的局面。",
    visualKeywords: "AI, LMArena, Qwen, Alibaba, champion",
    filename: "qwen-max"
  },
  {
    coverTitle: "微信能控电脑！\n腾讯 ClawBot 插件公测",
    headerTitle: "微信 ClawBot 插件\n打通聊天界面操控 OpenClaw",
    summary: "3月22日，腾讯正式推出微信「ClawBot」插件，支持用户在微信聊天界面直接操作 OpenClaw 实例。该插件已支持 iOS 微信 8.0.70 及以上版本，可通过扫码一键连接，支持收发照片、视频、语音、文件。腾讯同时开放 QClaw、WorkBuddy、Lighthouse 同步接入。",
    visualKeywords: "WeChat, ClawBot, Tencent, OpenClaw, plugin",
    filename: "clawbot"
  },
  {
    coverTitle: "硅谷套壳中国AI？\nCursor 被发现用 Kimi",
    headerTitle: "Cursor Composer 2\n被扒底层用 Kimi K2.5",
    summary: "3月19日，AI 编程工具 Cursor 发布 Composer 2 后，有开发者发现其模型 ID 包含「kimi-k2p5-rl-0317」，质疑底层基于月之暗面的 Kimi K2.5 开源模型。Kimi K2.5 许可证要求月收入超2000万美元的商业产品需标注署名。3月21日月之暗面回应称属授权合作，但 Cursor 初期未公开说明引发争议。",
    visualKeywords: "Cursor, Kimi, Moonshot, open source, controversy",
    filename: "cursor-kimi"
  },
  {
    coverTitle: "库克：中国AI太牛了\n期待下一步大动作",
    headerTitle: "库克中国行\n点赞 AI 发展期待下一步",
    summary: "3月22日，苹果 CEO 库克出席中国发展高层论坛时表示，中国机器人行业发展令人印象深刻，对 AI 领域「迫不及待想看看下一步发展」。他称赞中国开发者每天都在挑战创新极限，利用技术构建工具帮助人们学习技能、管理健康。库克还透露，苹果超90%产品已采用清洁能源供电。",
    visualKeywords: "Tim Cook, Apple, China, AI, summit",
    filename: "cook-china"
  },
  {
    coverTitle: "西南首个AI影像高地！\n成都东部新区放大招",
    headerTitle: "成都东部新区\n签约 OPC 打造 AI 影像人才高地",
    summary: "3月20日，成都东部新区与东麓树莓影视科技签约，共建西南首个 AI 影像 OPC 人才社区。OPC（个体创意人）指在 AI 加持下具备独立完成高质量影像创作能力的群体。社区将提供创业空间、技术算法支持及产业对接服务，并被列入新区「十五五」人才规划重点，享受全方位政策保障。",
    visualKeywords: "Chengdu, OPC, AI, talent, film",
    filename: "chengdu-opc"
  }
];

async function main() {
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseOutput = process.env.GREEN_BOOK_OUTPUT_DIR || DEFAULT_OUTPUT;
  const forceAi = process.env.GREEN_BOOK_FORCE_AI_IMAGES === '1';
  const targetDir = path.join(baseOutput, `san-dian-san-${date}`);

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\n🚀 并发生图 x${MAX_CONCURRENCY} | 输出: ${targetDir}`);
  const t0 = Date.now();

  NEWS.forEach((n, i) => validateNewsItem(n, i + 1));

  // 封面
  const coverPath = path.join(targetDir, '01-cover.png');
  if (!fs.existsSync(coverPath))
    await screenshot(coverHTML(NEWS.map(n => n.coverTitle)), coverPath);

  // 分批处理
  const results = { ok: [], fail: [] };

  for (let s = 0; s < NEWS.length; s += MAX_CONCURRENCY) {
    const batch = NEWS.slice(s, s + MAX_CONCURRENCY);

    const batchRes = await Promise.allSettled(
      batch.map(async (news, li) => {
        const gi = s + li;
        console.log(`📌 [${gi + 1}/${NEWS.length}] ${news.filename}`);
        const { path: imgPath } = await generateIllustration(news, targetDir, forceAi);
        if (li > 0) await new Promise(r => setTimeout(r, BATCH_GAP * li));

        const innerPath = path.join(targetDir, `0${gi + 2}-${news.filename}.png`);
        if (!fs.existsSync(innerPath))
          await screenshot(innerHTML(news.headerTitle, news.summary, toBase64(imgPath), news.imagePosition || 'center center'), innerPath);
        console.log(`   ✅ ${news.filename}`);
        return news.filename;
      })
    );

    batchRes.forEach((r, i) => {
      if (r.status === 'fulfilled') results.ok.push(r.value);
      else results.fail.push({ name: batch[i].filename, err: r.reason?.message });
    });

    if (s + MAX_CONCURRENCY < NEWS.length) {
      await new Promise(r => setTimeout(r, COOLDOWN_MS));
    }
  }

  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n🎉 完成 ${sec}s | 成功 ${results.ok.length} 失败 ${results.fail.length} | ${targetDir}`);
  if (results.fail.length) console.log(`❌ ${results.fail.map(f => f.name).join(', ')}`);
  if (results.fail.length === 0 && results.ok.length === NEWS.length && os.platform() === 'darwin')
    exec(`open "${targetDir}"`);
}

main().catch(console.error);
