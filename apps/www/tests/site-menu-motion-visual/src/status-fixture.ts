import type { StatusDataset } from '../../../src/lib/status/types';

// The header only needs incidents; no content registry or live services in this demo.
export const loadStatusData = async (): Promise<Pick<StatusDataset, 'incidents'>> => ({
  incidents: []
});
