import { describe, expect, test } from "bun:test";
import { buildSite } from "./build";

describe("docs build", () => {
	test("builds every page, the stylesheet, and llms.txt", async () => {
		const pages = await buildSite();

		expect(pages.length).toBeGreaterThanOrEqual(3);

		const index = await Bun.file(`${import.meta.dir}/../dist/index.html`).text();

		expect(index).toContain("<!DOCTYPE html>");
		expect(index).toContain("assets/style.css");

		const llms = await Bun.file(`${import.meta.dir}/../dist/llms.txt`).text();

		expect(llms).toContain("# Temples documentation");
		expect(llms).toContain("## Pages");

		for (const page of pages) {
			const html = await Bun.file(`${import.meta.dir}/../dist/${page.url}`).text();

			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain(`href="${page.url}"`);
		}
	});

	test("builds a 404 page that is excluded from the navigation and llms.txt", async () => {
		await buildSite();

		const index = await Bun.file(`${import.meta.dir}/../dist/index.html`).text();
		const llms = await Bun.file(`${import.meta.dir}/../dist/llms.txt`).text();
		const notFound = await Bun.file(`${import.meta.dir}/../dist/404.html`).text();

		expect(notFound).toContain("Page not found");
		expect(notFound).toContain('href="getting-started.html"');

		expect(index).not.toContain('href="404.html"');
		expect(llms).not.toContain("404");
	});

	test("exports each visible page as raw markdown, referenced by llms.txt", async () => {
		await buildSite();

		const markdown = await Bun.file(`${import.meta.dir}/../dist/getting-started.md`).text();

		expect(markdown).toContain("title: Getting started");
		expect(markdown).toContain("# Getting started");

		const llms = await Bun.file(`${import.meta.dir}/../dist/llms.txt`).text();

		expect(llms).toContain("(https://zipang.github.io/Temples/getting-started.md)");
		expect(llms).not.toContain(".html");

		const notFoundMarkdown = Bun.file(`${import.meta.dir}/../dist/404.md`);

		expect(await notFoundMarkdown.exists()).toBe(false);
	});
});
