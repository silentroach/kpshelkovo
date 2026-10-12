// One-off reproduction for #901. Run with --conditions=browser; no files are written.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../../apps/www/package.json', import.meta.url));
const { Window } = await import(pathToFileURL(require.resolve('happy-dom')));
const window = new Window();
for (const key of [
  'window',
  'document',
  'Node',
  'Element',
  'HTMLElement',
  'Text',
  'Comment',
  'Event',
  'MutationObserver'
]) {
  globalThis[key] = key === 'window' ? window : window[key];
}
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
const { compile } = require('svelte/compiler');
const { mount, unmount, tick } = await import(pathToFileURL(require.resolve('svelte')));
const script =
  '<script>let { load } = $props();let id = $state("A");export function choose(value) { id = value; }</script>';
const variants = {
  stable:
    script +
    '<header>{id}</header>{#await load(id)}<p>pending</p>{:then data}<p>{data}</p>{:catch error}<p>failed</p>{/await}',
  async:
    script +
    '<header>{id}</header><svelte:boundary><p>{await load(id)}</p>{#if $effect.pending()}<span>updating</span>{/if}{#snippet pending()}<p>pending</p>{/snippet}{#snippet failed(error, reset)}<p>failed</p>{/snippet}</svelte:boundary>'
};
const drain = async () => {
  for (let i = 0; i < 10; i++) await tick();
};

try {
  for (const [name, code] of Object.entries(variants)) {
    const pending = new Map();
    const calls = [];
    const load = (id) => {
      calls.push(id);
      if (!pending.has(id)) pending.set(id, Promise.withResolvers());
      return pending.get(id).promise;
    };
    const compiled = compile(code, {
      generate: 'client',
      experimental: { async: true },
      filename: `${name}.svelte`
    });
    const js = compiled.js.code.replace(/(["'])(svelte[^"']*)\1/g, (_, quote, id) =>
      JSON.stringify(pathToFileURL(require.resolve(id)).href)
    );
    const { default: Component } = await import(
      `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
    );
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(Component, { target, props: { load } });
    try {
      await drain();
      const result = { name, initial: target.textContent };
      pending.get('A').resolve('data-A');
      await drain();
      result.resolved = target.textContent;
      app.choose('B');
      await drain();
      result.subsequent = target.textContent;
      pending.get('B').resolve('data-B');
      await drain();
      result.final = target.textContent;
      result.calls = calls;
      console.log(JSON.stringify(result));
    } finally {
      await unmount(app);
      target.remove();
    }
  }
} finally {
  await window.happyDOM.close();
}
