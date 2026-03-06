const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_DIR = path.join(__dirname, '..');
const SKILL_DIR_GEN = path.join(os.homedir(), '.agents/skills/baoyu-image-gen');

const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

// ===== 新闻数据（确认后的正式版本）=====
const NEWS = [
  {
    coverTitle: 'Win版Codex发布\n今日开启重磅公测',
    headerTitle: 'OpenAI发布Win版Codex \n 160万开发者已抢先体验',
    summary: 'OpenAI正式推出Windows版Codex，首周Mac版下载量即破百万。该工具将编程从“手动辅助”转向“智能代理”，支持多智能体异步运行与自动化任务委派。其原生沙箱环境确保了在Windows环境下的高效安全运行，重新定义了软件构建方式。',
    localImage: path.join(ASSETS_DIR, 'news1-openai-codex.png'),
    filename: '01-codex'
  },
  {
    coverTitle: '单个策略掌握极限\n宇树G1机器人封神',
    headerTitle: '宇树机器人再次进化 \n 单个策略掌握极限动作',
    summary: '宇树科技联合BIGAI等机构发布OmniXtreme框架，首次实现人形机器人单个通用策略下的连续翻转、极限平衡等高动态动作。通过基于流的生成控制策略与驱动感知残差强化学习，突破了泛化壁垒，成功率达91%，标志着具身智能控制的重大飞跃。',
    localImage: path.join(ASSETS_DIR, 'news2-unitree-robot.png'),
    filename: '02-unitree'
  },
  {
    coverTitle: '甄子丹亲口认输\n我打不过机器人！',
    headerTitle: '甄子丹直言打不过机器人 \n 两会聚焦具身智能安全',
    summary: '武打明星甄子丹在两会期间感叹春晚机器人表演震撼，直言格斗可能“打不过”它们。与此同时，周鸿祎、齐向东等委员提案均聚焦具身智能与AI安全。随着机器人能力激增，如何在安全驱动下健康发展成为今年两会关注的科技热点。',
    localImage: path.join(ASSETS_DIR, 'news3-donnie-yen.png'),
    filename: '03-donnie'
  },
  {
    coverTitle: '4599元苹果掀桌\nNeo首搭手机芯片',
    headerTitle: '史上最便宜MacBook Neo \n 首搭iPhone手机芯片发布',
    summary: '苹果发布全新MacBook Neo，起售价4599元，创历史新低。该机型首次搭载iPhone上的A18 Pro芯片，采用13英寸Liquid视网膜大屏，具备无风扇静音设计与长效续航。主打学生党与轻办公人群，将于3月11日正式开售，重塑入门级笔电市场。',
    localImage: path.join(ASSETS_DIR, 'news4-macbook-neo.png'),
    filename: '04-macbook'
  },
  {
    coverTitle: '全球首个双4S店\n买车顺便带走机器人',
    headerTitle: '全球首个双4S模式落地 \n 机器人跨界入驻奔驰展厅',
    summary: '全球首个以“双4S融合模式”打造的机器人体验店“机械伊甸”在北京开业，实现了机器人与汽车4S店的深度跨界。通过共享展厅资源，机器人得以在真实商业环境中提供导览互动，进店客流环比提升15%，为具身智能落地提供了可复制的新路径。',
    localImage: path.join(ASSETS_DIR, 'news5-robot-4s.png'),
    filename: '05-4s'
  }
];

async function main() {
  const os = require('os');
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const date = `${mm}${dd}`;

  // 查找下一个可用版本号
  let version = 1;
  const baseDownloads = path.join(os.homedir(), 'Downloads');
  while (fs.existsSync(path.join(baseDownloads, `智造三点三 ${date}V${version}`))) {
    version++;
  }
  const outDirName = `智造三点三 ${date}V${version}`;
  const outDir = path.join(baseDownloads, outDirName);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // ===== 1. 生成封面图 =====
  console.log('\n📌 生成封面图（HTML 精确渲染）...');
  const coverTitles = NEWS.map(n => n.coverTitle);
  const coverHtml = coverHTML(coverTitles);
  const coverPath = `${outDir}/01-cover.png`;
  await screenshot(coverHtml, coverPath);
  console.log(`✅ 封面图已生成: ${coverPath}`);

    // ===== 2. 生成内页图 =====
  for (let i = 0; i < NEWS.length; i++) {
    const news = NEWS[i];
    console.log(`\n📌 [${i+1}/5] 生成内页: ${news.headerTitle}`);
    
    // 如果没有本地图片，则生成 AI 图片
    let illustrationPath = (news.localImage && fs.existsSync(news.localImage)) ? news.localImage : null;
    let isAiGenerated = false;
    
    if (!illustrationPath) {
      console.log(`   🎨 未提供素材或路径无效，正在通过 AI 生成插图: ${news.visualKeywords}`);
      // 使用更通用的 bun run main.ts 方式，并适配 baoyu-image-gen 的参数名 --image
      const imageGenCmd = `npx -y bun ${path.join(SKILL_DIR_GEN, 'scripts/main.ts')} --prompt "${news.visualKeywords}, editorial illustration style, 16:9, cinematic lighting, 4k" --image "${outDir}/temp_${news.filename}.png" --ar 16:9 --quality 2k`;
      try {
        execSync(imageGenCmd);
        illustrationPath = `${outDir}/temp_${news.filename}.png`;
        isAiGenerated = true;
      } catch (e) {
        console.error('   ❌ AI 生图失败，将跳过图片生成', e.message);
      }
    } else {
      console.log(`   📸 使用本地素材: ${illustrationPath}`);
    }

    const innerHtml = innerHTML(news.headerTitle, news.summary, illustrationPath ? toBase64(illustrationPath) : '');
    const innerPath = `${outDir}/0${i+2}-${news.filename}.png`;
    await screenshot(innerHtml, innerPath);
    console.log(`   ✅ 已合成: ${innerPath}`);
    
    // 仅清理本次 AI 生成的临时图片
    if (isAiGenerated && illustrationPath && fs.existsSync(illustrationPath)) {
      fs.unlinkSync(illustrationPath);
    }
  }

  execSync(`open "${outDir}"`);
}

main().catch(console.error);
