export type DiffSegment = {
  type: "same" | "add" | "remove";
  text: string;
};

type SegmenterLike = {
  segment: (input: string) => Iterable<{ segment: string }>;
};

function splitSentences(text: string): string[] {
  if (!text.trim()) return [];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const SegmenterCtor = (
        Intl as unknown as {
          Segmenter: new (
            locale: string,
            options: { granularity: "sentence" },
          ) => SegmenterLike;
        }
      ).Segmenter;
      const segmenter = new SegmenterCtor("zh", { granularity: "sentence" });
      const parts = [...segmenter.segment(text)]
        .map((item) => item.segment)
        .filter((item) => item.length > 0);
      if (parts.length > 0) return parts;
    } catch {
      // fall through to regex
    }
  }
  return text.split(/(?<=[。！？!?；;\n])/).filter((item) => item.length > 0);
}

export function sentenceDiff(before: string, after: string): DiffSegment[] {
  const a = splitSentences(before);
  const b = splitSentences(after);

  if (a.length === 0 && b.length === 0) return [];
  if (a.length === 0) return b.map((text) => ({ type: "add", text }));
  if (b.length === 0) return a.map((text) => ({ type: "remove", text }));

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const raw: DiffSegment[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      raw.push({ type: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ type: "remove", text: a[i] });
      i += 1;
    } else {
      raw.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) {
    raw.push({ type: "remove", text: a[i] });
    i += 1;
  }
  while (j < b.length) {
    raw.push({ type: "add", text: b[j] });
    j += 1;
  }

  const merged: DiffSegment[] = [];
  for (const segment of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === segment.type) {
      last.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
  }
  return merged;
}

export function diffStats(segments: DiffSegment[]) {
  return {
    added: segments
      .filter((segment) => segment.type === "add")
      .reduce((sum, segment) => sum + segment.text.length, 0),
    removed: segments
      .filter((segment) => segment.type === "remove")
      .reduce((sum, segment) => sum + segment.text.length, 0),
    unchanged: segments
      .filter((segment) => segment.type === "same")
      .reduce((sum, segment) => sum + segment.text.length, 0),
  };
}
