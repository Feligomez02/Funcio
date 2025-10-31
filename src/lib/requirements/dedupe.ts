export interface DedupeCandidate {
  id: string;
  text: string;
}

export interface DuplicateGroup {
  representativeId: string;
  duplicates: string[];
}

export interface DedupeOptions {
  /**
   * Similarity threshold between 0 and 1.
   * Defaults to 0.82 which balances recall/precision for short requirement sentences.
   */
  threshold?: number;
  /**
   * Minimum normalized length required to consider a candidate for dedupe.
   * Defaults to 20 characters.
   */
  minLength?: number;
}

const DEFAULT_THRESHOLD = 0.82;
const DEFAULT_MIN_LENGTH = 20;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`´'’"“”]/g, "")
    .replace(/[^a-z0-9áéíóúüñ\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text: string): string[] =>
  normalize(text)
    .split(" ")
    .filter((token) => token.length > 2);

const jaccard = (aTokens: string[], bTokens: string[]) => {
  if (aTokens.length === 0 || bTokens.length === 0) {
    return 0;
  }

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);

  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  const union = aSet.size + bSet.size - intersection;
  if (union === 0) {
    return 0;
  }

  return intersection / union;
};

const dice = (aTokens: string[], bTokens: string[]) => {
  if (aTokens.length === 0 || bTokens.length === 0) {
    return 0;
  }

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      overlap += 1;
    }
  }

  return (2 * overlap) / (aSet.size + bSet.size);
};

const similarity = (aTokens: string[], bTokens: string[]) => {
  const j = jaccard(aTokens, bTokens);
  const d = dice(aTokens, bTokens);

  return (j + d) / 2;
};

export function groupDuplicates(
  candidates: DedupeCandidate[],
  options: DedupeOptions = {},
): DuplicateGroup[] {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;

  if (!candidates.length) {
    return [];
  }

  const normalizedTokens = new Map<
    string,
    { tokens: string[]; normalized: string }
  >();

  const getTokens = (candidate: DedupeCandidate) => {
    if (!normalizedTokens.has(candidate.id)) {
      const normalized = normalize(candidate.text);
      normalizedTokens.set(candidate.id, {
        normalized,
        tokens: tokenize(candidate.text),
      });
    }

    return normalizedTokens.get(candidate.id)!;
  };

  const visited = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const current = candidates[i];
    if (visited.has(current.id)) {
      continue;
    }

    const { tokens: currentTokens, normalized: currentNormalized } =
      getTokens(current);

    if (currentNormalized.length < minLength || currentTokens.length === 0) {
      visited.add(current.id);
      continue;
    }

    const groupIds: string[] = [];

    for (let j = i + 1; j < candidates.length; j += 1) {
      const other = candidates[j];
      if (visited.has(other.id)) {
        continue;
      }

      const { tokens: otherTokens, normalized: otherNormalized } =
        getTokens(other);

      if (otherNormalized.length < minLength || otherTokens.length === 0) {
        continue;
      }

      if (currentNormalized === otherNormalized) {
        groupIds.push(other.id);
        visited.add(other.id);
        continue;
      }

      const score = similarity(currentTokens, otherTokens);
      if (score >= threshold) {
        groupIds.push(other.id);
        visited.add(other.id);
      }
    }

    visited.add(current.id);
    if (groupIds.length > 0) {
      groups.push({
        representativeId: current.id,
        duplicates: groupIds,
      });
    }
  }

  return groups;
}
