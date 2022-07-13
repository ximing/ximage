import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';

const scratch = process.env.SCRATCH;
const dist = path.resolve('dist');
if (!scratch) throw new Error('SCRATCH is required');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const classic = [...html.matchAll(/<script(?![^>]*type=["']module["'])[^>]*>[\s\S]*?<\/script>/g)].map((match) => match[0]);
const fileScript = classic.find((script) => script.includes('file:'));
if (!fileScript) {
  throw new Error('Built HTML has no classic script that handles file:');
}

const hosted = await serveDist(dist);
const browser = await chromium.launch({ headless: true });

async function loadOnce(logName) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  await page.goto(`${hosted.origin}#/remove-background`, { waitUntil: 'networkidle' });
  const workspace = page.getByTestId('workspace');
  const theme = page.getByTestId('theme-toggle');
  await workspace.waitFor();
  await theme.waitFor();
  const box = await workspace.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('Workspace box was not measured');
  const heightRatio = box.height / viewport.height;
  const widthRatio = box.width / viewport.width;
  if (heightRatio < 0.55 || widthRatio < 0.8) {
    throw new Error(`Workspace is too small: ${widthRatio.toFixed(2)} by ${heightRatio.toFixed(2)}`);
  }
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const label = (await theme.textContent())?.trim();
  await theme.click();
  const after = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (before === after) throw new Error(`Theme toggle did not change the page color (${before})`);
  const heading = (await page.getByRole('heading', { name: 'Drop a photo' }).textContent())?.trim();
  if (pageErrors.length > 0) throw new Error(`Uncaught page errors: ${pageErrors.join('\n')}`);
  const lines = [
    `url ${hosted.origin}`,
    `heading ${heading}`,
    `theme-label ${label}`,
    `workspace ${Math.round(box.width)}x${Math.round(box.height)} viewport ${viewport.width}x${viewport.height}`,
    `height-ratio ${heightRatio.toFixed(3)}`,
    `width-ratio ${widthRatio.toFixed(3)}`,
    `color-before ${before}`,
    `color-after ${after}`,
    `page-errors ${pageErrors.length}`,
    'classic-file-script yes',
  ];
  fs.writeFileSync(path.join(scratch, logName), `${lines.join('\n')}\n`);
  return page;
}

const first = await loadOnce('launch-1.log');
await first.screenshot({ path: path.join(scratch, 'page.png'), type: 'png' });
await first.close();
const second = await loadOnce('launch-2.log');
await second.close();
await browser.close();
await hosted.close();

const firstLog = fs.readFileSync(path.join(scratch, 'launch-1.log'), 'utf8');
const secondLog = fs.readFileSync(path.join(scratch, 'launch-2.log'), 'utf8');
if (firstLog !== secondLog) {
  throw new Error(`Launch logs differ\n---1---\n${firstLog}\n---2---\n${secondLog}`);
}
console.log(firstLog);
console.log('launch logs agree');
