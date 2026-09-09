import { describe, expect, it } from 'vitest';

import { compareRuText } from './locale';

describe('compareRuText', () => {
  it('sorts text with the shared Russian locale comparator', () => {
    expect(['Яма', 'Альфа', 'Бета'].toSorted(compareRuText)).toEqual(['Альфа', 'Бета', 'Яма']);
  });
});
