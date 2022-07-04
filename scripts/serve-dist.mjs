import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.onnx': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

export function serveDist(distDir, prefix = '/ximage') {
  const root = path.resolve(distDir);
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === prefix) {
      response.writeHead(302, { Location: `${prefix}/` });
      response.end();
      return;
    }
    if (!url.pathname.startsWith(`${prefix}/`)) {
      response.writeHead(404);
      response.end('not found');
      return;
    }
    let relative = decodeURIComponent(url.pathname.slice(prefix.length + 1));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end('forbidden');
      return;
    }
    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404);
        response.end('not found');
        return;
      }
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        server,
        origin: `http://127.0.0.1:${port}${prefix}/`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}
