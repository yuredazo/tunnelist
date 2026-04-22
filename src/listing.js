import { statSync, readdirSync } from "fs";
import { join } from "path";

const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{PATH}} — tunnelist</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0C0C0C] text-[#DDDDDD] min-h-screen" style="font-family:Consolas,'Courier New',monospace">

  <div class="max-w-4xl mx-auto border-x border-[#1D1D1D] min-h-screen">

    <div class="flex items-center px-4 border-b border-[#1D1D1D]" style="height:36px">
      {{BREADCRUMBS}}
    </div>

    <div class="flex items-center px-4 bg-[#111111] border-b border-[#1D1D1D]" style="height:28px">
      <div style="width:22px"></div>
      <div class="flex-1" style="font-size:10px;color:#454545;letter-spacing:1.4px;font-weight:600;text-transform:uppercase">Name</div>
      <div class="text-right" style="width:72px;font-size:10px;color:#454545;letter-spacing:1.4px;font-weight:600;text-transform:uppercase">Size</div>
      <div style="width:16px"></div>
      <div class="hidden sm:block text-right" style="width:90px;font-size:10px;color:#454545;letter-spacing:1.4px;font-weight:600;text-transform:uppercase">Modified</div>
      <div style="width:36px"></div>
    </div>

    <div>
      {{ROWS}}
    </div>

    <div class="flex items-center border-t border-[#1D1D1D] px-4" style="height:40px">
      <span style="font-size:11px;color:#454545">{{COUNT}} item{{COUNT_PLURAL}} &middot; tunnelist</span>
    </div>

  </div>

</body>
</html>`;

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
      ? `<a href="${c.href}" style="font-size:12px;color:#3B82F6;text-decoration:underline;text-underline-offset:2px">${c.label}</a><span style="font-size:12px;color:#454545;margin:0 6px">/</span>`
      : `<span style="font-size:12px;color:#DDDDDD">${c.label}</span>`
  ).join("");
}

function renderRow(entry, stat, urlPath) {
  const isDir = entry.isDirectory();
  const href = urlPath.replace(/\/$/, "") + "/" + entry.name + (isDir ? "/" : "");
  const size = isDir ? "" : formatSize(stat.size);
  const modified = stat.mtime.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const chevron = isDir
    ? `<svg style="width:13px;height:13px;flex-shrink:0" fill="none" stroke="#454545" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>`
    : ``;
  const nameColor = isDir ? "#DDDDDD" : "#AAAAAA";
  return `
    <a href="${href}" class="flex items-center px-4 border-b border-[#1D1D1D] hover:bg-[#111111]" style="height:34px;text-decoration:none;transition:background-color 80ms">
      <div style="width:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center">${chevron}</div>
      <div style="width:8px;flex-shrink:0"></div>
      <div class="flex-1 truncate" style="font-size:13px;color:${nameColor}">${entry.name}</div>
      <div style="width:72px;font-size:11px;color:#454545;text-align:right;flex-shrink:0">${size}</div>
      <div style="width:16px;flex-shrink:0"></div>
      <div class="hidden sm:block" style="width:90px;font-size:11px;color:#454545;text-align:right;flex-shrink:0">${modified}</div>
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
    .replace("{{PATH}}", urlPath)
    .replace("{{BREADCRUMBS}}", breadcrumbs(urlPath))
    .replace("{{ROWS}}", rows)
    .replace("{{COUNT}}", entries.length)
    .replace("{{COUNT_PLURAL}}", entries.length !== 1 ? "s" : "");
}
