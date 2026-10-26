import { describe, expect, it } from 'vitest';

import {
  inventoryCanonical,
  inventoryGroupCanonical,
  inventoryGroupMarkdownUrl,
  inventoryGroupUrl,
  inventoryKindCanonical,
  inventoryKindMarkdownUrl,
  inventoryKindUrl,
  inventoryMarkdownUrl,
  inventoryOfferAnchor,
  inventoryOfferCanonical,
  inventoryOfferMarkdownPath,
  inventoryOfferMarkdownPattern,
  inventoryOfferMarkdownUrl,
  inventoryOfferPath,
  inventoryOfferPattern,
  inventoryOfferUrl,
  inventoryUrl,
  inventoryOwnerCanonical,
  inventoryOwnerMarkdownPath,
  inventoryOwnerMarkdownPattern,
  inventoryOwnerMarkdownUrl,
  inventoryOwnerPath,
  inventoryOwnerPattern,
  inventoryOwnerUrl
} from '../routes';
import { inventorySourceId } from '../source';

describe('inventory identities and routes', () => {
  it('exposes owner HTML, Markdown, canonical and discovery patterns by ID', () => {
    const owner = { id: 'ikalashnikov' };
    expect([
      inventoryOwnerPath(owner),
      inventoryOwnerUrl(owner),
      inventoryOwnerCanonical(owner),
      inventoryOwnerMarkdownPath(owner),
      inventoryOwnerMarkdownUrl(owner),
      inventoryOwnerPattern(),
      inventoryOwnerMarkdownPattern()
    ]).toMatchInlineSnapshot(`
      [
        "/ukogo/owners/ikalashnikov/",
        "/ukogo/owners/ikalashnikov/",
        "https://kpshelkovo.online/ukogo/owners/ikalashnikov/",
        "/ukogo/owners/ikalashnikov/index.md",
        "/ukogo/owners/ikalashnikov/index.md",
        "/ukogo/owners/:owner/",
        "/ukogo/owners/:owner/index.md",
      ]
    `);
  });

  it.each(['', '../anna', 'anna#x', 'anna--a', 'Anna', 'anna/other'])(
    'rejects unsafe owner ID %j across all owner helpers',
    (id) => {
      for (const route of [
        inventoryOwnerPath,
        inventoryOwnerUrl,
        inventoryOwnerCanonical,
        inventoryOwnerMarkdownPath,
        inventoryOwnerMarkdownUrl
      ]) {
        expect(() => route({ id })).toThrow('inventory owner id');
      }
    }
  );

  it('publishes HTML, Markdown and self-canonical at four levels', () => {
    const route = { group: 'construction', id: 'grinder-125', offerId: 'neighbor-tool-1' };
    expect([
      [inventoryUrl(), inventoryMarkdownUrl(), inventoryCanonical()],
      [inventoryGroupUrl(route), inventoryGroupMarkdownUrl(route), inventoryGroupCanonical(route)],
      [inventoryKindUrl(route), inventoryKindMarkdownUrl(route), inventoryKindCanonical(route)],
      [inventoryOfferUrl(route), inventoryOfferMarkdownUrl(route), inventoryOfferCanonical(route)]
    ]).toMatchInlineSnapshot(`
      [
        [
          "/ukogo/",
          "/ukogo/index.md",
          "https://kpshelkovo.online/ukogo/",
        ],
        [
          "/ukogo/construction/",
          "/ukogo/construction/index.md",
          "https://kpshelkovo.online/ukogo/construction/",
        ],
        [
          "/ukogo/construction/grinder-125/",
          "/ukogo/construction/grinder-125/index.md",
          "https://kpshelkovo.online/ukogo/construction/grinder-125/",
        ],
        [
          "/ukogo/construction/grinder-125/neighbor-tool-1/",
          "/ukogo/construction/grinder-125/neighbor-tool-1/index.md",
          "https://kpshelkovo.online/ukogo/construction/grinder-125/neighbor-tool-1/",
        ],
      ]
    `);
    expect(inventoryOfferAnchor('neighbor-tool-1')).toBe('offer-neighbor-tool-1');
    expect(inventorySourceId('grinder-125.md')).toBe('grinder-125');
  });

  it('exposes offer paths and public route patterns with the source kind ID', () => {
    const route = { group: 'construction', id: 'circular-saws', offerId: 'saw-a' };
    expect([
      inventoryOfferPath(route),
      inventoryOfferMarkdownPath(route),
      inventoryOfferPattern(),
      inventoryOfferMarkdownPattern()
    ]).toMatchInlineSnapshot(`
      [
        "/ukogo/construction/circular-saws/saw-a/",
        "/ukogo/construction/circular-saws/saw-a/index.md",
        "/ukogo/:group/:kind/:offer/",
        "/ukogo/:group/:kind/:offer/index.md",
      ]
    `);
  });

  it.each([
    'A.md',
    'болгарка.md',
    'folder/tool.md',
    'tool.MD',
    'tool.yaml',
    '-tool.md',
    'tool--a.md',
    'tool_.md',
    '../tool.md',
    'tool .md'
  ])('rejects noncanonical source %s rather than silently normalizing', (source) => {
    expect(() => inventorySourceId(source)).toThrow(`inventory source "${source}"`);
  });

  it('rejects unsafe route inputs', () => {
    expect(() => inventoryGroupUrl({ group: 'unknown' })).toThrow('inventory group');
    expect(() => inventoryKindUrl({ group: 'home', id: '../tool' })).toThrow('inventory kind id');
    expect(() => inventoryOfferAnchor('tool#x')).toThrow('inventory offer id');
    expect(() => inventoryOfferUrl({ group: 'unknown', id: 'tool', offerId: 'a' })).toThrow(
      'inventory group'
    );
    expect(() => inventoryOfferMarkdownUrl({ group: 'home', id: '../tool', offerId: 'a' })).toThrow(
      'inventory kind id'
    );
  });

  it.each(['', '../tool', 'tool#x', 'tool--a', 'Tool', 'tool/other'])(
    'rejects unsafe offer ID %j for HTML and Markdown',
    (offerId) => {
      const route = { group: 'home', id: 'tool', offerId };
      expect(() => inventoryOfferUrl(route)).toThrow('inventory offer id');
      expect(() => inventoryOfferMarkdownUrl(route)).toThrow('inventory offer id');
    }
  );
});
