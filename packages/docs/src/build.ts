import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { prepare } from "@temples/ssr";
import { markdownToHtml } from "./markdown";

/** Root directory of the docs workspace. */
const DOCS_DIR = resolve(import.meta.dir, "..");

/** Public URL of the deployed site, used for the absolute links in llms.txt. */
const BASE_URL = "https://zipang.github.io/temples";

/** The directory holding the markdown sources. */
const CONTENT_DIR = resolve(DOCS_DIR, "content");

/** The directory receiving the built site. */
const WWW_DIR = resolve(DOCS_DIR, "www");

/** Front-matter and body of one markdown source file. */
interface PageSource {
	slug: string;
	title: string;
	description: string;
	order: number;
	hidden: boolean;
	markdown: string;
}

/** Metadata of one built page, as consumed by the layout and llms.txt. */
interface PageMeta extends Record<string, string> {
	slug: string;
	title: string;
	description: string;
	/** URL of the rendered page, relative to the site root. */
	url: string;
	/** URL of the raw markdown export, relative to the site root. */
	markdownUrl: string;
}

/**
 * Parse a `---` delimited front-matter block from the top of a markdown file.
 *
 * Each line of the block holds a `key: value` pair. Unknown keys are ignored.
 *
 * @param raw - The full markdown file content.
 * @param slug - The page slug, used for error messages.
 * @returns The parsed fields and the markdown body without the block.
 */
const parseFrontMatter = (
	raw: string,
	slug: string
): { fields: Record<string, string>; body: string } => {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);

	if (match === null || match[1] === undefined) {
		throw new Error(`Missing front-matter block in content/${slug}.md`);
	}

	const fields: Record<string, string> = {};

	for (const line of match[1].split(/\r?\n/)) {
		const index = line.indexOf(":");

		if (index > 0) {
			fields[line.slice(0, index).trim()] = line.slice(index + 1).trim();
		}
	}

	return { fields, body: raw.slice(match[0].length) };
};

/**
 * Load every markdown page from `content/`, ordered by the `order` field.
 *
 * @returns The page sources, sorted for the navigation.
 */
const loadPages = async (): Promise<PageSource[]> => {
	const glob = new Bun.Glob("*.md");
	const slugs: string[] = [];

	for await (const file of glob.scan({ cwd: CONTENT_DIR })) {
		slugs.push(file.replace(/\.md$/, ""));
	}

	const pages = await Promise.all(
		slugs.map(async (slug): Promise<PageSource> => {
			const raw = await Bun.file(resolve(CONTENT_DIR, `${slug}.md`)).text();
			const { fields, body } = parseFrontMatter(raw, slug);

			if (fields.title === undefined || fields.title === "") {
				throw new Error(`Missing title in front-matter of content/${slug}.md`);
			}

			return {
				slug,
				title: fields.title,
				description: fields.description ?? "",
				order: Number(fields.order ?? 100),
				hidden: fields.hidden === "true",
				markdown: body
			};
		})
	);

	return pages.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
};

/**
 * Build the llms.txt index consumed by AI coding agents.
 *
 * Each page links to its raw markdown export: agents read markdown, not HTML.
 *
 * @param pages - The metadata of every built page.
 * @returns The llms.txt content.
 */
const buildLlmsTxt = (pages: PageMeta[]): string => {
	const lines = [
		"# temples documentation",
		"",
		"> Declarative HTML templates: plain HTML with data-bind attributes, rendered by a DOM-based engine in the browser and on the server.",
		"",
		"## Pages",
		""
	];

	for (const page of pages) {
		const description = page.description === "" ? page.title : page.description;
		lines.push(`- [${page.title}](${BASE_URL}/${page.markdownUrl}): ${description}`);
	}

	lines.push("", `Sources: https://github.com/zipang/temples`, "");

	return lines.join("\n");
};

/**
 * Build the static documentation site into `www/`.
 *
 * Every markdown page is converted to HTML, rendered through the temples
 * layout with `@temples/ssr`, and written as `<slug>.html`. Its raw markdown
 * source is copied next to it as `<slug>.md`, for agents reading plain text.
 * The stylesheet and an `llms.txt` agent index are emitted alongside; the
 * index references the markdown exports. Pages with `hidden: true` are built
 * but excluded from the navigation, the markdown exports, and `llms.txt`.
 *
 * @returns The metadata of every built page.
 */
export const buildSite = async (): Promise<PageMeta[]> => {
	const sources = await loadPages();
	const metas: PageMeta[] = sources
		.filter((source) => !source.hidden)
		.map((page) => ({
			slug: page.slug,
			title: page.title,
			description: page.description,
			url: `${page.slug}.html`,
			markdownUrl: `${page.slug}.md`
		}));

	const layout = await Bun.file(resolve(DOCS_DIR, "layout.html")).text();
	const renderLayout = prepare(layout, { removeDataBindings: false });

	await mkdir(WWW_DIR, { recursive: true });

	await Bun.write(
		resolve(WWW_DIR, "assets", "style.css"),
		Bun.file(resolve(DOCS_DIR, "assets", "style.css"))
	);

	for (const source of sources) {
		const html = await renderLayout({
			site: { pages: metas },
			page: {
				title: source.title,
				description: source.description,
				content: markdownToHtml(source.markdown),
				markdownUrl: source.hidden ? "" : `${source.slug}.md`
			}
		});

		await Bun.write(resolve(WWW_DIR, `${source.slug}.html`), html);

		if (!source.hidden) {
			await Bun.write(
				resolve(WWW_DIR, `${source.slug}.md`),
				Bun.file(resolve(CONTENT_DIR, `${source.slug}.md`))
			);
		}
	}

	await Bun.write(resolve(WWW_DIR, "llms.txt"), buildLlmsTxt(metas));

	return metas;
};

if (import.meta.main) {
	const pages = await buildSite();
	console.log(`Built ${pages.length} pages into packages/docs/www:`);

	for (const page of pages) {
		console.log(`  ${page.url}`);
	}
}
