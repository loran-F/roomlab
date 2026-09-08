/**
 * roomlab 本地联机启动器：一个进程同时提供
 *   ① HTTP 静态服务器（提供 roomlab.html 给手机访问）
 *   ② PeerJS 信令服务器（双机 WebRTC 配对握手）
 *   ③ POST /save 录像保存接口（AB 分屏自动试玩录制用）
 *
 * 用法：node start.js
 * 然后让两台手机连「和电脑同一个 WiFi」，浏览器打开打印出的局域网地址即可。
 * 若开不了内网（路由器隔离），可改用电脑开热点再连。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { PeerServer } = require('peer');

const ROOT = __dirname;
const HTTP_PORT = 8080;
const PEER_PORT = 9000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.md': 'text/plain; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

// ---------- ① 静态服务器 + 录像保存 ----------
http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url || '').split('?')[0] === '/save') {
    const q = (req.url || '').split('?')[1] || '';
    const name = String((q.match(/name=([^&]+)/) || [])[1] || 'rec').replace(/[^\w.\-]/g, '_');
    const chunks = [];
    let size = 0;
    req.on('data', c => { size += c.length; if (size > 400 * 1024 * 1024) { res.writeHead(413); res.end('too large'); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      try {
        const buf = Buffer.concat(chunks);
        if (!buf.length) { res.writeHead(400); res.end('empty'); return; }
        const dir = path.join(ROOT, 'recordings');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const fp = path.join(dir, name);
        fs.writeFileSync(fp, buf);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, size: fs.statSync(fp).size, file: 'recordings/' + name }));
      } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
    });
    return;
  }
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { p = '/'; }
  if (p === '/') p = '/roomlab.html';
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  const mime = MIME[path.extname(fp)] || 'application/octet-stream';
  fs.stat(fp, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end >= st.size) end = st.size - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return; }
      res.writeHead(206, {
        'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Content-Length': end - start + 1
      });
      fs.createReadStream(fp, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store',
        'Content-Length': st.size
      });
      fs.createReadStream(fp).pipe(res);
    }
  });
}).listen(HTTP_PORT, '0.0.0.0', () => console.log(`① 玩法页面   http://<本机局域网IP>:${HTTP_PORT}/roomlab.html?m=catch`));

// ---------- ② PeerJS 信令 ----------
PeerServer({ port: PEER_PORT, path: '/' });
console.log(`② 信令服务   ws://<本机局域网IP>:${PEER_PORT}/（前端通过 ?peer=IP&peerPort=${PEER_PORT}&peerSecure=0 使用）`);

// ---------- 局域网 IP ----------
const nets = os.networkInterfaces();
const ips = [];
for (const k in nets) for (const n of nets[k] || []) if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
console.log('──────────────────────────────────────────────');
console.log('手机访问（手机需与电脑同一 WiFi）:');
ips.forEach(ip => console.log(`  http://${ip}:${HTTP_PORT}/roomlab.html?m=catch&peer=${ip}&peerPort=${PEER_PORT}&peerSecure=0`));
console.log('第一台选「创建房间」控←左移；第二台选「加入房间」输码控→右移。');
console.log('按 Ctrl+C 停止服务。');
