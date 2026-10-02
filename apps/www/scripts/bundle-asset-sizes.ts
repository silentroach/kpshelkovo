import { stat } from 'node:fs/promises';

const optionalSize = async (url: URL): Promise<number | undefined> =>
  stat(url)
    .then((asset) => asset.size)
    .catch((error: NodeJS.ErrnoException): undefined => {
      if (error.code === 'ENOENT') return;
      throw error;
    });

export const readBundleAssetSizes = async (url: URL) => {
  const [raw, brotli, gzip] = await Promise.all([
    stat(url),
    optionalSize(new URL(`${url}.br`)),
    optionalSize(new URL(`${url}.gz`))
  ]);
  return { bytes: raw.size, brotli, gzip };
};
