#!/usr/bin/env node
import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { join, extname } from "path";
import { networkInterfaces } from "os";
import { mime } from "./src/mime.js";
import { renderListing } from "./src/listing.js";
import { handleApiList, handleApiSync } from "./src/api.js";

const ROOT = ".";
const argPort = process.argv.indexOf("-p") !== -1 && process.argv[process.argv.indexOf("-p") + 1];
const PORT = argPort || process.env.PORT || 3000;

createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
  if (urlPath.includes("..")) {
    res.writeHead(400);
    return res.end();
  }

  const fsPath = join(ROOT, urlPath);
  let stat;
  try { stat = statSync(fsPath); } catch {
    res.writeHead(404);
    return res.end("Not found");
  }

  if (stat.isDirectory()) {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(renderListing(fsPath, urlPath));
  }

  const filename = fsPath.split(/[\\/]/).pop();
  const rangeHeader = req.headers['range'];

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
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
    createReadStream(fsPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Content-Type": mime(extname(fsPath)),
      "Content-Length": stat.size,
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(fsPath).pipe(res);
  }

}).listen(PORT, () => {
  const allIps = Object.values(networkInterfaces()).flat().filter(i => i.family === "IPv4" && !i.internal);
  const lanIp = (allIps.find(i => i.address.startsWith("192.168.")) ?? allIps.find(i => i.address.startsWith("172.")) ?? allIps[0])?.address ?? "localhost";
  console.log(`tunnelist — serving "${process.cwd()}" at http://${lanIp}:${PORT}`);
});
