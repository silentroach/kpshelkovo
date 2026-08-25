import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ComparisonTable from '../ComparisonTable.svelte';
import type {
  ComparisonStatus,
  ComparisonTableRow,
} from '../comparison-table.types';

const available: ComparisonStatus = {
  icon: '✓',
  text: 'Есть',
  tone: 'ui-badge-success',
};

const unavailable: ComparisonStatus = {
  icon: '✗',
  text: 'Нет',
  tone: 'ui-badge-danger',
};

const rows: readonly ComparisonTableRow[] = [
  {
    key: 'same',
    label: 'Совпадает',
    value: 'yes',
    shelkovoValue: 'yes',
    status: available,
    shelkovoStatus: available,
  },
  {
    key: 'different',
    label: 'Отличается',
    value: 'no',
    shelkovoValue: 'yes',
    status: unavailable,
    shelkovoStatus: available,
  },
];

describe('ComparisonTable', () => {
  it('renders the comparison contract and filters differing rows', async () => {
    const { getByLabelText, getByRole, queryByText } = render(ComparisonTable, {
      props: {
        title: 'Модель обслуживания',
        itemHeading: 'Услуга',
        rows,
        showShelkovo: true,
      },
    });

    expect(
      getByLabelText('Модель обслуживания: таблица сравнения'),
    ).toBeTruthy();
    expect(getByRole('columnheader', { name: 'Шелково' })).toBeTruthy();

    const toggle = getByRole('button', {
      name: 'Показать только отличающиеся свойства',
    });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    await fireEvent.click(toggle);

    expect(queryByText('Совпадает')).toBeNull();
    expect(getByRole('cell', { name: 'Отличается' })).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.getAttribute('title')).toBe('Показать все свойства');
  });

  it('shows the empty state when there are no differences', async () => {
    const { getByRole, getByText } = render(ComparisonTable, {
      props: {
        title: 'Общие пространства',
        itemHeading: 'Общие пространства',
        rows: [rows[0]],
        showShelkovo: true,
      },
    });

    await fireEvent.click(
      getByRole('button', {
        name: 'Показать только отличающиеся свойства',
      }),
    );

    expect(getByText('Отличий с Шелково не найдено')).toBeTruthy();
  });

  it('omits comparison controls and cells without comparison data', () => {
    const { queryByRole } = render(ComparisonTable, {
      props: {
        itemHeading: 'Услуга',
        rows,
        showShelkovo: false,
      },
    });

    expect(queryByRole('button')).toBeNull();
    expect(queryByRole('columnheader', { name: 'Шелково' })).toBeNull();
  });
});
