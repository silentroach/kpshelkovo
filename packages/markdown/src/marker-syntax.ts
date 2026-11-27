import type { Root } from 'mdast';
import type { Extension as MdastExtension } from 'mdast-util-from-markdown';
import { splice } from 'micromark-util-chunked';
import { classifyCharacter } from 'micromark-util-classify-character';
import { resolveAll } from 'micromark-util-resolve-all';
import type { Construct, Event, Extension, State, Token } from 'micromark-util-types';
import type { Plugin } from 'unified';

import type {} from './marker-syntax.types';

const equals = 61;

// Based on micromark's GFM strikethrough delimiter model; see LICENSE.marker-syntax.
const marker: Construct = {
  name: 'editorialMarker',
  tokenize(effects, ok, nok) {
    const { previous, events } = this;
    let size = 0;
    const read: State = (code) => {
      if (code === equals) {
        if (size === 2) return nok(code);
        size += 1;
        effects.consume(code);
        return read;
      }
      if (size !== 2) return nok(code);

      const token = effects.exit('editorialMarkerCandidate');
      const before = classifyCharacter(previous);
      const after = classifyCharacter(code);
      token._open = !after || (after === 2 && Boolean(before));
      token._close = !before || (before === 2 && Boolean(after));
      return ok(code);
    };

    return (code) => {
      if (previous === equals && events.at(-1)?.[1].type !== 'characterEscape') {
        return nok(code);
      }

      effects.enter('editorialMarkerCandidate');
      return read(code);
    };
  },
  resolveAll(events, context) {
    let opening: number | undefined;

    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (!event) continue;
      const [kind, token] = event;
      if (kind !== 'enter' || token.type !== 'editorialMarkerCandidate') continue;

      const opener = opening === undefined ? undefined : events[opening]?.[1];
      if (token._close && opener && opening !== undefined) {
        opener.type = 'editorialMarkerDelimiter';
        token.type = 'editorialMarkerDelimiter';
        const mark: Token = { type: 'editorialMarker', start: opener.start, end: token.end };
        const contents = events.slice(opening + 2, index);
        const insideSpan = context.parser.constructs.insideSpan.null;
        const resolved = insideSpan ? resolveAll(insideSpan, contents, context) : contents;
        const next: Event[] = [['enter', mark, context], ...resolved, ['exit', mark, context]];
        splice(events, opening, index - opening + 2, next);
        index = opening + next.length - 1;
        opening = undefined;
      } else if (token._open) {
        opening = index;
      }
    }

    for (const [, token] of events) {
      if (token.type === 'editorialMarkerCandidate') token.type = 'data';
    }
    return events;
  }
};

export const markerSyntax = (): Extension => ({
  text: { [equals]: marker },
  insideSpan: { null: [marker] }
});

export const markerFromMarkdown = (): MdastExtension => ({
  enter: {
    editorialMarker(token) {
      this.enter(
        {
          type: 'strong',
          children: [],
          data: { hName: 'mark', hProperties: { className: ['ui-editorial-marker'] } }
        },
        token
      );
    }
  },
  exit: {
    editorialMarker(token) {
      this.exit(token);
    }
  }
});

export const remarkMarkerSyntax: Plugin<[], Root> = function () {
  const data = this.data();
  (data.micromarkExtensions ??= []).push(markerSyntax());
  (data.fromMarkdownExtensions ??= []).push(markerFromMarkdown());
};
