import { describe, expect, test } from "bun:test";
import { formatBytes, renderReport, renderSummary } from "./report";

describe("formatBytes", () => {
	test("formats byte counts below one kibibyte", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(980)).toBe("980 B");
	});

	test("formats kibibyte counts with one decimal", () => {
		expect(formatBytes(1500)).toBe("1.5 kB");
	});

	test("formats mebibyte counts with one decimal", () => {
		expect(formatBytes(1048576)).toBe("1.0 MB");
	});
});

describe("renderReport", () => {
	const entries = [
		{ gzip: 6144, path: "packages/engine/dist/engine.js", size: 20480 },
		{ gzip: 3072, path: "packages/engine/dist/engine.min.js", size: 10240 },
		{ gzip: 256, path: "packages/engine/dist/engine.d.ts", size: 512 }
	];

	const report = renderReport(entries);

	test("lists every asset with its raw and gzip size", () => {
		expect(report).toContain("| packages/engine/dist/engine.min.js | 10.0 kB | 3.0 kB |");
		expect(report).toContain("| packages/engine/dist/engine.d.ts | 512 B | 256 B |");
	});

	test("totals only the minified bundles", () => {
		expect(report).toContain("| total (.min.js) | 10.0 kB | 3.0 kB |");
	});
});

describe("renderSummary", () => {
	const entries = [
		{ gzip: 1536, path: "packages/components/dist/component.min.js", size: 5120 },
		{ gzip: 3072, path: "packages/engine/dist/engine.min.js", size: 10240 },
		{ gzip: 512, path: "packages/engine/dist/engine.d.ts", size: 1024 }
	];

	const summary = renderSummary(entries);

	test("lists the packages from the core engine to the packages built on it", () => {
		expect(summary.indexOf("@temples/engine")).toBeLessThan(summary.indexOf("@temples/components"));
	});

	test("excludes the total row", () => {
		expect(summary).not.toContain("all packages");
	});
});
