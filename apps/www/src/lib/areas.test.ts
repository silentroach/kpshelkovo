import { describe, expect, it } from 'vitest';

import { formatArea } from './areas';

const areaLabels = [
  ['river', 'Шелково Ривер'],
  ['forest', 'Шелково Форест'],
  ['park', 'Шелково Парк'],
  ['village', 'Шелково Вилладж']
] as const;

describe('formatArea', () => {
  it.each(areaLabels)('formats %s as a stable public label from GLOSSARY.md', (area, label) => {
    expect(formatArea(area)).toBe(label);
  });
});
