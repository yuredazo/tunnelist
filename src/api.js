import { createReadStream, statSync } from "fs";
import { readdir } from "fs/promises";
import { join, relative, resolve, sep } from "path";
import { createHash } from "crypto";

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("md5");
    createReadStream(filePath)
      .on("data", chunk => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

async function walkAndHash(dir, baseDir) {
  const results = {};
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      Object.assign(results, await walkAndHash(fullPath, baseDir));
    } else {
      results[relPath] = await hashFile(fullPath);
    }
  }
  return results;
}

function isSafe(rootAbs, fsPath) {
  const resolved = resolve(fsPath);
  return resolved === rootAbs || resolved.startsWith(rootAbs + sep);
}

export async function handleApiList(req, res, root) {
  const rootAbs = resolve(root);
  const url = new URL(req.url, "http://localhost");
  const apiPath = url.searchParams.get("path") || "/";

  const fsPath = join(root, apiPath);
  if (!isSafe(rootAbs, fsPath)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid path" }));
  }

  let entries;
  try {
    const dirents = await readdir(fsPath, { withFileTypes: true });
    entries = dirents
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(entry => {
        try {
          const stat = statSync(join(fsPath, entry.name));
          return { name: entry.name, isDir: entry.isDirectory(), size: stat.size, modified: stat.mtime.toISOString() };
        } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ path: apiPath, entries }));
}

export async function handleApiSync(req, res, root) {
  const rootAbs = resolve(root);
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    let data;
    try { data = JSON.parse(body); } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    const { remotePath = "/", localHashes = {} } = data;
    const fsPath = join(root, remotePath);
    if (!isSafe(rootAbs, fsPath)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Invalid path" }));
    }

    let serverHashes;
    try {
      serverHashes = await walkAndHash(fsPath, fsPath);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Remote path not found" }));
    }

    const toDownload = Object.entries(serverHashes)
      .filter(([rel, hash]) => !localHashes[rel] || localHashes[rel] !== hash)
      .map(([rel]) => {
        try { return { rel, size: statSync(join(fsPath, ...rel.split("/"))).size }; }
        catch { return { rel, size: 0 }; }
      });

    const toDelete = Object.keys(localHashes).filter(rel => !serverHashes[rel]);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ toDownload, toDelete }));
  });
}
