import { describe, expect, test } from "bun:test";
import { buildSite } from "./build";

describe("docs build", () => {
	test("builds every page, the stylesheet, and llms.txt", async () => {
		const pages = await buildSite();

		expect(pages.length).toBeGreaterThanOrEqual(3);

		const index = await Bun.file(import.meta.dir + "/../dist/index.html").text();

		expect(index).toContain("<!DOCTYPE html>");
		expect(index).toContain("assets/style.css");

		const llms = await Bun.file(import.meta.dir + "/../dist/llms.txt").text();

		expect(llms).toContain("# Temples documentation");
		expect(llms).toContain("## Pages");

		for (const page of pages) {
			const html = await Bun.file(import.meta.dir + `/../dist/${page.url}`).text();

			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain(`href="${page.url}"`);
		}
	});
});
