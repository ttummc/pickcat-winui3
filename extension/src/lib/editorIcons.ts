/**
 * Editor toolbar icons.
 *
 * The Segoe Fluent Icons font has no coherent set for Markdown markers — several
 * code points render as unrelated shapes (strike looked like a folder, code block
 * and quote collided), so these are drawn here on a 20x20 grid in the same visual
 * language: 1.6px strokes, round caps, currentColor.
 *
 * `letter` entries are rendered as typographic glyphs (B / I / S / H), which is
 * what text editors conventionally use.
 */
export interface EditorIconSpec {
  letter?: string
  /** One entry per <path>; `fill` paths use the second tuple slot. */
  strokes?: string[]
  filled?: string[]
}

export const EDITOR_ICONS: Record<string, EditorIconSpec> = {
  bold: { letter: 'B' },
  italic: { letter: 'I' },
  strike: { letter: 'S', strokes: ['M3.8 10h12.4'] },
  heading: { letter: 'H' },
  code: { strokes: ['M7.2 6.5 3.8 10l3.4 3.5', 'M12.8 6.5 16.2 10l-3.4 3.5'] },
  codeblock: {
    strokes: ['M3.2 5.5h13.6v9H3.2z', 'M7.6 9 6 10.5l1.6 1.5', 'M12.4 9l1.6 1.5-1.6 1.5'],
  },
  quote: {
    strokes: ['M7.6 6.4c-1.7 0-3 1.3-3 3v4.2h4.2v-4.2H6.1', 'M14.8 6.4c-1.7 0-3 1.3-3 3v4.2h4.2v-4.2h-2.7'],
  },
  list: {
    filled: ['M4.4 7.1a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1', 'M4.4 11.9a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1'],
    strokes: ['M8 8.2h8.4', 'M8 13h8.4'],
  },
  link: {
    strokes: [
      'M8.2 11.8 11.8 8.2',
      'M6.6 13.4 5.7 14.3a2.6 2.6 0 0 1-3.7-3.7l2.2-2.2a2.6 2.6 0 0 1 3.7 0',
      'M13.4 6.6l.9-.9a2.6 2.6 0 0 1 3.7 3.7l-2.2 2.2a2.6 2.6 0 0 1-3.7 0',
    ],
  },
  table: {
    strokes: ['M3.2 4.6h13.6v10.8H3.2z', 'M3.2 8.6h13.6', 'M8.1 8.6v6.8', 'M12.9 8.6v6.8'],
  },
  rule: { strokes: ['M4 10h12'] },
  image: {
    strokes: ['M3.2 4.6h13.6v10.8H3.2z', 'M6.4 12.9l2.6-3.1 2.1 2.4 1.6-1.7 1.9 2.4'],
    filled: ['M13.2 7.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3'],
  },
  upload: {
    strokes: ['M3.2 13.6v2.4h13.6v-2.4', 'M10 13V3.6', 'M6.9 6.6 10 3.5l3.1 3.1'],
  },
}
