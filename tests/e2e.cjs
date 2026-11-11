const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({headless:true});
 const errors=[];
 for (const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:850}});
  page.on('pageerror',e=>errors.push(width+': '+e.message));
  const base='http://127.0.0.1:8765';
  const visit=async(path,title)=>{const r=await page.goto(base+path);assert.equal(r.status(),200,path);await page.waitForLoadState('load');assert.equal(await page.locator('h1').first().textContent(),title);assert.equal(await page.locator('link[rel=canonical]').count(),1);assert.equal(await page.locator('meta[name=description]').count(),1);assert.equal(await page.locator('meta[name=viewport]').count(),1);await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+2),'horizontal overflow '+path+' at '+width);};
  await visit('/','Race Pace Calculator');
  await page.locator('[data-unit-btn=km]').click();
  await page.locator('#distance').fill('5');
  await page.locator('#hours').fill('0');await page.locator('#minutes').fill('25');await page.locator('#seconds').fill('0');
  assert.match(await page.locator('#out-pace').textContent(),/5:00 \/km/);
  await page.locator('[data-mode-btn=finish]').click();
  await page.locator('#pace-min').fill('6');await page.locator('#pace-sec').fill('0');
  assert.match(await page.locator('#out-finish').textContent(),/30:00/);
  await page.locator('[data-mode-btn=distance]').click();
  assert.match(await page.locator('#out-distance').textContent(),/4\.167 km/);
  await page.locator('#reset-btn').click();
  assert.match(await page.locator('#out-pace').textContent(),/5:36 \/km/);
  await visit('/treadmill-pace-calculator/','Treadmill Pace Calculator');
  assert.match(await page.locator('#tm-out-pace').textContent(),/9:30 \/mi/);
  await page.locator('[data-unit-btn=km]').click();
  assert.match(await page.locator('#tm-out-pace').textContent(),/5:54 \/km/);
  await visit('/bike-pace-calculator/','Bike Pace Calculator');
  assert.notEqual(await page.locator('#bike-out-speed').textContent(),'—');
  await page.locator('[data-unit-btn=km]').click();
  assert.match(await page.locator('#bike-out-speed').textContent(),/km\/h/);
  await visit('/run-walk-pace-calculator/','Run Walk Pace Calculator');
  await page.locator('#rw-distance').fill('10');
  await page.locator('#rw-run-min').fill('3');await page.locator('#rw-walk-min').fill('1');
  await page.locator('#rw-run-pace-min').fill('10');await page.locator('#rw-run-pace-sec').fill('0');
  await page.locator('#rw-walk-pace-min').fill('15');await page.locator('#rw-walk-pace-sec').fill('0');
  assert.match(await page.locator('#rw-out-pace').textContent(),/10:55 \/mi/);
  await page.locator('[data-unit-btn=km]').click();
  assert.match(await page.locator('#rw-out-pace').textContent(),/\/km/);
  for (const [path,title] of [['/how-to-calculate-race-pace/','How to Calculate Race Pace'],['/privacy/','Privacy'],['/contact/','Contact']]) {await visit(path,title);}
  await page.close();
 }
 assert.deepEqual(errors,[],'JS errors');
 const robots=fs.readFileSync('src/robots.txt','utf8');assert.match(robots,/Sitemap: https:\/\/race-pace-calculator.com\/sitemap.xml/);
 const sitemap=fs.readFileSync('src/sitemap.xml','utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,7);
 await browser.close();console.log('PASS four calculators, 7 pages, mobile 390px, desktop 1280px, robots and sitemap');
})().catch(e=>{console.error(e);process.exit(1)});