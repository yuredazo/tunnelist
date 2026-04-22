import { statSync, readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const TEMPLATE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "listing.html"),
  "utf8"
);

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function breadcrumbs(urlPath) {
  const parts = urlPath.split("/").filter(Boolean);
  const crumbs = [{ label: "root", href: "/" }];
  parts.forEach((part, i) =>
    crumbs.push({ label: part, href: "/" + parts.slice(0, i + 1).join("/") + "/" })
  );
  return crumbs.map((c, i) =>
    i < crumbs.length - 1
      ? `<a href="${esc(c.href)}" style="font-size:12px;color:#3B82F6;text-decoration:underline;text-underline-offset:2px">${esc(c.label)}</a><span style="font-size:12px;color:#454545;margin:0 6px">/</span>`
      : `<span style="font-size:12px;color:#DDDDDD">${esc(c.label)}</span>`
  ).join("");
}

function renderRow(entry, stat, urlPath) {
  const isDir = entry.isDirectory();
  const href = esc(urlPath.replace(/\/$/, "") + "/" + entry.name + (isDir ? "/" : ""));
  const size = isDir ? "" : formatSize(stat.size);
  const modified = stat.mtime.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const chevron = isDir
    ? `<svg style="width:13px;height:13px;flex-shrink:0" fill="none" stroke="#454545" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
    : `<div style="width:13px;flex-shrink:0"></div>`;
  return `
    <a href="${href}" class="row">
      <div style="width:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${chevron}</div>
      <div style="width:8px;flex-shrink:0"></div>
      <div class="name" style="font-size:13px;color:${isDir ? "#DDDDDD" : "#AAAAAA"}">${esc(entry.name)}</div>
      <div class="dim" style="width:72px">${size}</div>
      <div style="width:16px;flex-shrink:0"></div>
      <div class="dim" style="width:90px">${modified}</div>
      <div style="width:36px;flex-shrink:0"></div>
    </a>`;
}

export function renderListing(fsPath, urlPath) {
  const entries = readdirSync(fsPath, { withFileTypes: true })
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  const rows = entries.map(entry => renderRow(entry, statSync(join(fsPath, entry.name)), urlPath)).join("\n")
    || `<p style="padding:24px 16px;font-size:12px;color:#454545">empty directory</p>`;
  return TEMPLATE
    .replace("{{PATH}}", esc(urlPath))
    .replace("{{BREADCRUMBS}}", breadcrumbs(urlPath))
    .replace("{{ROWS}}", rows)
    .replace("{{COUNT}}", entries.length)
    .replace("{{COUNT_PLURAL}}", entries.length !== 1 ? "s" : "");
}
