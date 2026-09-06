import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(() => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });
});

describe('root discovery route smoke', () => {
  it('serves the root api-catalog with people and reglament anchors', async () => {
    const route = await import('../pages/.well-known/api-catalog');
    const response = await route.GET({} as never);
    const payload = JSON.parse(await response.text()) as {
      readonly linkset: readonly {
        readonly anchor?: string;
        readonly item?: readonly { readonly href?: string }[];
      }[];
    };
    const reglament = payload.linkset.find(
      (entry) => entry.anchor === 'https://example.com/815/regulation/',
    );

    expect(
      payload.linkset.some(
        (entry) => entry.anchor === 'https://example.com/people/index.md',
      ),
    ).toBe(true);
    expect(reglament?.item).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: 'https://example.com/815/regulation/data/estimate-2026.json',
        }),
      ]),
    );
  });

  it('serves the root public skills index with the people skill', async () => {
    const route = await import('../pages/.well-known/agent-skills/index.json');
    const response = await route.GET({} as never);
    const payload = JSON.parse(await response.text()) as {
      readonly skills: readonly {
        readonly name: string;
        readonly url: string;
      }[];
    };

    expect(response.headers.get('Content-Type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(payload.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'people-profiles',
          url: './people-profiles/SKILL.md',
        }),
      ]),
    );
  });
});
