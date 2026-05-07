const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, '..', 'apple', 'subscription-review');

const width = 1290;
const height = 2796;

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function bullets(items, startY) {
  return items
    .map((item, index) => {
      const y = startY + index * 116;
      return `
        <text x="278" y="${y}" class="check">✓</text>
        <text x="324" y="${y}" class="bullet">${escapeXml(item)}</text>
      `;
    })
    .join('\n');
}

function makeSvg({ title, price, productId }) {
  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#020403"/>
      <stop offset="0.52" stop-color="#050505"/>
      <stop offset="1" stop-color="#19030A"/>
    </linearGradient>
    <linearGradient id="cta" x1="206" y1="1908" x2="1084" y2="2040" gradientUnits="userSpaceOnUse">
      <stop stop-color="#BA2240"/>
      <stop offset="1" stop-color="#F23C62"/>
    </linearGradient>
    <filter id="shadow" x="110" y="520" width="1070" height="1260" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="34" stdDeviation="40" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
    <style>
      .large { font: 800 88px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
      .subtitle { font: 700 40px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #b7b7bd; letter-spacing: 0; }
      .title { font: 800 56px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
      .price { font: 800 44px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #e8e8ea; letter-spacing: 0; }
      .copy { font: 700 34px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #b7b7bd; letter-spacing: 0; }
      .bullet { font: 800 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
      .check { font: 900 42px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
      .button { font: 800 44px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
      .fine { font: 700 30px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #8f8f94; letter-spacing: 0; }
      .ref { font: 700 26px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #57575c; letter-spacing: 0; }
      .time { font: 800 42px -apple-system, BlinkMacSystemFont, "SF Pro Display", Arial, sans-serif; fill: #fff; letter-spacing: 0; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect x="76" y="116" width="1138" height="2564" rx="74" fill="#030303" fill-opacity="0.7" stroke="#202023" stroke-width="2"/>
  <text x="120" y="214" class="time">9:41</text>
  <text x="645" y="340" class="large" text-anchor="middle">Push Counter Pro</text>
  <text x="645" y="444" class="subtitle" text-anchor="middle">Premium workout tools</text>

  <g filter="url(#shadow)">
    <rect x="164" y="560" width="962" height="1150" rx="64" fill="#18181B" stroke="#303034" stroke-width="3"/>
    <circle cx="645" cy="710" r="78" stroke="#C72E4E" stroke-width="5"/>
    <path d="M576 742 C606 708 684 708 714 742" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
    <rect x="552" y="762" width="186" height="18" rx="9" fill="#E33A59"/>
    <text x="645" y="900" class="title" text-anchor="middle">${escapeXml(title)}</text>
    <text x="645" y="988" class="price" text-anchor="middle">${escapeXml(price)}</text>
    <text x="645" y="1078" class="copy" text-anchor="middle">Unlock Pro features in Push Counter.</text>

    ${bullets(
      [
        'Full Scene camera focus mode',
        'History beyond this week',
        'Month, year, and all-time stats',
        'Rebuild and customize your plan',
      ],
      1228
    )}
  </g>

  <rect x="208" y="1818" width="874" height="132" rx="66" fill="url(#cta)"/>
  <text x="645" y="1902" class="button" text-anchor="middle">Continue</text>

  <text x="645" y="2025" class="fine" text-anchor="middle">Auto-renews. Manage or cancel in your Apple account.</text>
  <text x="645" y="2090" class="fine" text-anchor="middle">Payment is handled securely by Apple.</text>
  <text x="645" y="2208" class="fine" text-anchor="middle">Privacy Policy • Terms of Use • Restore Purchases</text>
  <text x="645" y="2498" class="ref" text-anchor="middle">Review reference: ${escapeXml(productId)}</text>
</svg>
`;
}

async function writeScreenshot(fileName, input) {
  const svg = makeSvg(input);
  const file = path.join(outDir, fileName);
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log(file);
}

fs.mkdirSync(outDir, { recursive: true });

Promise.all([
  writeScreenshot('monthly-review-screenshot.png', {
    title: 'Push Counter Pro Monthly',
    price: '$3.99 / month',
    productId: 'com.ahmedmansour.pushcounter.monthly',
  }),
  writeScreenshot('yearly-review-screenshot.png', {
    title: 'Push Counter Pro Yearly',
    price: '$39.99 / year',
    productId: 'com.ahmedmansour.pushcounter.pro.yearly',
  }),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
