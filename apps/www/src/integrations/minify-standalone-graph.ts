import { minify } from 'vite';

export const minifyStandaloneGraph = async (fileName: string, code: string): Promise<string> => {
  // ES library builds preserve whitespace for downstream tree-shaking; these graphs are final assets.
  // Only compact the output, keeping the build's syntax target and identifier names.
  const result = await minify(fileName, code, {
    module: true,
    compress: false,
    mangle: false,
    codegen: { legalComments: 'inline' }
  });
  if (result.errors.length > 0) {
    throw new AggregateError(result.errors, `Failed to minify standalone graph ${fileName}`);
  }

  return result.code;
};
