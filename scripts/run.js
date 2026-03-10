const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

const CONFIG = {
  imageGenCommand: `npx -y bun ${path.join(os.homedir(), '.agents/skills/baoyu-image-gen/scripts/main.ts')} --prompt "{{PROMPT}}, editorial illustration style, 16:9, cinematic lighting, 4k" --image "{{OUTPUT}}" --ar 16:9 --quality 2k`,
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
  // ... (保持之前的新闻数据不变)
  {
    coverTitle: 'PC-Master AI\nGPT-5.4 开启原生控屏',
    headerTitle: 'GPT-5.4 原生操控电脑',
    summary: 'OpenAI 正式发布 GPT-5.4，标志着“智能体”时代的重大突破。该模型具备革命性的“原生电脑控制”能力，能像人类一样理解屏幕视觉元素并操作键盘鼠标，直接执行复杂工作流。这标志着 AI 从简单的对话框工具进化为全能助手，彻底重塑了 2026 年的人机交互格局。',
    visualKeywords: 'AI assistant controlling a laptop screen, futuristic dashboard, neural networks, digital workspace, autonomous software interaction',
    filename: '01-gpt54'
  },
  {
    coverTitle: 'MacBook Neo\n苹果首款入门级笔电',
    headerTitle: '苹果首款入门级笔电 MacBook Neo',
    summary: '苹果本周发布了入门级笔电 MacBook Neo。为了应对产能受限及 A19 Pro 供应紧张，Neo 采用了优化后的前代芯片，将起售价控制在 600 美元左右。这一战略转型标志着苹果开始通过高性价比策略下探学生及初级职场市场，凭借完整的 macOS 生态吸引大量传统 PC 用户转投阵营。',
    visualKeywords: 'Sleek minimalist silver laptop, colorful macOS interface, modern industrial design, students studying, Apple ecosystem',
    filename: '02-macbook-neo'
  },
  {
    coverTitle: 'Blood Moon 2026\n罕见月全食震撼全球',
    headerTitle: '罕见月全食震撼全球：2026 血月',
    summary: '本周，被称为“2026 血月”的月全食席席卷全球。由于瑞利散射作用，月面呈现出深邃的古铜红色。此次月食因持续时间长、覆盖范围广而备受瞩目，不仅在社交媒体引发全球狂欢，也激发了公众对太空探索的热情。随着阿提米丝计划的推进，此类现象正成为未来月球基地建设的重要观测节点。',
    visualKeywords: 'Deep red full moon, starry night sky, silhouette of mountains, astronomical phenomenon, telescope view, nebula background',
    filename: '03-blood-moon'
  },
  {
    coverTitle: 'AI vs Pentagon\nAnthropic 硬刚五角大楼',
    headerTitle: 'Anthropic 对决五角大楼：安全风险之争',
    summary: 'Anthropic 宣布对美国国防部提起诉讼，回击被列为“国家安全供应链风险实体”的认定。这一认定直接威胁其商业版图，根源在于双方对 AI 系统军事控制权及数据透明度的长期博弈。这场硅谷巨头与国家机器的对决，折射出超级智能时代下，技术自主权与国家安全之间的深刻摩擦。',
    visualKeywords: 'Legal documents, gavel, circuit board pattern, government building, data security, high-stakes negotiation',
    filename: '04-anthropic-pentagon'
  },
  {
    coverTitle: 'Private Screen\nS26 Ultra 隐私屏黑科技',
    headerTitle: '三星 S26 Ultra 隐私屏黑科技',
    summary: '三星发布 Galaxy S26 Ultra 旗舰手机，首度搭载硬件级“宽窄视角切换”防窥屏幕。用户可一键开启物理滤镜，将可视角度限制在 30 度以内，从物理层面杜绝了公共场所的“视觉窃听”。在数字化隐私日益稀缺的 2026 年，这一创新成功树立了移动硬件安全的新标杆。',
    visualKeywords: 'Smartphone with a glowing screen, privacy filter effect, futuristic mobile device, biometric security, sleek glass body',
    filename: '05-s26-ultra'
  }
];

async function main() {
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
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

    console.log(`\n📌 [${i+1}/5] 生成内页: ${news.headerTitle}`);
    const { path: illustrationPath, isAiGenerated } = resolveIllustrationPath(news, targetDir, forceAiImage);

    await screenshot(innerHTML(news.headerTitle, news.summary, toBase64(illustrationPath)), innerPath);
    console.log(`   ✅ 合成完成`);
  }

  console.log(`\n🎉 任务结束！`);
  execSync(`open "${targetDir}"`);
}

main().catch(console.error);
