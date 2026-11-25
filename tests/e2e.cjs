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
  await visit('/marathon-watch-pace-vs-course-pace/','Marathon Watch Pace vs. Course Pace');
  assert.match(await page.locator('.lede').textContent(),/5:33\.33/);
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Answer should fit in the first viewport');
  await visit('/marathon-pace-chart-start-delay/','Marathon Pace Chart With a Start Delay');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Start-delay answer fits first viewport');
  await visit('/marathon-elapsed-vs-moving-time/','Marathon Elapsed vs. Moving Time');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Elapsed-time answer fits first viewport');
  await visit('/marathon-missed-lap-marker/','Missed a Marathon Lap Marker? Calculate Your Split');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Missed-marker answer fits first viewport');
  await visit('/marathon-final-2195-meters/','Marathon Final 2.195 km Pace Chart');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Final-distance answer fits first viewport');
  await visit('/marathon-pace-change-time-saved/','Marathon Pace Change: How Much Time Will You Save?');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Pace-change answer fits first viewport');
  await visit('/marathon-average-pace-from-segments/','Marathon Average Pace From Unequal Segments');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Segment answer fits first viewport');
  await visit('/marathon-slow-first-5k/','Marathon Pace After a Slow First 5K');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'First-5K answer fits first viewport');
  await visit('/marathon-26-2-mile-pace-error/','Marathon Pace: The 26.2-Mile Distance Error');
  assert.ok(await page.locator('.lede').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'Distance-error answer fits first viewport');
  await page.close();
 }
 assert.deepEqual(errors,[],'JS errors');
 const robots=fs.readFileSync('src/robots.txt','utf8');assert.match(robots,/Sitemap: https:\/\/race-pace-calculator.com\/sitemap.xml/);
 const sitemap = fs.readFileSync('src/sitemap.xml', 'utf8');
 const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1]);
 const uniqueUrls = new Set(sitemapUrls);
 assert.equal(uniqueUrls.size, sitemapUrls.length, 'Duplicate sitemap URLs');
 const requiredPaths = [
  '/', '/treadmill-pace-calculator/', '/bike-pace-calculator/',
  '/run-walk-pace-calculator/', '/how-to-calculate-race-pace/', '/privacy/',
  '/contact/', '/marathon-pace-calculator', '/marathon-pace-chart/',
  '/marathon-pace-chart-rounding/', '/marathon-aid-station-pace-chart/',
 ];
 for (const path of requiredPaths) {
  assert.ok(uniqueUrls.has('https://race-pace-calculator.com' + path), 'Missing sitemap URL: ' + path);
 }
 await browser.close();
 console.log('PASS four calculators, 7 browser-tested pages, mobile 390px, desktop 1280px, robots and sitemap');
})().catch(e=>{console.error(e);process.exit(1)});