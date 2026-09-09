import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';

import type { Source } from '../lib/settlement/types';
import SourcesList from './SourcesList.svelte';

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

    // Проверяем, что даты рендерятся в русском формате DD MMMM YYYY.
    expect(container.textContent).toContain('10 марта 2026');
    expect(container.textContent).toContain('15 марта 2026');
    expect(container.textContent).toContain('20 февраля 2026');
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
