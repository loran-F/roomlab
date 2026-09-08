/**
 * roomlab 自建信令服务器（PeerJS Server）
 * 用于物资空投联网模式的双人配对信令（WebRTC 握手交换）。
 *
 * 为什么需要它：
 *   PeerJS 默认公共信令云 0.peerjs.com 部署在国外，国内网络访问不稳定，
 *   双人联机会频繁掉线/连不上。部署本服务器到国内可达平台后，前端只需
 *   改一个 host 配置即可切换到自建信令，延迟低、稳定、可控。
 *
 * 依赖：Node.js 18+，npm i peer
 * 启动：node server.js   （默认监听 9000 端口，可用 PORT 环境变量覆盖）
 */
const { PeerServer } = require('peer');

const port = process.env.PORT || 9000;

const server = PeerServer({
  port,
  path: '/',
  // 生产建议开启校验（防陌生人蹭房）：
  // allow_discovery: false,
  // 若平台要求 https，则由平台侧 TLS 终结（见下方部署说明）
});

server.on('connection', (client) => {
  console.log(`[${new Date().toISOString()}] 客户端接入: ${client.getId()}`);
});

server.on('disconnect', (client) => {
  console.log(`[${new Date().toISOString()}] 客户端断开: ${client.getId()}`);
});

server.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] 信令错误:`, err.message);
});

console.log(`roomlab 信令服务器已启动 → ws://localhost:${port}/ （或按平台给定 https/wss 域名）`);
