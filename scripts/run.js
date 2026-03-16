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
    coverTitle: '315揭露GEO乱象\nAI投毒操控大模型答案',
    headerTitle: '315晚会曝光GEO乱象\nAI“投毒”操控大模型答案',
    summary: '2026年315晚会重磅曝光“生成式引擎优化”（GEO）滥用乱象。力擎GEO等黑产公司利用AI“投毒”技术，通过海量虚假数据干预大模型搜索结果，诱导DeepSeek、通义千问等主流模型将虚构产品列为推荐首选，甚至精准抹黑竞品。此举严重污染了AI信息源，导致消费者面临巨大误导风险。市场监管总局已开展专项彻查，拟将AI虚假宣传纳入重点监管，要求大模型厂商强化语料清洗与溯源，重塑行业公信力。',
    visualKeywords: 'AI robot poisoning a glowing digital brain, hacker theme, neon circuitry, cinematic lighting, editorial illustration',
    filename: '01-315-geo'
  },
  {
    coverTitle: '河南首家人形机器人4S店\n以租代购商业化再提速',
    headerTitle: '河南首家人形机器人4S店\n“以租代购”商业化提速',
    summary: '河南首家人形机器人4S店在郑州正式启幕，借鉴汽车行业模式，提供销售、租赁及模型迭代等全方位服务。店内汇聚宇树、智元、乐聚等领军企业产品。自春晚走红后，该店租赁业务极度火热，多款机器人广泛应用于商超迎宾、景区互动等场景，有效降低了企业方的技术尝试门槛。专家认为，该模式成功打通了研发与消费端的“最后一公里”，通过“以租代购”灵活策略，正加速推动具身智能未来产业步入商业化快车道。',
    visualKeywords: 'Humanoid robot showroom in Zhengzhou, 4S store layout, clean futuristic interior, interaction with customers, editorial illustration',
    filename: '02-henan-4s'
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
