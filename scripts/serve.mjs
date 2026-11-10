import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';

const host = '127.0.0.1';
const port = 4178;
const root = new URL('../', import.meta.url);
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

const server = createServer(async (request, response) => {
  function respond(status, type, body) {
    response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
    console.log(request.method + ' ' + status);
  }

  const plain = 'text/plain; charset=utf-8';
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    respond(405, plain, 'Método não permitido.');
    return;
  }

  const pathname = request.url.split('?')[0];
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  const publicFile = pathname === '/' || pathname === '/index.html' ||
    /^\/(css|js|assets)\/(?:[\w-]+\/)*[\w-]+\.[a-z]+$/.test(pathname);
  const type = contentTypes.get(extname(file));
  if (!publicFile || !type) {
    respond(404, plain, 'Arquivo não encontrado.');
    return;
  }

  try {
    const body = await readFile(new URL(file, root));
    respond(200, type, body);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      respond(404, plain, 'Arquivo não encontrado.');
      return;
    }
    respond(500, plain, 'Falha ao ler arquivo.');
  }
});

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'A porta ' + port + ' já está em uso.' : 'Falha ao iniciar: ' + error.message);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log('Montante disponível em http://' + host + ':' + port));
