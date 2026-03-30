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
const FORCE_AI_IMAGES = process.env.GREEN_BOOK_FORCE_AI_IMAGES === '1';
const NEWS_FILE = process.env.GREEN_BOOK_NEWS_FILE || path.join(__dirname, 'news.js');

const MAX_RETRIES = 3;

function getIllustrationPrompt(keywords) {
  return `${keywords}, digital illustration, editorial style`;
}

function normalizeLen(text) {
  return String(text || '').replace(/\s+/g, '').length;
}

function getLines(text) {
  return String(text || '').split('\n').map((line) => line.trim());
}

function validateLineLengths(text, maxLen, fieldName, filename) {
  const lines = getLines(text);
  if (lines.length > 2) {
    throw new Error(`${filename}: ${fieldName} must be one or two lines`);
  }

  for (const line of lines) {
    if (!line) {
      throw new Error(`${filename}: ${fieldName} contains an empty line`);
    }
    if (normalizeLen(line) > maxLen) {
      throw new Error(`${filename}: ${fieldName} line exceeds ${maxLen} chars -> ${line}`);
    }
  }
}

function loadNews() {
  const resolvedPath = path.resolve(NEWS_FILE);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`News data file not found: ${resolvedPath}`);
  }

  delete require.cache[require.resolve(resolvedPath)];
  const news = require(resolvedPath);
  if (!Array.isArray(news) || news.length === 0) {
    throw new Error(`News data must export a non-empty array: ${resolvedPath}`);
  }

  return { news, resolvedPath };
}

function validateNews(news) {
  if (!news.filename) {
    throw new Error(`News item is missing filename`);
  }

  if (!/^[a-z0-9-]+$/.test(news.filename)) {
    throw new Error(`${news.filename}: filename must be kebab-case`);
  }

  if (!news.coverTitle || normalizeLen(news.coverTitle) > 20) {
    throw new Error(`${news.filename}: coverTitle must be 20 chars or fewer`);
  }
  validateLineLengths(news.coverTitle, 11, 'coverTitle', news.filename);

  if (!news.headerTitle) {
    throw new Error(`${news.filename}: headerTitle is required`);
  }
  if (normalizeLen(news.headerTitle) > 24) {
    throw new Error(`${news.filename}: headerTitle should stay around 20 chars`);
  }
  validateLineLengths(news.headerTitle, 24, 'headerTitle', news.filename);

  const summaryLen = normalizeLen(news.summary);
  if (summaryLen < 120 || summaryLen > 150) {
    throw new Error(`${news.filename}: summary must be 120-150 chars, got ${summaryLen}`);
  }

  if (!FORCE_AI_IMAGES && news.uploadedImage && !fs.existsSync(news.uploadedImage)) {
    throw new Error(`${news.filename}: uploadedImage not found at ${news.uploadedImage}`);
  }

  if (!news.uploadedImage && !news.visualKeywords) {
    throw new Error(`${news.filename}: visualKeywords is required when uploadedImage is missing`);
  }
}

async function generateIllustration(news, targetDir) {
  if (!FORCE_AI_IMAGES && news.uploadedImage) {
    return { path: news.uploadedImage, generated: false };
  }

  const outPath = path.join(targetDir, `ill-${news.filename}.png`);
  if (fs.existsSync(outPath)) return { path: outPath, generated: true };

  const prompt = getIllustrationPrompt(news.visualKeywords);
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const p = attempt >= 2 ? `${news.visualKeywords}, illustration` : prompt;
      let cmd;
      
      if (IMAGE_BACKEND === 'jimeng') {
        cmd = `bun "${JIMENG_WEB_SCRIPT}" --prompt "${p.replace(/"/g, '\\"')}" --ratio "3:4" --output "${outPath}"`;
      } else {
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

async function main() {
  const { news: NEWS, resolvedPath } = loadNews();
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const baseOutput = process.env.GREEN_BOOK_OUTPUT_DIR || DEFAULT_OUTPUT;
  const targetDir = path.join(baseOutput, `san-dian-san-${date}`);

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  console.log(`\n🎨 生成小绿书 | 数据: ${resolvedPath} | 输出: ${targetDir}`);
  const t0 = Date.now();

  const results = { ok: [], fail: [] };
  const renderedPages = [];

  for (const news of NEWS) {
    try {
      validateNews(news);
      console.log(`📌 处理内容: ${news.filename}`);
      const { path: imgPath, generated } = await generateIllustration(news, targetDir);
      const innerPath = path.join(targetDir, `${news.filename}.png`);
      const html = innerHTML(news.headerTitle, news.summary, toBase64(imgPath));
      await screenshot(html, innerPath);
      if (generated) {
        console.log(`   🖼️ AI配图 -> ${imgPath}`);
      } else {
        console.log(`   🖼️ 本地配图 -> ${imgPath}`);
      }
      console.log(`   ✅ ${news.filename} -> ${innerPath}`);
      results.ok.push(news.filename);
      renderedPages.push(news);
    } catch (err) {
      console.error(`   ❌ ${news.filename}: ${err.message}`);
      results.fail.push({ name: news.filename, err: err.message });
    }
  }

  if (renderedPages.length) {
    const coverPath = path.join(targetDir, 'cover.png');
    await screenshot(coverHTML(renderedPages.map((item) => item.coverTitle)), coverPath);
    console.log(`📗 封面已生成 -> ${coverPath}`);
  }

  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n🎉 完成 ${sec}s | 成功 ${results.ok.length} 失败 ${results.fail.length} | ${targetDir}`);
  if (results.fail.length) console.log(`❌ ${results.fail.map(f => f.name).join(', ')}`);
  if (results.fail.length === 0 && results.ok.length === NEWS.length && os.platform() === 'darwin')
    exec(`open "${targetDir}"`);
}

main().catch(console.error);
