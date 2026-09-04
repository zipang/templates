/** Static file server for the built documentation site. */

/** File extensions served with an explicit Content-Type. */
const MIME_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".ico": "image/x-icon"
};

/**
 * Resolve a request path to a file inside the built site.
 *
 * `/` maps to `index.html`, extension-less paths get `.html` appended, and
 * traversal outside `dist/` resolves to `null`.
 *
 * @param pathname - The URL pathname of the request.
 * @returns The path to serve, or `null` when the request cannot be served.
 */
const resolveFile = (pathname: string): string | null => {
	const distDir = `${import.meta.dir}/../dist`;
	const decoded = decodeURIComponent(pathname);
	const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
	const withSuffix = relative === "" || relative.endsWith("/") ? `${relative}index.html` : relative;
	const candidate = `${distDir}/${withSuffix}`;

	if (!candidate.startsWith(distDir)) {
		return null;
	}

	return candidate;
};

const server = Bun.serve({
	port: Number(process.env.PORT ?? 4173),
	async fetch(request) {
		const { pathname } = new URL(request.url);
		let file = resolveFile(pathname);

		if (file === null || !(await Bun.file(file).exists())) {
			file = resolveFile("/index.html");
		}

		if (file === null) {
			return new Response("Not found", { status: 404 });
		}

		const extension = file.slice(file.lastIndexOf("."));
		const contentType = MIME_TYPES[extension] ?? "application/octet-stream";

		return new Response(Bun.file(file), { headers: { "Content-Type": contentType } });
	}
});

console.log(`Documentation served at http://localhost:${server.port}/`);
