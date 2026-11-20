// Plays a whole session in a phone-sized browser and saves screenshots: node scripts/playthrough.cjs <url> <out dir>
// Picks the best option on every play except the second, where it picks the worst.
const { chromium } = require('playwright');
const fs = require('fs');

const [url, out] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 820 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForSelector('#start:not([hidden])', { timeout: 30000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/0_start.png` });
  await p.click('#begin');
  for (let k = 0; k < 5; k += 1) {
    await p.waitForSelector('.hint', { timeout: 30000 });
    await p.waitForTimeout(900);
    if (k === 0 || k === 2) await p.screenshot({ path: `${out}/${k + 1}_decide.png` });
    const pick = await p.evaluate((worst) => {
      const play = window.dime.current();
      const ids = Object.keys(play.options).map(Number).sort((a, b) => play.options[b].points - play.options[a].points);
      return worst ? ids[ids.length - 1] : ids[0];
    }, k === 1);
    await p.evaluate((id) => window.dime.pick(id), pick);
    await p.waitForSelector('#next', { timeout: 30000 });
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${k + 1}_result.png` });
    console.log('play', k + 1, await p.$eval('.result h2', (e) => e.textContent));
    await p.click('#next');
  }
  await p.waitForSelector('#end:not([hidden])');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/6_end.png` });
  console.log('end:', await p.$eval('#endTitle', (e) => e.textContent), await p.$eval('#endScore', (e) => e.textContent), '| errors:', errs.join(' | ') || 'none');
  await b.close();
})();
