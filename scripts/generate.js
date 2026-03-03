const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const LOGO_PATH = path.join(ASSETS_DIR, 'logo.png');
const COVER_PATH = path.join(ASSETS_DIR, 'cover-template.png');

// 将图片转为 base64
function toBase64(filePath) {
  const ext = path.extname(filePath).slice(1).replace('jpg', 'jpeg');
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

// 封面图 HTML - 最终像素级对齐版
function coverHTML(titles) {
  const logoBase64 = toBase64(LOGO_PATH);
  const coverBase64 = toBase64(COVER_PATH);
  
  // 物理坐标：徽章中心 Y 对齐（模板 1080x1440 → 渲染 900x1200）
  // 徽章中心(缩放后): 326, 478, 631, 783, 938
  // 文字首行需与徽章垂直居中对齐：top = center - lineHeight/2
  const positions = [295, 447, 600, 752, 907]; 

  const items = titles.map((t, i) => {
    const lines = t.split('\n');
    return `
      <div class="item" style="top: ${positions[i]}px">
        <div class="title">${lines.map(l => `<span>${l}</span>`).join('')}</div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 900px; height: 1200px;
    font-family: 'Source Han Sans SC VF', 'Source Han Sans CN', 'Noto Sans SC', sans-serif;
    position: relative; overflow: hidden;
    background-image: url('${coverBase64}');
    background-size: cover; background-position: center;
  }
  .logo { 
    position: absolute; top: 120px; left: 50%; transform: translateX(-50%);
    width: 310px; z-index: 10;
  }
  .item {
    position: absolute; left: 320px; 
    width: 540px; height: 120px;
    display: flex; align-items: flex-start;
  }
  .title {
    font-size: 33px; font-weight: 600; color: #333;
    line-height: 1.3; display: flex; flex-direction: column;
    text-align: left;
  }
  .title span { display: block; white-space: nowrap; }
</style>
</head><body>
  <img class="logo" src="${logoBase64}" />
  <div class="container">${items}</div>
</body></html>`;
}

// 内页图 HTML
function innerHTML(title, summary, illustrationBase64) {
  const logoBase64 = toBase64(LOGO_PATH);
  const coverBase64 = toBase64(COVER_PATH);
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 900px; height: 1200px;
    font-family: 'Source Han Sans SC VF', 'Source Han Sans CN', 'Noto Sans SC', sans-serif;
    position: relative; overflow: hidden; background: #d4c9a8;
  }
  .bg { position: absolute; inset: 0; background-image: url('${coverBase64}'); background-size: cover; filter: brightness(0.92); }
  .clip { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 36px; background: #8a8a8a; border-radius: 0 0 8px 8px; z-index: 10; }
  .paper { position: absolute; top: 40px; left: 48px; right: 48px; bottom: 48px; background: white; border-radius: 4px; box-shadow: 2px 4px 16px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; z-index: 5; }
  .header { background: #1565C0; height: 130px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; padding: 0 36px; }
  .header-title { color: white; font-size: 34px; font-weight: 700; text-align: center; line-height: 1.55; white-space: pre-line; }
  .illustration { width: 100%; height: 456px; object-fit: cover; flex-shrink: 0; }
  .content { flex: 1; padding: 24px 36px 20px; display: flex; flex-direction: column; justify-content: space-between; background: white; }
  .summary { font-size: 28px; color: #222; line-height: 1.85; text-align: justify; }
  .logo-bar { display: flex; justify-content: center; padding-top: 12px; border-top: 1px solid #e8e8e8; margin-top: 8px; }
  .logo-small { height: 40px; object-fit: contain; }
  .sticky { position: absolute; z-index: 8; width: 64px; height: 64px; box-shadow: 2px 2px 6px rgba(0,0,0,0.2); }
  .sticky-1 { top: 52px; left: 16px; background: #ffd54f; transform: rotate(-8deg); }
  .sticky-2 { top: 52px; right: 16px; background: #aed581; transform: rotate(6deg); }
  .sticky-3 { bottom: 60px; left: 16px; background: #aed581; transform: rotate(5deg); }
  .sticky-4 { bottom: 60px; right: 16px; background: #ffd54f; transform: rotate(-6deg); }
</style>
</head><body>
  <div class="bg"></div>
  <div class="clip"></div>
  <div class="sticky sticky-1"></div>
  <div class="sticky sticky-2"></div>
  <div class="sticky sticky-3"></div>
  <div class="sticky sticky-4"></div>
  <div class="paper">
    <div class="header"><div class="header-title">${title}</div></div>
    <img class="illustration" src="${illustrationBase64}" />
    <div class="content">
      <div class="summary">${summary}</div>
      <div class="logo-bar"><img class="logo-small" src="${logoBase64}" /></div>
    </div>
  </div>
</body></html>`;
}

async function screenshot(html, outputPath) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 900, height: 1200 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: outputPath, fullPage: false });
  await browser.close();
  console.log(`✅ 已生成: ${outputPath}`);
}

module.exports = { coverHTML, innerHTML, screenshot, toBase64 };
