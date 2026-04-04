/**
 * Markdown export and conversion utilities.
 */

/**
 * Convert markdown string to plain text (strip formatting).
 */
export function markdownToText(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s*(.+)\n/g, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // code
    .replace(/\[(.+?)\]\((.+?)\)/g, "$2") // links
    .replace(/<!--[\s\S]*?-->/g, "") // HTML comments
    .trim();
}

