import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildSite } from "./build";

/** Root of the built documentation site, as written by `buildSite()`. */
const distDir = resolve(import.meta.dir, "..", "dist");

describe("docs build", () => {
	test("builds every page, the stylesheet, and llms.txt", async () => {
		const pages = await buildSite();

		expect(pages.length).toBeGreaterThanOrEqual(3);

		const index = await Bun.file(resolve(distDir, "index.html")).text();

		expect(index).toContain("<!DOCTYPE html>");
		expect(index).toContain("assets/style.css");

		const llms = await Bun.file(resolve(distDir, "llms.txt")).text();

		expect(llms).toContain("# Temples documentation");
		expect(llms).toContain("## Pages");

		for (const page of pages) {
			const html = await Bun.file(resolve(distDir, page.url)).text();

			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain(`href="${page.url}"`);
		}
	});

	test("builds a 404 page that is excluded from the navigation and llms.txt", async () => {
		await buildSite();

		const index = await Bun.file(resolve(distDir, "index.html")).text();
		const llms = await Bun.file(resolve(distDir, "llms.txt")).text();
		const notFound = await Bun.file(resolve(distDir, "404.html")).text();

		expect(notFound).toContain("Page not found");
		expect(notFound).toContain('href="getting-started.html"');

		expect(index).not.toContain('href="404.html"');
		expect(llms).not.toContain("404");
	});

	test("exports each visible page as raw markdown, referenced by llms.txt", async () => {
		await buildSite();

		const markdown = await Bun.file(resolve(distDir, "getting-started.md")).text();

		expect(markdown).toContain("title: Getting started");
		expect(markdown).toContain("# Getting started");

		const llms = await Bun.file(resolve(distDir, "llms.txt")).text();

		expect(llms).toContain("(https://zipang.github.io/Temples/getting-started.md)");
		expect(llms).not.toContain(".html");

		const notFoundMarkdown = Bun.file(resolve(distDir, "404.md"));

		expect(await notFoundMarkdown.exists()).toBe(false);
	});

	test("declares the markdown export as an alternate link in each visible page", async () => {
		await buildSite();

		const page = await Bun.file(resolve(distDir, "getting-started.html")).text();

		expect(page).toContain('<link rel="alternate" type="text/markdown" href="getting-started.md">');

		const notFound = await Bun.file(resolve(distDir, "404.html")).text();

		expect(notFound).not.toContain('type="text/markdown"');
	});
});
