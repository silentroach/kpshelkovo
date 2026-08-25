import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { Infrastructure } from '../../lib/settlement/types';
import InfrastructureTable from '../InfrastructureTable.svelte';

const infrastructure: Infrastructure = {
  roads: 'asphalt',
  sidewalks: 'partial',
  lighting: 'yes',
  gas: 'no',
  sewage: 'yes',
  drainage: 'open',
  checkpoints: 'no',
  security: 'yes',
  fencing: 'no',
  videoSurveillance: 'checkpointOnly',
  undergroundElectricity: 'partial',
  adminBuilding: 'yes',
  retailOrServices: 'partial',
};

describe('InfrastructureTable', () => {
  it('keeps infrastructure order and special status rules explicit', () => {
    const { container } = render(InfrastructureTable, {
      props: { infra: infrastructure },
    });

    const renderedRows = Array.from(container.querySelectorAll('tbody tr')).map(
      (row) => row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(renderedRows).toMatchInlineSnapshot(`
      [
        "Дороги● Асфальт",
        "Тротуары◐ Частично",
        "Уличное освещение✓ Есть",
        "Газ✗ Нет",
        "Центральное водоснабжение? Неизвестно",
        "Центральная канализация✓ Есть",
        "Ливневка◐ Открытая",
        "КПП✗ Нет",
        "Охрана✓ Есть",
        "Закрытая территория✗ Нет",
        "Видеонаблюдение◐ Только на КПП",
        "Подземная электросеть◐ Частично",
        "Административное здание✓ Есть",
        "Магазины◐ Частично",
      ]
    `);
  });
});
