import { expect, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

const screenshot = {
  animations: 'disabled',
  caret: 'hide',
  scale: 'device',
} as const;

export const waitForVisualPaint = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
};

export const expectPaintedContent = async (locator: Locator): Promise<void> => {
  await expect(locator).toBeVisible();

  const { data, info } = await sharp(await locator.screenshot(screenshot))
    .flatten({ background: '#fff' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let darkPixels = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    const luminance =
      data[index] * 0.2126 +
      data[index + 1] * 0.7152 +
      data[index + 2] * 0.0722;

    if (luminance < 100) {
      darkPixels += 1;
    }
  }

  expect(darkPixels / (info.width * info.height)).toBeGreaterThan(0.01);
};
