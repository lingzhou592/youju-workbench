export function hashContent(input: {
  title: string;
  body: string;
  tags: string[];
  imageSuggestion?: string[];
}): string {
  const text = JSON.stringify([
    input.title,
    input.body,
    input.tags,
    input.imageSuggestion ?? [],
  ]);

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x9e3779b1);
  }

  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0")
  );
}
