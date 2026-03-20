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
      const cmd = `bun "${GEMINI_WEB_SCRIPT}" --model ${GEMINI_WEB_MODEL} --prompt "${p.replace(/"/g, '\\"')}" --image "${outPath}"`;
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
  // 示例数据：实际使用时替换为真实新闻
  {
    coverTitle: "示例封面标题第一行\n示例封面标题第二行",
    headerTitle: "示例内页标题第一行\n示例内页标题第二行",
    summary: "这里是120-150字的新闻摘要示例。请替换为真实新闻内容，确保字数在要求范围内，格式正确。新闻摘要需要简洁明了，涵盖核心信息，便于读者快速理解内容要点。所有内容需要符合小绿书排版规范。",
    visualKeywords: "example, illustration, generic, placeholder",
    filename: "example"
  },
  {
    coverTitle: "示例封面标题第一行\n示例封面标题第二行",
    headerTitle: "示例内页标题第一行\n示例内页标题第二行",
    summary: "这里是120-150字的新闻摘要示例。请替换为真实新闻内容，确保字数在要求范围内，格式正确。新闻摘要需要简洁明了，涵盖核心信息，便于读者快速理解内容要点。所有内容需要符合小绿书排版规范。",
    visualKeywords: "example, illustration, generic, placeholder",
    filename: "example2"
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
