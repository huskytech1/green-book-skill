const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

const CONFIG = {
  // 优先：Gemini Web 方案 (免 API Key，稳定性高)
  geminiWebCommand: process.env.GREEN_BOOK_GEMINI_WEB_CMD || `npx -y bun ${path.join(os.homedir(), '.agents/skills/baoyu-danger-gemini-web/scripts/main.ts')} --prompt "{{PROMPT}}, editorial illustration style, 16:9, cinematic lighting, 4k" --image "{{OUTPUT}}"`,
  
  // 备选：标准 API 方案
  baoyuImageGenCommand: process.env.GREEN_BOOK_IMAGE_GEN_CMD || `npx -y bun ${path.join(os.homedir(), '.agents/skills/baoyu-image-gen/scripts/main.ts')} --prompt "{{PROMPT}}, editorial illustration style, 16:9, cinematic lighting, 4k" --image "{{OUTPUT}}" --ar 16:9 --quality 2k`,
};

function runCommand(command) {
  execSync(command, { stdio: 'inherit' });
}

function resolveIllustrationPath(news, targetDir, forceAiImage) {
  const hasLocalImage = news.localImage && fs.existsSync(news.localImage) && !forceAiImage;
  if (hasLocalImage) {
    return { path: news.localImage, isAiGenerated: false };
  }

  const generatedImagePath = path.join(targetDir, `ill-${news.filename}.png`);
  const prompt = `${news.visualKeywords}. News illustration, clean editorial composition, no text, no watermark`;
  
  console.log('   🎨 未找到本地素材，开始使用 AI 生图...');

  // 尝试第一引擎：Gemini Web
  try {
    console.log('   🚀 正在使用 Gemini Web 引擎...');
    const command = CONFIG.geminiWebCommand
      .replace('{{PROMPT}}', prompt.replace(/"/g, '\\"'))
      .replace('{{OUTPUT}}', generatedImagePath.replace(/"/g, '\\"'));
    runCommand(command);
  } catch (err) {
    console.warn('   ⚠️  Gemini Web 引擎执行失败，尝试备选引擎...');
    // 尝试第二引擎：Baoyu Image Gen
    const command = CONFIG.baoyuImageGenCommand
      .replace('{{PROMPT}}', prompt.replace(/"/g, '\\"'))
      .replace('{{OUTPUT}}', generatedImagePath.replace(/"/g, '\\"'));
    runCommand(command);
  }

  if (!fs.existsSync(generatedImagePath)) {
    throw new Error(`AI illustration was not generated: ${generatedImagePath}`);
  }

  return { path: generatedImagePath, isAiGenerated: true };
}

const NEWS = [
  {
    coverTitle: '拒绝监控与自主武器\nAnthropic 硬刚战争部！',
    headerTitle: '拒绝监控与自主武器\nAnthropic 硬刚战争部！',
    summary: '示例摘要：这里填入约 150-170 字的新闻深度提炼。内容需保持高密度与专业性，确保在思源黑体下排版美观。',
    visualKeywords: 'AI robot facing military authority courtroom battle, minimalist illustration',
    filename: '01-example'
  },
  {
    coverTitle: '示例新闻标题二\n合理断句保持视觉平衡',
    headerTitle: '示例新闻标题二：这里是表头',
    summary: '示例摘要二：支持 \n 换行符以优化视觉对齐。摘要严格控制字数以达到最佳阅读体验。',
    visualKeywords: 'Humanoid robot showroom, clean futuristic interior, editorial illustration',
    filename: '02-example'
  }
];

async function main() {
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  // 默认保存到用户 Pictures 目录，可通过环境变量 GREEN_BOOK_OUTPUT_DIR 自定义
  const baseOutputDir = process.env.GREEN_BOOK_OUTPUT_DIR || path.join(os.homedir(), 'Pictures', 'green-book');
  const forceAiImage = process.env.GREEN_BOOK_FORCE_AI_IMAGES === '1';
  fs.mkdirSync(baseOutputDir, { recursive: true });

  // --- 智能目录决策逻辑 ---
  let targetDir = '';
  let v = 1;
  let lastIncompleteDir = '';

  // 扫描所有已存在的当天目录
  while (true) {
    const checkPath = path.join(baseOutputDir, `智造三点三 ${date}V${v}`);
    if (!fs.existsSync(checkPath)) break;

    const files = fs.readdirSync(checkPath);
    const isComplete = files.some(f => f.startsWith('06-') && f.endsWith('.png'));
    
    if (!isComplete) {
      lastIncompleteDir = checkPath; // 找到一个没干完的活
      break; 
    }
    v++;
  }

  if (lastIncompleteDir) {
    targetDir = lastIncompleteDir;
    console.log(`\n🔄 检测到未完成任务，正在断点续传: ${path.basename(targetDir)}`);
  } else {
    targetDir = path.join(baseOutputDir, `智造三点三 ${date}V${v}`);
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`\n🆕 开启新任务: ${path.basename(targetDir)}`);
  }

  // --- 生成逻辑 ---
  // 封面
  const coverPath = path.join(targetDir, '01-cover.png');
  if (!fs.existsSync(coverPath)) {
    console.log('📌 生成封面图...');
    await screenshot(coverHTML(NEWS.map(n => n.coverTitle)), coverPath);
  }

  // 内页
  for (let i = 0; i < NEWS.length; i++) {
    const news = NEWS[i];
    const innerPath = path.join(targetDir, `0${i+2}-${news.filename}.png`);
    
    if (fs.existsSync(innerPath)) {
      console.log(`⏭️  已跳过: ${news.headerTitle}`);
      continue;
    }

    console.log(`\n📌 [${i+1}/${NEWS.length}] 生成内页: ${news.headerTitle}`);
    const { path: illustrationPath, isAiGenerated } = resolveIllustrationPath(news, targetDir, forceAiImage);

    await screenshot(innerHTML(news.headerTitle, news.summary, toBase64(illustrationPath)), innerPath);
    console.log(`   ✅ 合成完成`);
  }

  console.log(`\n🎉 任务结束！图片已保存至: ${targetDir}`);
  if (os.platform() === 'darwin') {
    try { execSync(`open "${targetDir}"`); } catch (e) {}
  }
}

main().catch(console.error);
