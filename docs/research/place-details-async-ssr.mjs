// One-off reproduction for #901. Run from the workspace root; no files are written.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../../apps/www/package.json', import.meta.url));
const { compile } = require('svelte/compiler');
const { render } = await import(pathToFileURL(require.resolve('svelte/server')));
const variants = {
  stable:
    '<script>let { load } = $props();</script>{#await load()}<p>pending</p>{:then data}<p>{data}</p>{/await}',
  guarded:
    '<script>let { load } = $props();let selected = $state(undefined);</script>{#if selected}<svelte:boundary><p>{await load()}</p>{#snippet pending()}<p>pending</p>{/snippet}</svelte:boundary>{/if}',
  boundary:
    '<script>let { load } = $props();</script><svelte:boundary><p>{await load()}</p>{#snippet pending()}<p>pending</p>{/snippet}</svelte:boundary>',
  derivedOutside:
    '<script>let { load } = $props();let data = $derived(await load());</script><svelte:boundary><p>{data}</p>{#snippet pending()}<p>pending</p>{/snippet}</svelte:boundary>'
};

for (const [name, code] of Object.entries(variants)) {
  let calls = 0;
  const compiled = compile(code, {
    generate: 'server',
    experimental: { async: true },
    filename: `${name}.svelte`
  });
  // Data URLs have no package-resolution base, including for side-effect imports.
  const js = compiled.js.code.replace(/(["'])(svelte[^"']*)\1/g, (_, quote, id) =>
    JSON.stringify(pathToFileURL(require.resolve(id)).href)
  );
  const { default: Component } = await import(
    `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
  );
  const result = await render(Component, {
    props: {
      load: () => {
        calls++;
        return Promise.resolve('ok');
      }
    }
  });
  console.log(JSON.stringify({ name, calls, body: result.body }));
}
