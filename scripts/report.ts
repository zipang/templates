/**
 * Print a size report for every built asset in the workspace.
 *
 * The report walks the dist folder of every package, measures the raw and
 * gzip size of each file, and prints a Markdown table that is ready to paste
 * into documentation. Run `bun run build` first so the dist folders exist.
 */

interface AssetEntry {
	path: string;
	size: number;
	gzip: number;
}

/**
 * Format a byte count as a human readable string with one decimal.
 *
 * @param bytes the byte count to format
 * @returns the formatted size, for example `980 B`, `1.5 kB`, or `1.0 MB`
 */
export const formatBytes = (bytes: number): string => {
	if (bytes < 1024) {
		return `${bytes} B`;
	}

	const kibibytes = bytes / 1024;
	if (kibibytes < 1024) {
		return `${kibibytes.toFixed(1)} kB`;
	}

	return `${(kibibytes / 1024).toFixed(1)} MB`;
};

/**
 * Render the asset entries as a Markdown table with a total row for the
 * minified bundles.
 *
 * @param entries one entry per built asset, sorted in display order
 * @returns the Markdown table
 */
export const renderReport = (entries: AssetEntry[]): string => {
	const rows = entries.map(
		(entry) => `| ${entry.path} | ${formatBytes(entry.size)} | ${formatBytes(entry.gzip)} |`
	);

	const minified = entries.filter((entry) => entry.path.endsWith(".min.js"));
	const totalSize = minified.reduce((sum, entry) => sum + entry.size, 0);
	const totalGzip = minified.reduce((sum, entry) => sum + entry.gzip, 0);
	const totalRow = `| total (.min.js) | ${formatBytes(totalSize)} | ${formatBytes(totalGzip)} |`;

	return ["| Asset | Raw | Gzip |", "|-------|-----|------|", ...rows, totalRow].join("\n");
};

/**
 * The dependency layers of the packages, from the core engine to the
 * packages built on top of it. The summary table follows this order.
 */
const PACKAGE_ORDER = ["engine", "components", "ssr", "jquery"];

/**
 * Render a per-package summary of the minified bundles, ready to paste into
 * the README.
 *
 * @param entries one entry per built asset
 * @returns the Markdown table with one row per package, ordered by layer
 */
export const renderSummary = (entries: AssetEntry[]): string => {
	const byPackage = new Map<string, AssetEntry[]>();

	for (const entry of entries) {
		if (!entry.path.endsWith(".min.js")) {
			continue;
		}

		const parts = entry.path.split("/");
		const packageName = parts[1];
		if (packageName === undefined) {
			continue;
		}

		const existing = byPackage.get(packageName) ?? [];
		byPackage.set(packageName, [...existing, entry]);
	}

	const rank = (packageName: string): number => {
		const index = PACKAGE_ORDER.indexOf(packageName);
		return index === -1 ? PACKAGE_ORDER.length : index;
	};

	const rows = [...byPackage]
		.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
		.map(([packageName, list]) => {
			const size = list.reduce((sum, entry) => sum + entry.size, 0);
			const gzip = list.reduce((sum, entry) => sum + entry.gzip, 0);
			return `| \`@temples/${packageName}\` | ${formatBytes(size)} | ${formatBytes(gzip)} |`;
		});

	return ["| Package | Minified | Gzip |", "|---------|----------|------|", ...rows].join("\n");
};

if (import.meta.main) {
	const glob = new Bun.Glob("packages/*/dist/**/*");
	const paths = [...glob.scanSync({ onlyFiles: true })].sort();

	if (paths.length === 0) {
		console.error("No build output found. Run `bun run build` first.");
		process.exit(1);
	}

	const entries = await Promise.all(
		paths.map(async (path) => {
			const data = await Bun.file(path).bytes();
			return { path, size: data.length, gzip: Bun.gzipSync(data).length };
		})
	);

	console.log(process.argv.includes("--summary") ? renderSummary(entries) : renderReport(entries));
}
