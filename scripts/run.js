const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

const CONFIG = {
  // 默认使用 baoyu-image-gen，可通过环境变量覆盖
  imageGenCommand: process.env.GREEN_BOOK_IMAGE_GEN_CMD || `npx -y bun ${path.join(os.homedir(), '.agents/skills/baoyu-image-gen/scripts/main.ts')} --prompt "{{PROMPT}}, editorial illustration style, 16:9, cinematic lighting, 4k" --image "{{OUTPUT}}" --ar 16:9 --quality 2k`,
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
  const command = CONFIG.imageGenCommand
    .replace('{{PROMPT}}', prompt.replace(/"/g, '\\"'))
    .replace('{{OUTPUT}}', generatedImagePath.replace(/"/g, '\\"'));

  console.log('   🎨 未找到本地素材，开始使用 AI 生图...');
  runCommand(command);

  if (!fs.existsSync(generatedImagePath)) {
    throw new Error(`AI illustration was not generated: ${generatedImagePath}`);
  }

  return { path: generatedImagePath, isAiGenerated: true };
}

const NEWS = [
  {
    coverTitle: '拒绝监控与自主武器\nAnthropic 硬刚战争部！',
    headerTitle: '拒绝监控与自主武器\nAnthropic 硬刚战争部！',
    summary: '美国战争部长近日宣布将 Anthropic 列为"国家安全供应链风险实体"，指责其模型在拒绝提供监控接口方面存在合规漏洞。Anthropic 随后提起诉讼，坚称其宪法 AI 框架严禁用于自主武器开发及非对称监控任务。这场诉讼标志着硅谷巨头与政府在 AI 伦理底线上的公开决裂。专家指出，技术自主权与国家安全边界的博弈，将决定 2026 年后全球 AI 治理的基础逻辑。',
    visualKeywords: 'AI robot facing military authority courtroom battle, minimalist illustration',
    filename: '01-anthropic'
  },
  {
    coverTitle: '众擎URKL格斗机器人\n启动全球招募首秀',
    headerTitle: '众擎URKL人形机器人自由格斗联赛\n正式启动全球招募',
    summary: '众擎机器人正式发布 URKL 人形机器人自由格斗联赛招募令，旨在通过极高强度的实战对抗检验人形机器人的地形适应性与动态平衡算法。本次联赛将采用全自主导航与战术决策模式，机器人需在复杂模拟战场中执行格斗与避障任务。作为具身智能领域的顶级赛事，URKL 不仅是硬件性能的博弈，更是对大模型驱动下实时物理反馈能力的最高规格实测，吸引了全球数家顶尖实验室参与。',
    visualKeywords: 'Humanoid robots fighting in a high-tech arena, dynamic action pose, cinematic sparks, editorial illustration',
    filename: '02-urkl-battle'
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
