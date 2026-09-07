/**
 * roomlab 本地联机启动器：一个进程同时提供
 *   ① HTTP 静态服务器（提供 roomlab.html 给手机访问）
 *   ② PeerJS 信令服务器（双机 WebRTC 配对握手）
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

// ---------- ① 静态服务器 ----------
http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { p = '/'; }
  if (p === '/') p = '/roomlab.html';
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
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
