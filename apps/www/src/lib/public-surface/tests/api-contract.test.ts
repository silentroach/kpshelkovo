import { describe, expect, it } from 'vitest';

import { collectPrerenderedApiContracts } from '../api-contract';
import { publicSurfaceRegistry } from '../index';

const root = 'https://kpshelkovo.online';

describe('prerendered API contracts', () => {
  it('keeps the five public contract triples explicit', () => {
    const contracts = collectPrerenderedApiContracts(
      publicSurfaceRegistry.slices,
      root,
    );
    const owners = [...new Set(contracts.map(({ ownerId }) => ownerId))];
    const summary = Object.fromEntries(
      owners.map((ownerId) => {
        const sectionContracts = contracts.filter(
          (contract) => contract.ownerId === ownerId,
        );

        return [
          ownerId,
          {
            routes: sectionContracts.map(
              ({ mediaType, path }) => `${mediaType} ${path}`,
            ),
            link: sectionContracts[0]?.link,
          },
        ];
      }),
    );

    expect(summary).toMatchSnapshot();
  });
});
