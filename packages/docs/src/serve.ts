import { join } from "node:path";

/** Static file server for the built documentation site inside www/. */

/** Directory holding the built site. */
const wwwDir = join(import.meta.dir, "../www");

const server = Bun.serve({
	port: Number(process.env.PORT ?? 4173),
	routes: {
		"/": new Response(Bun.file(`${wwwDir}/index.html`))
	},
	/**
	 * Serve an unmatched request from the built site, falling back to the 404 page.
	 *
	 * The pathname comes from `new URL`, which already resolves dot segments, and
	 * is used as-is: only paths naming a real file inside `www/` are served.
	 *
	 * @param request - The incoming request.
	 * @returns The file response, or the built 404 page with status 404.
	 */
	async fetch(request) {
		const { pathname } = new URL(request.url);
		const file = Bun.file(`${wwwDir}${pathname}`);

		if (await file.exists()) {
			return new Response(file);
		}

		return new Response(Bun.file(`${wwwDir}/404.html`), { status: 404 });
	}
});

console.log(`Documentation served at http://localhost:${server.port}/`);
