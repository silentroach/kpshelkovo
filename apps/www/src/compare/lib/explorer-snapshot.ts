import { createHash } from 'node:crypto';

import { loadAllData } from './data';
import { toExplorerPayload } from './explorer';

const createExplorerSnapshot = async () => {
  const payload = toExplorerPayload(await loadAllData());
  const body = JSON.stringify(payload);
  const version = createHash('sha256').update(body).digest('hex');

  return Object.freeze({
    body,
    payload,
    url: `/static/settlements-explorer/${version}.json`,
    version,
  });
};

let explorerSnapshot: ReturnType<typeof createExplorerSnapshot> | undefined;

export const loadExplorerSnapshot = (): ReturnType<
  typeof createExplorerSnapshot
> => {
  explorerSnapshot ??= createExplorerSnapshot();
  return explorerSnapshot;
};
