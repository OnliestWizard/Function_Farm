/**
 * fuzzySearch — definitive zero-dependency fuzzy search.
 *
 * Synthesis of:
 *  - kentcdodds/match-sorter  : deterministic ranking tiers + acronym matching
 *  - farzher/fuzzysort        : subsequence fine-scoring + highlight ranges + bitflag early-out
 *  - krisk/Fuse               : extended-query operators + match-mask -> [start,end] ranges
 *
 * No runtime dependencies. Targets: web + node.
 */

export type MatchRange = [start: number, end: number]

export interface FuzzyFieldMatch {
  /** dotted key path this match came from (undefined when items are plain strings) */
  key?: string
  /** the raw field value that matched */
  value: string
  /** contiguous highlight ranges into `value`, inclusive */
  indices: MatchRange[]
}

export interface FuzzyResult<T> {
  item: T
  /** original index of the item in the input array */
  refIndex: number
  /** combined score in [0,1]; 1 = perfect (case-sensitive equal) */
  score: number
  /** discrete ranking tier (see Rankings); higher = better */
  rank: number
  /** key path of the field that produced the winning rank */
  key?: string
  matches: FuzzyFieldMatch[]
}

export interface FuzzySearchOptions<T> {
  /** dotted key paths to search on object items; omit for string[] items */
  keys?: string[]
  /** cap the number of returned results */
  limit?: number
  /** minimum tier required to be included (default MATCHES) */
  threshold?: number
  /** keep diacritics instead of folding them (default false) */
  keepDiacritics?: boolean
  /** final tie-break comparator on the rankedValue strings */
  baseSort?: (a: string, b: string) => number
}

/* ---- ranking tiers (from match-sorter) ---------------------------------- */
export const Rankings = {
  CASE_SENSITIVE_EQUAL: 7,
  EQUAL: 6,
  STARTS_WITH: 5,
  WORD_STARTS_WITH: 4,
  CONTAINS: 3,
  ACRONYM: 2,
  MATCHES: 1,
  NO_MATCH: 0,
} as const

/* ---- diacritics fold (length-preserving, replaces remove-accents) ------- */
const FOLD: Record<string, string> = {}
;(() => {
  const map: [string, string][] = [
    ['a', 'àáâãäåāăą'], ['c', 'çćĉċč'], ['e', 'èéêëēĕėęě'],
    ['i', 'ìíîïĩīĭįı'], ['n', 'ñńņňŉ'], ['o', 'òóôõöøōŏő'],
    ['s', 'śŝşš'], ['u', 'ùúûüũūŭůűų'], ['y', 'ýÿŷ'], ['z', 'źżž'],
  ]
  for (const [base, accented] of map)
    for (const ch of accented) {
      FOLD[ch] = base
      FOLD[ch.toUpperCase()] = base.toUpperCase()
    }
})()

function foldDiacritics(s: string): string {
  let out = ''
  for (const ch of s) out += FOLD[ch] ?? ch
  return out
}

function prep(value: unknown, keepDiacritics: boolean): string {
  const s = value == null ? '' : String(value)
  return keepDiacritics ? s : foldDiacritics(s)
}

/* ---- value extraction (dotted paths + arrays), Fuse/fuzzysort style ------ */
function getValues(item: unknown, key: string): string[] {
  const parts = key.split('.')
  let nodes: unknown[] = [item]
  for (const part of parts) {
    const next: unknown[] = []
    for (const node of nodes) {
      if (node == null) continue
      const v = (node as Record<string, unknown>)[part]
      if (Array.isArray(v)) next.push(...v)
      else if (v != null) next.push(v)
    }
    nodes = next
  }
  return nodes.map((n) => String(n))
}

/* ---- char bitflag early-out (from fuzzysort) ---------------------------- */
function bitflags(lower: string): number {
  let flags = 0
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i)
    let bit: number
    if (c >= 97 && c <= 122) bit = c - 97 // a-z -> 0..25
    else if (c >= 48 && c <= 57) bit = 26 + (c - 48) // 0-9 -> 26..35
    else bit = 36
    flags |= 1 << bit
  }
  return flags
}

/* ---- acronym (from match-sorter getAcronym) ----------------------------- */
function acronym(s: string): string {
  let out = ''
  let prev = ' '
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    const prevDelim = prev === ' ' || prev === '-'
    const currDelim = ch === ' ' || ch === '-'
    if (prevDelim && !currDelim) out += ch
    prev = ch
  }
  return out
}

/* ---- mask -> [start,end] ranges (from Fuse convertMaskToIndices) -------- */
function indicesToRanges(indices: number[]): MatchRange[] {
  if (!indices.length) return []
  const sorted = [...new Set(indices)].sort((a, b) => a - b)
  const ranges: MatchRange[] = []
  let start = sorted[0]
  let end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) end = sorted[i]
    else {
      ranges.push([start, end])
      start = end = sorted[i]
    }
  }
  ranges.push([start, end])
  return ranges
}

/* ---- subsequence fine scorer + indices (from fuzzysort algorithm) ------- */
function isBeginning(target: string, i: number): boolean {
  if (i === 0) return true
  const p = target[i - 1]
  if (p === ' ' || p === '-' || p === '_' || p === '/' || p === '.') return true
  // camelCase boundary
  return p >= 'a' && p <= 'z' && target[i] >= 'A' && target[i] <= 'Z'
}

/**
 * Greedy in-order subsequence match. Returns matched char indices and a
 * fine score in (0,1) rewarding beginning-of-word hits and contiguity,
 * or null when `search` is not a subsequence of `target`.
 */
function subsequence(
  searchLower: string,
  targetOrig: string,
  targetLower: string,
): { indices: number[]; score: number } | null {
  const idx: number[] = []
  let ti = 0
  for (let si = 0; si < searchLower.length; si++) {
    const c = searchLower[si]
    let found = -1
    for (let j = ti; j < targetLower.length; j++)
      if (targetLower[j] === c) {
        found = j
        break
      }
    if (found === -1) return null
    idx.push(found)
    ti = found + 1
  }
  // score: bonuses for beginning hits + contiguity, penalty for spread
  let bonus = 0
  for (let k = 0; k < idx.length; k++) {
    if (isBeginning(targetOrig, idx[k])) bonus += 0.7
    if (k > 0 && idx[k] === idx[k - 1] + 1) bonus += 0.5 // contiguous
  }
  const spread = idx[idx.length - 1] - idx[0] + 1
  const density = searchLower.length / spread // 1 = contiguous
  const headStart = 1 / (1 + idx[0]) // earlier first match is better
  const raw =
    density * 0.5 +
    headStart * 0.2 +
    (bonus / (idx.length * 1.2)) * 0.3
  // keep strictly below the next tier so MATCHES never beats CONTAINS
  return { indices: idx, score: Math.min(0.999, raw) }
}

/* ---- extended query parsing (from Fuse parseQuery) ---------------------- */
type Op = 'fuzzy' | 'exact' | 'include' | 'prefix' | 'suffix'
interface Clause {
  op: Op
  term: string
  negate: boolean
}

function parseQuery(query: string): Clause[] {
  const clauses: Clause[] = []
  for (let raw of query.trim().split(/\s+/)) {
    if (!raw) continue
    let negate = false
    if (raw[0] === '!') {
      negate = true
      raw = raw.slice(1)
    }
    let op: Op = 'fuzzy'
    if (raw[0] === '=') {
      op = 'exact'
      raw = raw.slice(1)
    } else if (raw[0] === "'") {
      op = 'include'
      raw = raw.slice(1)
    } else if (raw[0] === '^' && raw[raw.length - 1] === '$') {
      op = 'exact'
      raw = raw.slice(1, -1)
    } else if (raw[0] === '^') {
      op = 'prefix'
      raw = raw.slice(1)
    } else if (raw[raw.length - 1] === '$') {
      op = 'suffix'
      raw = raw.slice(0, -1)
    }
    if (raw) clauses.push({ op, term: raw, negate })
  }
  return clauses
}

/* ---- single clause vs single field -------------------------------------- */
interface ClauseHit {
  matched: boolean
  rank: number
  indices: number[]
}

function matchClause(
  clause: Clause,
  fieldOrig: string,
  keepDiacritics: boolean,
): ClauseHit {
  const orig = prep(fieldOrig, keepDiacritics)
  const lowerField = orig.toLowerCase()
  const lowerTerm = prep(clause.term, keepDiacritics).toLowerCase()
  const termLen = lowerTerm.length
  const span = (at: number): number[] => {
    const r: number[] = []
    for (let i = 0; i < termLen; i++) r.push(at + i)
    return r
  }

  if (clause.op === 'exact') {
    if (orig === clause.term)
      return { matched: true, rank: Rankings.CASE_SENSITIVE_EQUAL, indices: span(0) }
    if (lowerField === lowerTerm)
      return { matched: true, rank: Rankings.EQUAL, indices: span(0) }
    return { matched: false, rank: Rankings.NO_MATCH, indices: [] }
  }

  if (clause.op === 'prefix') {
    if (lowerField.startsWith(lowerTerm))
      return { matched: true, rank: Rankings.STARTS_WITH, indices: span(0) }
    return { matched: false, rank: Rankings.NO_MATCH, indices: [] }
  }

  if (clause.op === 'suffix') {
    if (lowerField.endsWith(lowerTerm))
      return {
        matched: true,
        rank: Rankings.CONTAINS,
        indices: span(lowerField.length - termLen),
      }
    return { matched: false, rank: Rankings.NO_MATCH, indices: [] }
  }

  if (clause.op === 'include') {
    const at = lowerField.indexOf(lowerTerm)
    if (at > -1) return { matched: true, rank: Rankings.CONTAINS, indices: span(at) }
    return { matched: false, rank: Rankings.NO_MATCH, indices: [] }
  }

  // op === 'fuzzy' — full match-sorter tier ladder
  if (orig === clause.term)
    return { matched: true, rank: Rankings.CASE_SENSITIVE_EQUAL, indices: span(0) }
  if (lowerField === lowerTerm)
    return { matched: true, rank: Rankings.EQUAL, indices: span(0) }

  const at = lowerField.indexOf(lowerTerm)
  if (at === 0)
    return { matched: true, rank: Rankings.STARTS_WITH, indices: span(0) }
  if (at > 0) {
    if (lowerField[at - 1] === ' ')
      return { matched: true, rank: Rankings.WORD_STARTS_WITH, indices: span(at) }
    return { matched: true, rank: Rankings.CONTAINS, indices: span(at) }
  }
  if (termLen === 1) return { matched: false, rank: Rankings.NO_MATCH, indices: [] }

  const acr = acronym(lowerField)
  const acrAt = acr.indexOf(lowerTerm)
  if (acrAt > -1) {
    // map acronym positions back to original char positions
    const positions: number[] = []
    let prev = ' '
    let a = 0
    for (let i = 0; i < lowerField.length; i++) {
      const ch = lowerField[i]
      const prevDelim = prev === ' ' || prev === '-'
      const currDelim = ch === ' ' || ch === '-'
      if (prevDelim && !currDelim) {
        if (a >= acrAt && a < acrAt + termLen) positions.push(i)
        a++
      }
      prev = ch
    }
    return { matched: true, rank: Rankings.ACRONYM, indices: positions }
  }

  const sub = subsequence(lowerTerm, orig, lowerField)
  if (sub) return { matched: true, rank: Rankings.MATCHES, indices: sub.indices }
  return { matched: false, rank: Rankings.NO_MATCH, indices: [] }
}

/* ---- AND-combine all clauses against one field -------------------------- */
function matchField(
  clauses: Clause[],
  searchBits: number,
  field: string,
  keepDiacritics: boolean,
): { rank: number; indices: number[] } | null {
  const lowerField = prep(field, keepDiacritics).toLowerCase()
  // fuzzysort bitflag early-out: every search char class must be present
  if ((searchBits & bitflags(lowerField)) !== searchBits) {
    // only safe to bail when all clauses are positive (negation can still pass)
    if (!clauses.some((c) => c.negate)) return null
  }
  let weakest = Rankings.CASE_SENSITIVE_EQUAL
  const indices: number[] = []
  let anyPositive = false
  for (const clause of clauses) {
    const hit = matchClause(clause, field, keepDiacritics)
    if (clause.negate) {
      if (hit.matched) return null // must NOT match
      continue
    }
    anyPositive = true
    if (!hit.matched) return null // AND semantics: every positive clause must match
    if (hit.rank < weakest) weakest = hit.rank // weakest-link tier
    indices.push(...hit.indices)
  }
  if (!anyPositive) weakest = Rankings.MATCHES // pure-negation query: include survivors
  return { rank: weakest, indices }
}

/* ---- public API --------------------------------------------------------- */
export function fuzzySearch<T>(
  items: ReadonlyArray<T>,
  query: string,
  options: FuzzySearchOptions<T> = {},
): Array<FuzzyResult<T>> {
  const {
    keys,
    limit,
    threshold = Rankings.MATCHES,
    keepDiacritics = false,
    baseSort = (a, b) => a.localeCompare(b),
  } = options

  const clauses = parseQuery(query)
  if (!clauses.length) return []
  const searchBits = bitflags(
    prep(clauses.filter((c) => !c.negate).map((c) => c.term).join(''), keepDiacritics).toLowerCase(),
  )

  const results: Array<FuzzyResult<T> & { keyIndex: number; rankedValue: string }> = []

  items.forEach((item, refIndex) => {
    let best: { rank: number; keyIndex: number; value: string; key?: string; indices: number[] } | null = null
    const matches: FuzzyFieldMatch[] = []

    if (!keys) {
      const field = String(item)
      const m = matchField(clauses, searchBits, field, keepDiacritics)
      if (m && m.rank >= threshold) {
        best = { rank: m.rank, keyIndex: -1, value: field, indices: m.indices }
        matches.push({ value: field, indices: indicesToRanges(m.indices) })
      }
    } else {
      keys.forEach((key, keyIndex) => {
        for (const field of getValues(item, key)) {
          const m = matchField(clauses, searchBits, field, keepDiacritics)
          if (!m || m.rank < threshold) continue
          matches.push({ key, value: field, indices: indicesToRanges(m.indices) })
          // match-sorter: pick highest rank, earliest key on ties
          if (
            !best ||
            m.rank > best.rank ||
            (m.rank === best.rank && keyIndex < best.keyIndex)
          ) {
            best = { rank: m.rank, keyIndex, value: field, key, indices: m.indices }
          }
        }
      })
    }

    if (!best) return
    const winner = best as { rank: number; keyIndex: number; value: string; key?: string; indices: number[] }
    // fine score within the winning field for stable tie-break inside a tier
    const fine =
      winner.rank === Rankings.MATCHES
        ? subsequence(
            prep(clauses.find((c) => !c.negate)?.term ?? '', keepDiacritics).toLowerCase(),
            prep(winner.value, keepDiacritics),
            prep(winner.value, keepDiacritics).toLowerCase(),
          )?.score ?? 0
        : 1
    const score = (winner.rank - 1 + fine) / (Rankings.CASE_SENSITIVE_EQUAL - 1 + 1)

    results.push({
      item,
      refIndex,
      score: Math.min(1, score),
      rank: winner.rank,
      key: winner.key,
      matches,
      keyIndex: winner.keyIndex,
      rankedValue: winner.value,
    })
  })

  // deterministic sort (match-sorter sortRankedValues):
  // rank desc -> score desc -> keyIndex asc -> baseSort -> original order
  results.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank
    if (a.score !== b.score) return b.score - a.score
    if (a.keyIndex !== b.keyIndex) return a.keyIndex - b.keyIndex
    const bs = baseSort(a.rankedValue, b.rankedValue)
    if (bs !== 0) return bs
    return a.refIndex - b.refIndex
  })

  const out = results.map(({ keyIndex: _k, rankedValue: _r, ...rest }) => rest)
  return typeof limit === 'number' ? out.slice(0, limit) : out
}

export default fuzzySearch
