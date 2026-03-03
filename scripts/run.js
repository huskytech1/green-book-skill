const { coverHTML, innerHTML, screenshot, toBase64 } = require('./generate.js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..');
const SKILL_DIR_GEN = path.join(os.homedir(), '.agents/skills/baoyu-image-gen');

const ASSETS_DIR = path.join(SKILL_DIR, 'assets');

// ===== 新闻数据（确认后的正式版本）=====
const NEWS = [
  {
    coverTitle: '众擎URKL人形机器人\n格斗联赛正式启动',
    headerTitle: '众擎URKL人形机器人自由格斗联赛\n正式启动全球招募',
    summary: '众擎URKL人形机器人自由格斗联赛是面向全球高校、企业及科研机构的顶级竞技赛事，以"众擎"人形机器人为标准载体，聚焦运动控制、平衡算法、感知决策等核心技术。赛事采用海选审核、分组循环赛与单败淘汰赛复合赛制，最终产生16支正赛队伍角逐冠军。前16强可获T800机器人归属权，前8强成员享受众擎机器人专属OFFER绿色通道，冠军奖励价值高达1000万元。',
    visualKeywords: 'Humanoid robot combat league arena, high-tech fighting robots, dramatic stage lighting, futuristic competition',
    localImage: path.join(ASSETS_DIR, 'news1-urkl.png'),
    filename: '02-urkl-robot'
  },
  {
    coverTitle: '小米机器人\n正式上产线',
    headerTitle: '小米机器人正式上产线\n五年内有望大规模落地应用',
    summary: '在MWC 2026期间，小米总裁卢伟冰透露，两台小米人形机器人已在汽车产线连续工作三小时，达到90%准确率。他表示，此次测试是机器人从实验室走向产线的"实习"，预计未来五年内机器人大规模进入小米产线具有很大可能性。此外，小米2026年将发布一款集自研芯片、自研OS、自研AI大模型于一体的终端产品。',
    visualKeywords: 'Xiaomi humanoid robot on factory production line, automotive manufacturing, robotic arm precision work, industrial future',
    localImage: path.join(ASSETS_DIR, 'news2-xiaomi.png'),
    filename: '03-xiaomi-robot'
  },
  {
    coverTitle: '美团浏览器 Tabbit\n涉嫌抄袭开源项目',
    headerTitle: '美团AI浏览器Tabbit\n涉嫌抄袭开源插件陪读蛙源码',
    summary: '美团旗下光年之外团队开发的首款AI浏览器Tabbit，于3月2日开启免费公测，支持"智能代理模式"。然而，前字节工程师"梦溪睡了吗"随即公开指控Tabbit抄袭其开源项目陪读蛙（Read Frog）——两者UI设计相似、快捷键组合完全一致，且Tabbit源码中直接包含"read-frog"字符串。陪读蛙采用GPL-3.0协议，要求衍生作品必须同样开源，Tabbit未开源显然违反该协议。',
    visualKeywords: 'Browser plagiarism code theft open source license dispute, developer angry keyboard laptop, legal document copyright',
    localImage: path.join(ASSETS_DIR, 'news3-meituan.png'),
    filename: '04-meituan-tabbit'
  },
  {
    coverTitle: '讯飞AI眼镜亮相MWC 2026\n竟然还能唇动识别？',
    headerTitle: '讯飞AI眼镜MWC 2026首秀\n支持唇动识别破噪翻译',
    summary: '科大讯飞于MWC 2026展会首次展出"讯飞AI眼镜"。整机仅重40克，比主流同类产品轻约20%。核心功能为实时跨语言翻译，译文以字幕形式投影于镜片，结合扬声器双向播报。首创"唇动识别"多模态降噪方案，通过摄像头捕捉唇部动作并融合骨传导麦克风，在高噪声环境下识别准确率提升50%以上。',
    visualKeywords: 'AI smart glasses lip reading translation technology, futuristic wearable MWC expo, real-time subtitle projection',
    localImage: path.join(ASSETS_DIR, 'news4-iflytek.png'),
    filename: '05-iflytek-glasses'
  },
  {
    coverTitle: 'GPT-5.4意外泄露\n200万超长上下文',
    headerTitle: 'GPT-5.4意外泄露\n200万超长上下文与状态化AI',
    summary: 'OpenAI工程师意外将未发布的"gpt-5.4"型号提交至公开代码仓库，引发技术圈热议。泄露信息显示，GPT-5.4将提供高达200万Token的超长上下文窗口，并引入"状态化AI"能力——可跨会话保留工作流与项目背景，彻底告别每次对话"失忆"困境。还支持原始字节级图像读取，实现像素级识别。OpenAI随后强制覆盖相关代码，但业界普遍认为这是面向自主Agent时代的代际越级升级。',
    visualKeywords: 'GPT AI model leak secret document, massive context window neural network, futuristic data stream code reveal',
    filename: '06-gpt54-leak'
  }
];

async function main() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const date = `${mm}${dd}`;

  // 查找下一个可用版本号
  let version = 1;
  const os = require('os');
const baseDownloads = path.join(os.homedir(), 'Downloads');
  while (fs.existsSync(path.join(baseDownloads, `智造三点三 ${date}V${version}`))) {
    version++;
  }
  const outDirName = `智造三点三 ${date}V${version}`;
  const outDir = path.join(baseDownloads, outDirName);
  const tmpDir = `/tmp/smart-news-html-${date}`;
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // ===== 1. 生成封面图 =====
  console.log('\n📌 生成封面图（HTML 精确渲染）...');
  const coverTitles = NEWS.map(n => n.coverTitle);
  const coverHtml = coverHTML(coverTitles);
  const coverPath = `${outDir}/01-cover.png`;
  await screenshot(coverHtml, coverPath);
  console.log(`✅ 封面图已生成: ${coverPath}`);

  // ===== 2. 逐页生成内页图 =====
  for (let i = 0; i < NEWS.length; i++) {
    const news = NEWS[i];
    console.log(`\n📌 生成第 ${i + 2} 张：${news.filename}`);

    let bgBase64 = '';
    if (news.localImage && fs.existsSync(news.localImage)) {
      console.log(`  📸 使用素材图: ${news.localImage}`);
      bgBase64 = toBase64(news.localImage);
    } else {
      let bgPath = `${tmpDir}/bg-${news.filename}.png`;
      const prompt = `16:9 ratio, cinematic wide illustration, high quality digital art. ${news.visualKeywords}. Vivid colors, dramatic lighting, rich details, no text, no watermark, no logo. Professional editorial illustration style, suitable for tech news magazine.`;
      
      try {
        execSync(
          `npx -y bun ${SKILL_DIR_GEN}/scripts/main.ts --prompt "${prompt}" --image "${bgPath}" --ar 16:9`,
          { stdio: 'inherit' }
        );
        bgBase64 = toBase64(bgPath);
      } catch (e) {
        console.error(`  ❌ AI 生图失败，将跳过内页生成或使用占位图`);
        continue;
      }
    }

    // 合成内页 HTML
    const pageHtml = innerHTML(news.headerTitle, news.summary, bgBase64);
    await screenshot(pageHtml, `${outDir}/${news.filename}.png`);
  }

  console.log(`\n✅ 全部生成完毕！`);
  console.log(`📂 存放路径：${outDir}`);
  execSync(`open "${outDir}"`);
}

main().catch(console.error);
