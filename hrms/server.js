import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
  // Normalize URL path and parse query parameters out
  let urlPath = req.url || '/';
  const questionMarkIndex = urlPath.indexOf('?');
  if (questionMarkIndex !== -1) {
    urlPath = urlPath.substring(0, questionMarkIndex);
  }
  const hashIndex = urlPath.indexOf('#');
  if (hashIndex !== -1) {
    urlPath = urlPath.substring(0, hashIndex);
  }

  let filePath = path.join(__dirname, 'dist', urlPath === '/' ? 'index.html' : urlPath);

  // Check if file exists, if not fall back to index.html (crucial for client-side routing)
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      filePath = path.join(__dirname, 'dist', 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Server Error: Failed to read file');
      } else {
        // Cache static assets for performance
        const headers = { 'Content-Type': contentType };
        if (filePath !== path.join(__dirname, 'dist', 'index.html')) {
          headers['Cache-Control'] = 'public, max-age=15552000, immutable';
        } else {
          headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
        }
        res.writeHead(200, headers);
        res.end(content, 'utf-8');
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Node.js Production Server running on port ${PORT}`);
});
