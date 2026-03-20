const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const ping = require('ping');
const os = require('os');
const si = require('systeminformation');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// ─── REST Endpoints ─────────────────────────────────────────────────────────

// Ping a host
app.get('/api/ping', async (req, res) => {
  const host = req.query.host || '8.8.8.8';
  try {
    const result = await ping.promise.probe(host, {
      timeout: 4,
      extra: ['-c', '4'],
    });
    res.json({
      host,
      alive: result.alive,
      time: result.time === 'unknown' ? null : parseFloat(result.time),
      min: result.min === 'unknown' ? null : parseFloat(result.min),
      max: result.max === 'unknown' ? null : parseFloat(result.max),
      avg: result.avg === 'unknown' ? null : parseFloat(result.avg),
      packetLoss: parseFloat(result.packetLoss) || 0,
    });
  } catch (err) {
    res.json({ host, alive: false, time: null, packetLoss: 100, error: err.message });
  }
});

// System & network status
app.get('/api/status', async (req, res) => {
  try {
    const [netStats, networkInterfaces, mem, load] = await Promise.all([
      si.networkStats(),
      si.networkInterfaces(),
      si.mem(),
      si.currentLoad(),
    ]);
    res.json({
      uptime: os.uptime(),
      hostname: os.hostname(),
      platform: os.platform(),
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usedPercent: Math.round((mem.used / mem.total) * 100),
      },
      cpu: {
        load: Math.round(load.currentLoad),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
      },
      networkInterfaces: networkInterfaces.map(iface => ({
        iface: iface.iface,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        type: iface.type,
        speed: iface.speed,
        operstate: iface.operstate,
      })),
      netStats: netStats.map(s => ({
        iface: s.iface,
        rxSec: s.rx_sec,
        txSec: s.tx_sec,
        rxTotal: s.rx_bytes,
        txTotal: s.tx_bytes,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WebSocket Live Metrics ───────────────────────────────────────────────────

const PING_HOSTS = ['8.8.8.8', '1.1.1.1', 'google.com', 'cloudflare.com'];

async function collectMetrics() {
  try {
    const [pingResults, netStats, mem, load, networkInterfaces] = await Promise.all([
      Promise.allSettled(
        PING_HOSTS.map(host =>
          ping.promise.probe(host, { timeout: 3, extra: ['-c', '1'] })
            .then(r => ({
              host,
              alive: r.alive,
              latency: r.time === 'unknown' ? null : parseFloat(r.time),
              packetLoss: parseFloat(r.packetLoss) || 0,
            }))
            .catch(() => ({ host, alive: false, latency: null, packetLoss: 100 }))
        )
      ),
      si.networkStats(),
      si.mem(),
      si.currentLoad(),
      si.networkInterfaces(),
    ]);

    const hosts = pingResults.map(r => r.status === 'fulfilled' ? r.value : { alive: false });
    const primaryPing = hosts.find(h => h.host === '8.8.8.8');

    return {
      type: 'metrics',
      timestamp: Date.now(),
      latency: primaryPing?.latency ?? null,
      packetLoss: primaryPing?.packetLoss ?? 0,
      status: primaryPing?.alive
        ? (primaryPing?.packetLoss > 10 ? 'degraded' : 'online')
        : 'offline',
      hosts,
      netStats: netStats.map(s => ({
        iface: s.iface,
        rxSec: Math.max(0, s.rx_sec || 0),
        txSec: Math.max(0, s.tx_sec || 0),
        rxTotal: s.rx_bytes,
        txTotal: s.tx_bytes,
      })),
      memory: {
        usedPercent: Math.round((mem.used / mem.total) * 100),
        used: mem.used,
        total: mem.total,
      },
      cpu: {
        load: Math.round(load.currentLoad),
      },
      networkInterfaces: networkInterfaces.slice(0, 6).map(iface => ({
        iface: iface.iface,
        ip4: iface.ip4,
        mac: iface.mac,
        type: iface.type,
        operstate: iface.operstate,
        speed: iface.speed,
      })),
    };
  } catch (err) {
    return { type: 'error', message: err.message };
  }
}

wss.on('connection', async (ws) => {
  console.log('[WS] Client connected');

  // Send initial snapshot immediately
  const initial = await collectMetrics();
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(initial));
  }

  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// Broadcast to all connected clients every 5 seconds
setInterval(async () => {
  if (wss.clients.size === 0) return;
  const metrics = await collectMetrics();
  const payload = JSON.stringify(metrics);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}, 5000);

server.listen(PORT, () => {
  console.log(`\n🖥️  Network Monitor running at http://localhost:${PORT}\n`);
});
