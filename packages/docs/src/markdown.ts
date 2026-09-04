/**
 * Markdown to HTML conversion for the documentation site.
 *
 * `Bun.markdown` is an unstable API (per the Bun docs). This module is the
 * only place that touches it, so a parser swap stays a one-file change.
 */

/** Options for the conversion. `ids` gives every heading an anchor id. */
const MARKDOWN_OPTIONS = { headings: { ids: true } } as const;

/**
 * Convert a markdown string to an HTML fragment.
 *
 * @param markdown - The markdown source of a page body.
 * @returns The HTML fragment to inject into the layout.
 */
export const markdownToHtml = (markdown: string): string =>
	Bun.markdown.html(markdown, MARKDOWN_OPTIONS);
