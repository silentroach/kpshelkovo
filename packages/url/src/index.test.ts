import { describe, expect, it } from 'vitest';

import {
  isAbsoluteUrl,
  isDomylandUrl,
  isTelegramUrl,
  telegram,
  withBase,
} from './index';

describe('isAbsoluteUrl package', () => {
  it('detects absolute URLs and protocol-relative URLs', () => {
    expect(isAbsoluteUrl('https://example.com')).toBe(true);
    expect(isAbsoluteUrl('mailto:test@example.com')).toBe(true);
    expect(isAbsoluteUrl('//cdn.example.com/app.js')).toBe(true);
  });

  it('rejects unsupported URI schemes', () => {
    expect(isAbsoluteUrl('javascript:alert(1)')).toBe(false);
    expect(isAbsoluteUrl('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);
  });

  it('ignores root-relative and relative paths', () => {
    expect(isAbsoluteUrl('/news/')).toBe(false);
    expect(isAbsoluteUrl('news/2026/')).toBe(false);
  });
});

describe('withBase package', () => {
  it('passes through external and special URLs', () => {
    expect(withBase('/base/', 'https://example.com')).toBe(
      'https://example.com',
    );
    expect(withBase('/base/', '#map')).toBe('#map');
    expect(withBase('/base/', 'mailto:test@example.com')).toBe(
      'mailto:test@example.com',
    );
    expect(withBase('/base/', 'tel:+79990000000')).toBe('tel:+79990000000');
    expect(withBase('/base/', '//cdn.example.com/app.js')).toBe(
      '//cdn.example.com/app.js',
    );
  });

  it('prepends normalized base to relative paths', () => {
    expect(withBase('/base/', 'settlements/lesnoe/')).toBe(
      '/base/settlements/lesnoe/',
    );
  });

  it('treats unsupported URI schemes as internal paths', () => {
    expect(withBase('/base/', 'javascript:alert(1)')).toBe(
      '/base/javascript:alert(1)',
    );
    expect(withBase('/base/', 'data:text/plain,hello')).toBe(
      '/base/data:text/plain,hello',
    );
  });

  it('prepends normalized base to absolute internal paths', () => {
    expect(withBase('/base/', '/settlements/usadby/')).toBe(
      '/base/settlements/usadby/',
    );
  });

  it('works without base', () => {
    expect(withBase(undefined, 'settlements/lesnoe/')).toBe(
      '/settlements/lesnoe/',
    );
  });
});

describe('telegram package', () => {
  it('detects Telegram URLs and tg:// links', () => {
    expect(isTelegramUrl('https://t.me/shelkovoecoclub')).toBe(true);
    expect(isTelegramUrl('https://www.t.me/shelkovoecoclub')).toBe(true);
    expect(isTelegramUrl('https://telegram.me/shelkovoecoclub')).toBe(true);
    expect(isTelegramUrl('tg://resolve?domain=shelkovoecoclub')).toBe(true);
    expect(isTelegramUrl('https://example.com/shelkovoecoclub')).toBe(false);
  });

  it('builds URL from plain channel name', () => {
    expect(telegram('shelkovoecoclub')).toBe('https://t.me/shelkovoecoclub');
  });

  it('strips @ prefix and spaces', () => {
    expect(telegram('  @shelkovoecoclub  ')).toBe(
      'https://t.me/shelkovoecoclub',
    );
  });
});

describe('isDomylandUrl', () => {
  it('detects domyland app URLs with http and https', () => {
    expect(isDomylandUrl('https://okkomfort.domyland.app/news')).toBe(true);
    expect(isDomylandUrl('http://demo.domyland.app')).toBe(true);
    expect(isDomylandUrl('https://domyland.app')).toBe(true);
    expect(isDomylandUrl('https://domyland.ru')).toBe(false);
    expect(isDomylandUrl('https://example.com/domyland.app')).toBe(false);
  });

  it('handles query strings and hashes without a trailing slash', () => {
    expect(isDomylandUrl('https://domyland.app?foo=bar')).toBe(true);
    expect(isDomylandUrl('https://okkomfort.domyland.app#section')).toBe(true);
  });

  it('rejects non-http schemes and relative paths', () => {
    expect(isDomylandUrl('ftp://domyland.app')).toBe(false);
    expect(isDomylandUrl('//domyland.app')).toBe(false);
    expect(isDomylandUrl('/domyland.app')).toBe(false);
  });
});
