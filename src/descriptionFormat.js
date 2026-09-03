export const stripDescriptionFormatting = (value) =>
  String(value || "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/^(#{1,3}|[-*])\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const formatDescriptionSelection = (
  value,
  start,
  end,
  before,
  after = before,
  placeholder = "texto",
) => {
  const current = String(value || "");
  const selected = current.slice(start, end) || placeholder;
  return {
    value: `${current.slice(0, start)}${before}${selected}${after}${current.slice(end)}`,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
};

export const prefixDescriptionLines = (value, start, end, prefix) => {
  const current = String(value || "");
  const lineStart = current.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = current.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? current.length : nextBreak;
  const block = current
    .slice(lineStart, lineEnd)
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  return {
    value: `${current.slice(0, lineStart)}${block}${current.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + block.length,
  };
};
