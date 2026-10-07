/**
 * Normalises a dialled number to plain E.164 digits (no '+').
 * Handles common CDR dialects: "+63 917-123-4567", "0063917...", "tel:+63917...".
 * National-format numbers (leading single 0) are NOT rewritten here; that
 * requires per-trunk dial-plan rules handled by CDR source mappers.
 */
export function normalizeNumber(raw: string): string {
  let s = raw.trim().replace(/^(tel:|sip:)/i, '');
  s = s.split('@')[0] ?? '';
  s = s.replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);
  return /^\d+$/.test(s) ? s : '';
}

/** All leading substrings, longest first: "6391" → ["6391","639","63","6"]. Used by the SQL fallback. */
export function candidatePrefixes(number: string, maxLength = 16): string[] {
  const n = number.slice(0, maxLength);
  const out: string[] = [];
  for (let i = n.length; i >= 1; i--) out.push(n.slice(0, i));
  return out;
}

export interface EffectiveWindow {
  /** Inclusive start (epoch ms). */
  readonly from: number;
  /** Exclusive end (epoch ms); `null` = open-ended. Mirrors Postgres `[from, to)` tstzrange. */
  readonly to: number | null;
}

export const isEffectiveAt = (w: EffectiveWindow, at: number): boolean =>
  at >= w.from && (w.to === null || at < w.to);

interface Node<T> {
  children: (Node<T> | undefined)[];
  entries: { window: EffectiveWindow; value: T }[] | undefined;
}

const newNode = <T>(): Node<T> => ({ children: new Array(10), entries: undefined });

export interface PrefixMatch<T> {
  readonly prefix: string;
  readonly value: T;
}

/**
 * Digit trie supporting effective-dated entries per prefix.
 *
 * Lookup walks the dialled number once (O(L), L ≤ 16) and remembers the deepest
 * node that has an entry effective at the requested instant. If the deepest
 * matching prefix has no entry valid at that time, a shorter prefix is used —
 * which is the correct longest-*effective*-prefix semantics.
 */
export class PrefixTrie<T> {
  private readonly root: Node<T> = newNode<T>();
  private _size = 0;

  get size(): number {
    return this._size;
  }

  insert(prefix: string, value: T, window: EffectiveWindow = { from: 0, to: null }): void {
    if (!/^\d{1,16}$/.test(prefix)) throw new RangeError(`Invalid prefix "${prefix}"`);
    if (window.to !== null && window.to <= window.from) {
      throw new RangeError(`Empty effective window for prefix ${prefix}`);
    }
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const d = prefix.charCodeAt(i) - 48;
      node = node.children[d] ??= newNode<T>();
    }
    const entries = (node.entries ??= []);
    for (const e of entries) {
      if (overlaps(e.window, window)) {
        throw new RangeError(`Overlapping effective window for prefix ${prefix} (BR-01)`);
      }
    }
    entries.push({ window, value });
    entries.sort((a, b) => a.window.from - b.window.from);
    this._size++;
  }

  longestMatch(number: string, at: number = Date.now()): PrefixMatch<T> | null {
    let node: Node<T> | undefined = this.root;
    let best: PrefixMatch<T> | null = null;
    for (let i = 0; i < number.length && node; i++) {
      const d = number.charCodeAt(i) - 48;
      if (d < 0 || d > 9) return best;
      node = node.children[d];
      if (node?.entries) {
        const hit = node.entries.find((e) => isEffectiveAt(e.window, at));
        if (hit) best = { prefix: number.slice(0, i + 1), value: hit.value };
      }
    }
    return best;
  }
}

function overlaps(a: EffectiveWindow, b: EffectiveWindow): boolean {
  const aEnd = a.to ?? Number.POSITIVE_INFINITY;
  const bEnd = b.to ?? Number.POSITIVE_INFINITY;
  return a.from < bEnd && b.from < aEnd;
}
