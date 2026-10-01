import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';

import type { Source } from '../lib/settlement/types';
import SourcesList from './SourcesList.svelte';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('SourcesList', () => {
  const mockSources: Source[] = [
    {
      title: 'Сайт УК КП Шелково',
      url: 'https://shelkovo-kp.ru',
      type: 'official',
      dateChecked: '2026-03-10',
      comment: 'Официальный сайт управляющей компании'
    },
    {
      title: 'Чат жителей (Telegram)',
      url: 'https://t.me/shelkovo_chat',
      type: 'community',
      dateChecked: '2026-03-15',
      comment: ''
    },
    {
      title: 'Статья в газете',
      url: 'https://example.com/article',
      type: 'media',
      dateChecked: '2026-02-20',
      comment: 'Публикация о тарифах'
    }
  ];

  it('renders all sources with correct data', () => {
    const { container } = render(SourcesList, {
      props: { sources: mockSources }
    });

    expect(container.textContent).toContain('Сайт УК КП Шелково');
    expect(container.textContent).toContain('Чат жителей (Telegram)');
    expect(container.textContent).toContain('Статья в газете');

    expect([...container.querySelectorAll('.source-date')].map((date) => date.textContent?.trim()))
      .toMatchInlineSnapshot(`
      [
        "10 марта",
        "15 марта",
        "20 февраля",
      ]
    `);
  });

  it('retains other years without changing source dates or links', () => {
    const sources = ['2025-03-10', '2027-03-10'].map((dateChecked) => ({
      ...mockSources[0]!,
      dateChecked,
      url: `https://example.com/${dateChecked}`
    }));
    const { container } = render(SourcesList, { props: { sources } });

    expect(
      [...container.querySelectorAll('li')].map((row, index) => ({
        date: row.querySelector('.source-date')?.textContent?.trim(),
        href: row.querySelector('a')?.getAttribute('href'),
        raw: sources[index]?.dateChecked
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "date": "10 марта 2025",
          "href": "https://example.com/2025-03-10",
          "raw": "2025-03-10",
        },
        {
          "date": "10 марта 2027",
          "href": "https://example.com/2027-03-10",
          "raw": "2027-03-10",
        },
      ]
    `);
  });

  it('renders source type badges with correct labels', () => {
    const { container } = render(SourcesList, {
      props: { sources: mockSources }
    });

    expect(container.textContent).toContain('Официальный');
    expect(container.textContent).toContain('Сообщество');
    expect(container.textContent).toContain('СМИ');
  });

  it('renders clickable links with correct URLs', () => {
    const { container } = render(SourcesList, {
      props: { sources: mockSources }
    });

    const links = container.querySelectorAll('[data-testid="source-link"]');
    expect(links).toHaveLength(3);

    expect(links[0].getAttribute('href')).toBe('https://shelkovo-kp.ru');
    expect(links[0].getAttribute('target')).toBe('_blank');
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer');

    expect(links[1].getAttribute('href')).toBe('https://t.me/shelkovo_chat');
    expect(links[2].getAttribute('href')).toBe('https://example.com/article');
  });

  it('renders comments when provided', () => {
    const { container } = render(SourcesList, {
      props: { sources: mockSources }
    });

    expect(container.textContent).toContain('Официальный сайт управляющей компании');
    expect(container.textContent).toContain('Публикация о тарифах');
  });

  it('renders empty list without errors', () => {
    const { container } = render(SourcesList, {
      props: { sources: [] }
    });

    const list = container.querySelector('[data-testid="sources-list"]');
    expect(list).toBeTruthy();
    expect(list?.children).toHaveLength(0);
  });

  it('renders personal source type label', () => {
    const personalSource: Source[] = [
      {
        title: 'Личное наблюдение',
        url: 'https://example.com',
        type: 'personal',
        dateChecked: '2026-03-01',
        comment: ''
      }
    ];

    const { container } = render(SourcesList, {
      props: { sources: personalSource }
    });

    expect(container.textContent).toContain('Личное');
  });
});
