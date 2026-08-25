import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { ServiceModel } from '../../lib/settlement/types';
import ServiceTable from '../ServiceTable.svelte';

const services: ServiceModel = {
  garbageCollection: 'yes',
  snowRemoval: 'partial',
  roadCleaning: 'yes',
  landscaping: 'yes',
  emergencyService: 'no',
};

describe('ServiceTable', () => {
  it('keeps service order and status display rules explicit', () => {
    const { container } = render(ServiceTable, {
      props: { services },
    });

    const renderedRows = Array.from(container.querySelectorAll('tbody tr')).map(
      (row) => row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(renderedRows).toMatchInlineSnapshot(`
      [
        "Вывоз мусора✓ Есть",
        "Уборка снега◐ Частично",
        "Уборка дорог✓ Есть",
        "Благоустройство✓ Есть",
        "Аварийная служба✗ Нет",
        "Диспетчерская служба? Неизвестно",
      ]
    `);
  });
});
