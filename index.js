#!/usr/bin/env node
import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { join, extname, resolve, sep } from "path";
import { networkInterfaces } from "os";
import { createRequire } from "module";
import { mime } from "./src/mime.js";
import { renderListing } from "./src/listing.js";
import { handleApiList, handleApiSync } from "./src/api.js";

const { version } = createRequire(import.meta.url)("./package.json");
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`tunnelist v${version} — share a folder over your local network

Usage:
  tunnelist [options]

Options:
  -p <port>      Port to listen on (default: 3000, or $PORT)
  -v, --version  Print version
  -h, --help     Show this help`);
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(version);
  process.exit(0);
}

const pIdx = args.indexOf("-p");
let PORT = parseInt(process.env.PORT, 10) || 3000;
if (pIdx !== -1) {
  const raw = args[pIdx + 1];
  const parsed = parseInt(raw, 10);
  if (!raw || isNaN(parsed) || parsed < 1 || parsed > 65535) {
    console.error(`error: -p requires a valid port number (1–65535)`);
    process.exit(1);
  }
  PORT = parsed;
}

const ROOT = ".";
const ROOT_ABS = resolve(ROOT);

function isSafe(fsPath) {
  const r = resolve(fsPath);
  return r === ROOT_ABS || r.startsWith(ROOT_ABS + sep);
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (urlPath === "/api/list" && req.method === "GET") return handleApiList(req, res, ROOT);
  if (urlPath === "/api/sync" && req.method === "POST") return handleApiSync(req, res, ROOT);

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end();
  }

  const fsPath = join(ROOT, urlPath);
  if (!isSafe(fsPath)) {
    res.writeHead(400);
    return res.end();
  }

  let stat;
  try { stat = statSync(resolve(fsPath)); } catch {
    res.writeHead(404);
    return res.end("Not found");
  }

  if (stat.isDirectory()) {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(renderListing(resolve(fsPath), urlPath));
  }

  const filename = fsPath.split(/[\\/]/).pop();
  const rangeHeader = req.headers["range"];

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      "Content-Type": mime(extname(fsPath)),
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(resolve(fsPath), { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Type": mime(extname(fsPath)),
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(resolve(fsPath)).pipe(res);
  }

}).listen(PORT, () => {
  const allIps = Object.values(networkInterfaces()).flat().filter(i => i.family === "IPv4" && !i.internal);
  const lanIp = (allIps.find(i => i.address.startsWith("192.168.")) ?? allIps.find(i => i.address.startsWith("172.")) ?? allIps[0])?.address ?? "localhost";
  console.log(`tunnelist v${version} — serving "${process.cwd()}" at http://${lanIp}:${PORT}`);
});
