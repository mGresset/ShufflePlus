import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const host = "127.0.0.1";
const port = 5500;
const root = process.cwd();

const mimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json; charset=utf-8"
};

function resolveRequestPath(requestUrl) {
    const url = new URL(requestUrl || "/", `http://${host}:${port}`);
    const decodedPath = decodeURIComponent(url.pathname);
    const relativePath = decodedPath === "/"
        ? "index.html"
        : decodedPath.replace(/^\/+/, "");
    const resolved = path.resolve(root, relativePath);

    if (!resolved.startsWith(root)) {
        return null;
    }

    return resolved;
}

const server = createServer(async (request, response) => {
    try {
        let filePath = resolveRequestPath(request.url);

        if (!filePath) {
            response.writeHead(403).end("Accès refusé");
            return;
        }

        try {
            const details = await stat(filePath);
            if (details.isDirectory()) {
                filePath = path.join(filePath, "index.html");
            }
        } catch {
            filePath = path.join(root, "index.html");
        }

        const body = await readFile(filePath);
        const extension = path.extname(filePath).toLowerCase();

        response.writeHead(200, {
            "Content-Type": mimeTypes[extension] || "application/octet-stream",
            "Cache-Control": "no-store"
        });
        response.end(body);
    } catch (error) {
        console.error(error);
        response.writeHead(500).end("Erreur serveur local");
    }
});

server.listen(port, host, () => {
    console.log(`Shuffle+ local : http://${host}:${port}/`);
    console.log("Arrêt : Ctrl+C");
});
