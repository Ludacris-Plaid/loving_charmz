/**
 * Product descriptions are authored as plain text in the admin (one line per
 * thought, \n or \r\n separated). Raw newlines collapse into one blob when
 * rendered as a single <p>, so the product page parses the text first:
 *
 *   - narrative lines  → individual paragraphs
 *   - "Material: Brass" style lines → bulleted spec list (bold label)
 *   - short trailing lines with no sentence punctuation ("Handmade in
 *     Alberta") that follow a spec line → also bullets
 */

export type ParsedDescription = {
  paragraphs: string[];
  specs: { label: string | null; value: string }[];
};

/** "Material: Stainless steel" → label "Material", value "Stainless steel". */
const SPEC_LINE = /^([\w '"()/&-]{1,30}):\s*(.+)$/;

/** Sentence-final punctuation that marks a line as prose, not a spec. */
const PROSE_END = /[.!?"”']$/;

export function parseDescription(raw: string): ParsedDescription {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  const specs: { label: string | null; value: string }[] = [];

  for (const line of lines) {
    const spec = line.match(SPEC_LINE);
    if (spec) {
      specs.push({ label: spec[1].trim(), value: spec[2].trim() });
      continue;
    }
    // Once the spec block has started, a short unpunctuated line ("Handmade
    // in Alberta") reads as a spec bullet, not a stray paragraph.
    if (specs.length > 0 && line.length <= 40 && !PROSE_END.test(line)) {
      specs.push({ label: null, value: line });
      continue;
    }
    paragraphs.push(line);
  }

  return { paragraphs, specs };
}
