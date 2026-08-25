import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { CommonSpaces } from '../../lib/settlement/types';
import CommonSpacesTable from '../CommonSpacesTable.svelte';

const spaces: CommonSpaces = {
  clubInfrastructure: 'yes',
  playgrounds: 'yes',
  sports: 'partial',
  pool: 'no',
  fitnessClub: 'no',
  restaurant: 'no',
  spaCenter: 'no',
  walkingRoutes: 'no',
  waterAccess: 'yes',
  beachZones: 'no',
  kidsClub: 'no',
  sportsCamp: 'no',
  primarySchool: 'no',
};

describe('CommonSpacesTable', () => {
  it('keeps common-space order and status display rules explicit', () => {
    const { container } = render(CommonSpacesTable, {
      props: { spaces },
    });

    const renderedRows = Array.from(container.querySelectorAll('tbody tr')).map(
      (row) => row.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(renderedRows).toMatchInlineSnapshot(`
      [
        "Клубная инфраструктура✓ Есть",
        "Детские площадки✓ Есть",
        "Спортивные площадки◐ Частично",
        "Бассейн✗ Нет",
        "Фитнес-клуб✗ Нет",
        "Ресторан✗ Нет",
        "Спа-центр✗ Нет",
        "Маршруты для прогулок✗ Нет",
        "Выход к воде✓ Есть",
        "Пляжные зоны✗ Нет",
        "Детский клуб✗ Нет",
        "Спортивный лагерь✗ Нет",
        "Начальная школа✗ Нет",
        "Зоны барбекю? Неизвестно",
      ]
    `);
  });
});
