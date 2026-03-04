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
    coverTitle: 'Sora正式版泄露\n好莱坞陷入恐慌',
    headerTitle: 'Sora正式版泄露！好莱坞恐慌',
    summary: '测试数据',
    filename: '02-sora'
  },
  {
    coverTitle: '硬刚英伟达\n国产算力突破',
    headerTitle: '硬刚英伟达！算力突破',
    summary: '测试数据',
    filename: '03-chips'
  },
  {
    coverTitle: 'GPT-5内部评测流出\n奥特曼：智力大跃迁',
    headerTitle: 'GPT-5内评流出！智力跃迁',
    summary: '测试数据',
    filename: '04-gpt5'
  },
  {
    coverTitle: '机器人觉醒时刻\n众擎开启陪护',
    headerTitle: '机器人觉醒！众擎陪护',
    summary: '测试数据',
    filename: '05-robot'
  },
  {
    coverTitle: 'AI杀入短视频\n千万网红失业',
    headerTitle: 'AI杀短视频！网红失业',
    summary: '测试数据',
    filename: '06-influencer'
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

  execSync(`open "${outDir}"`);
}

main().catch(console.error);
