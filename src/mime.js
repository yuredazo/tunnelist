const MIME = {
  // text
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".txt": "text/plain", ".xml": "application/xml",
  ".csv": "text/csv", ".md": "text/markdown",
  // images
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".ico": "image/x-icon", ".avif": "image/avif", ".bmp": "image/bmp",
  // fonts
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  // audio
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
  ".flac": "audio/flac", ".opus": "audio/opus", ".aac": "audio/aac", ".m4a": "audio/mp4",
  // video
  ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo", ".mov": "video/quicktime", ".m4v": "video/mp4",
  // archives
  ".zip": "application/zip", ".gz": "application/gzip", ".tar": "application/x-tar",
  ".7z": "application/x-7z-compressed", ".rar": "application/x-rar-compressed",
  // docs
  ".pdf": "application/pdf",
};

export const mime = ext => MIME[ext.toLowerCase()] ?? "application/octet-stream";
