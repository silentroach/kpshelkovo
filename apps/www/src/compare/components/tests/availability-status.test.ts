import { describe, expect, it } from 'vitest';

import { getAvailabilityDisplay } from '../availability-status';

describe('getAvailabilityDisplay', () => {
  it('defines the shared availability display contract', () => {
    expect({
      yes: getAvailabilityDisplay('yes'),
      no: getAvailabilityDisplay('no'),
      partial: getAvailabilityDisplay('partial'),
      unknown: getAvailabilityDisplay()
    }).toMatchInlineSnapshot(`
      {
        "no": {
          "icon": "✗",
          "text": "Нет",
          "tone": "ui-badge-danger",
        },
        "partial": {
          "icon": "◐",
          "text": "Частично",
          "tone": "ui-badge-warning",
        },
        "unknown": {
          "icon": "?",
          "text": "Неизвестно",
          "tone": "ui-badge-muted",
        },
        "yes": {
          "icon": "✓",
          "text": "Есть",
          "tone": "ui-badge-success",
        },
      }
    `);
  });
});
