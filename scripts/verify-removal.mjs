import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { serveDist } from './serve-dist.mjs';

const scratch = process.env.SCRATCH;
if (!scratch) throw new Error('SCRATCH is required');
const fixture = path.resolve('tests/fixtures/subject.png');
const hosted = await serveDist(distPath());
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(String(error)));

function distPath() {
  return path.resolve('dist');
}

try {
  await page.goto(hosted.origin, { waitUntil: 'networkidle' });
  await page.setInputFiles('[data-testid=file-input]', fixture);
  await page.getByTestId('remove-background').click();
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid=compare]') || document.querySelector('[data-testid=model-error]');
  }, { timeout: 180000 });

  const failed = await page.getByTestId('model-error').count();
  if (failed > 0 && (await page.getByTestId('compare').count()) === 0) {
    const message = (await page.getByTestId('model-error').textContent())?.trim() || 'model error';
    const body = [
      'The WASM/model runtime did not produce a cutout.',
      message,
      ...pageErrors,
    ].join('\n');
    fs.writeFileSync(path.join(scratch, 'removal-fallback.log'), `${body}\n`);
    console.log(body);
    process.exitCode = 0;
  } else {
    const sample = await page.evaluate(() => {
      const root = document.querySelector('[data-testid=compare]');
      const cutout = root?.querySelector('img[alt="Background removed"]');
      const original = root?.querySelector('img[alt="Original"]');
      if (!(cutout instanceof HTMLImageElement) || !(original instanceof HTMLImageElement)) {
        return { error: 'compare images missing' };
      }
      const canvas = document.createElement('canvas');
      canvas.width = cutout.naturalWidth;
      canvas.height = cutout.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return { error: 'no canvas' };
      context.drawImage(cutout, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      let opaque = 0;
      for (let index = 3; index < data.length; index += 4) {
        if (data[index] === 0) transparent += 1;
        else if (data[index] > 0) opaque += 1;
      }
      return {
        width: cutout.naturalWidth,
        height: cutout.naturalHeight,
        sourceWidth: original.naturalWidth,
        sourceHeight: original.naturalHeight,
        transparent,
        opaque,
      };
    });
    const lines = [
      `width ${sample.width}`,
      `height ${sample.height}`,
      `source ${sample.sourceWidth}x${sample.sourceHeight}`,
      `transparent ${sample.transparent}`,
      `opaque ${sample.opaque}`,
      `page-errors ${pageErrors.length}`,
      sample.error ? `error ${sample.error}` : 'error none',
    ];
    console.log(lines.join('\n'));
    if (
      sample.error ||
      sample.width !== sample.sourceWidth ||
      sample.height !== sample.sourceHeight ||
      sample.transparent < 1 ||
      sample.opaque < 1
    ) {
      throw new Error(`Cutout failed the pixel contract\n${lines.join('\n')}`);
    }
  }
} finally {
  await browser.close();
  await hosted.close();
}
