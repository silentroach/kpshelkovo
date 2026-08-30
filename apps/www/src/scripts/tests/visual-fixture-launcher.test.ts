import { describe, expect, it } from 'vitest';
import { parseVisualFixtureArgs } from '../visual-fixture-launcher.mjs';

describe('visual fixture launcher arguments', () => {
  it('keeps the fixture root and parses the preview port', () => {
    expect(parseVisualFixtureArgs(['tests/status-timeline-visual', '4324']))
      .toMatchInlineSnapshot(`
      {
        "fixtureRoot": "tests/status-timeline-visual",
        "port": 4324,
      }
    `);
  });

  it.each([
    { args: [], message: 'Expected a fixture root and port' },
    { args: ['', '4324'], message: 'Fixture root must not be empty' },
    {
      args: ['tests/status-timeline-visual', '0'],
      message: 'Invalid preview port: 0',
    },
    {
      args: ['tests/status-timeline-visual', 'not-a-port'],
      message: 'Invalid preview port: not-a-port',
    },
  ])('rejects invalid arguments: $message', ({ args, message }) => {
    expect(() => parseVisualFixtureArgs(args)).toThrow(message);
  });
});
