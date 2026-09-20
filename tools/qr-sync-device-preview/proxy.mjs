import http from 'node:http';

// HTTPS トンネルから届く /100/ はビルド済みアプリへ、それ以外の Firestore SDK
// リクエストはローカルのエミュレータへ流す。同一 origin なので端末側の CORS 設定は不要。
//
// エミュレータは 8089。規則試験（tests/rules）が使う 8088 とわざと分けてある。
// 同じ港だと、端末確認を動かしたままでは規則試験が「port taken」で走らない。
const port = Number(process.env.QR_PREVIEW_PROXY_PORT ?? 4180);
const firestorePort = Number(process.env.QR_PREVIEW_FIRESTORE_PORT ?? 8089);
http.createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (pathname === '/') {
    response.writeHead(302, { Location: '/100/' });
    response.end();
    return;
  }
  const appRequest = pathname.startsWith('/100/');
  const upstream = http.request({
    hostname: '127.0.0.1', port: appRequest ? 4173 : firestorePort,
    method: request.method, path: request.url, headers: { ...request.headers, host: `127.0.0.1:${appRequest ? 4173 : firestorePort}` },
  }, (result) => {
    response.writeHead(result.statusCode ?? 502, result.headers);
    result.pipe(response);
  });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('Preview service unavailable'); });
  request.pipe(upstream);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`QR sync preview proxy: http://127.0.0.1:${port}/100/\n`);
});
