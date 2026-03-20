/* ─── app.js ─────────────────────────────────────────────────────────────── */
'use strict';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

function bytesToMbps(bytesPerSec) {
  return ((bytesPerSec * 8) / 1_000_000).toFixed(2);
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function latencyRating(ms) {
  if (ms === null) return { label: 'No data', color: 'var(--text-secondary)' };
  if (ms < 20)   return { label: 'Excellent', color: 'var(--green)' };
  if (ms < 60)   return { label: 'Good', color: 'var(--teal)' };
  if (ms < 120)  return { label: 'Fair', color: 'var(--yellow)' };
  return { label: 'Poor', color: 'var(--red)' };
}

function lossRating(pct) {
  if (pct === 0) return { label: 'Clean', color: 'var(--green)' };
  if (pct < 2)   return { label: 'Minimal', color: 'var(--teal)' };
  if (pct < 10)  return { label: 'Notable', color: 'var(--yellow)' };
  return { label: 'High', color: 'var(--red)' };
}

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

// ─── Clock ─────────────────────────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('headerTime');
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Chart Setup ───────────────────────────────────────────────────────────
const MAX_POINTS = 30; // ~2.5 minutes at 5s intervals

const blueGrad = (ctx) => {
  const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, 'rgba(0,212,255,0.3)');
  g.addColorStop(1, 'rgba(0,212,255,0)');
  return g;
};

const purpleGrad = (ctx) => {
  const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, 'rgba(124,58,237,0.25)');
  g.addColorStop(1, 'rgba(124,58,237,0)');
  return g;
};

const greenGrad = (ctx) => {
  const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, 'rgba(34,197,94,0.25)');
  g.addColorStop(1, 'rgba(34,197,94,0)');
  return g;
};

const orangeGrad = (ctx) => {
  const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, 'rgba(249,115,22,0.25)');
  g.addColorStop(1, 'rgba(249,115,22,0)');
  return g;
};

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeInOutQuart' },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(14,20,40,0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#7a8aaa',
      bodyColor: '#e8edf5',
      padding: 10,
      cornerRadius: 10,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#3a4560', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 8 },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
      ticks: { color: '#3a4560', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 5 },
    },
  },
};

// Latency chart
const latencyCtx = document.getElementById('latencyChart').getContext('2d');
const latencyChart = new Chart(latencyCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: '8.8.8.8',
        data: [],
        borderColor: '#00d4ff',
        backgroundColor: blueGrad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      },
      {
        label: '1.1.1.1',
        data: [],
        borderColor: '#7c3aed',
        backgroundColor: purpleGrad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      },
    ],
  },
  options: {
    ...chartDefaults,
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, title: { display: false }, min: 0 },
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} ms` },
      },
    },
  },
});

// Bandwidth chart
const bwCtx = document.getElementById('bandwidthChart').getContext('2d');
const bwChart = new Chart(bwCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'RX (Download)',
        data: [],
        borderColor: '#22c55e',
        backgroundColor: greenGrad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'TX (Upload)',
        data: [],
        borderColor: '#f97316',
        backgroundColor: orangeGrad,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4,
      },
    ],
  },
  options: {
    ...chartDefaults,
    scales: {
      ...chartDefaults.scales,
      y: { ...chartDefaults.scales.y, min: 0 },
    },
    plugins: {
      ...chartDefaults.plugins,
      tooltip: {
        ...chartDefaults.plugins.tooltip,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mbps` },
      },
    },
  },
});

function pushChartPoint(chart, label, ...values) {
  chart.data.labels.push(label);
  values.forEach((v, i) => chart.data.datasets[i].data.push(v));
  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update('none');
}

// ─── DOM Refs ──────────────────────────────────────────────────────────────
const badge       = document.getElementById('connectionBadge');
const badgeLabel  = document.getElementById('connectionLabel');
const statusCard  = document.getElementById('statusCard');
const statusValue = document.getElementById('statusValue');
const statusIcon  = document.getElementById('statusIcon');

function setStatus(state) {
  const labels = { online: 'Online', degraded: 'Degraded', offline: 'Offline', connecting: 'Connecting…' };
  const icons  = {
    online:   `<svg viewBox="0 0 24 24" fill="none"><path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    degraded: `<svg viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    offline:  `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  };

  badge.className = `connection-badge ${state}`;
  badgeLabel.textContent = labels[state] || state;
  statusValue.textContent = labels[state] || state;
  statusValue.className = `status-value ${state}`;
  statusCard.className = `status-card ${state}`;
  if (icons[state]) statusIcon.innerHTML = icons[state];
}

function setKpi(id, value, unit, barId, barPct, ratingId, ratingText, ratingColor) {
  const valEl  = document.getElementById(id);
  const barEl  = document.getElementById(barId);
  const rateEl = document.getElementById(ratingId);
  if (valEl)  valEl.textContent  = value;
  if (rateEl) { rateEl.textContent = ratingText; rateEl.style.color = ratingColor; }
  if (barEl)  barEl.style.width  = clamp(barPct, 0, 100) + '%';
}

// ─── Metrics Rendering ─────────────────────────────────────────────────────

function renderMetrics(data) {
  // Connection status
  setStatus(data.status || 'offline');

  // Latency
  const ms = data.latency;
  const latRating = latencyRating(ms);
  setKpi(
    'latencyValue', ms !== null ? ms.toFixed(1) : '—', 'ms',
    'latencyBar', ms !== null ? clamp((ms / 300) * 100, 2, 100) : 0,
    'latencyRating', latRating.label, latRating.color
  );
  document.getElementById('latencyValue').style.color = latRating.color;

  // Packet Loss
  const loss = data.packetLoss ?? 0;
  const lossR = lossRating(loss);
  setKpi(
    'packetLossValue', loss.toFixed(1), '%',
    'packetLossBar', loss,
    'packetLossRating', lossR.label, lossR.color
  );
  document.getElementById('packetLossValue').style.color = lossR.color;

  // Bandwidth
  const primaryIface = data.netStats && data.netStats.find(s => s.rxSec > 0 || s.txSec > 0) || data.netStats?.[0];
  if (primaryIface) {
    const rxMbps = parseFloat(bytesToMbps(primaryIface.rxSec));
    const txMbps = parseFloat(bytesToMbps(primaryIface.txSec));
    const rxStr  = rxMbps >= 0.01 ? rxMbps.toFixed(2) : '0.00';
    const txStr  = txMbps >= 0.01 ? txMbps.toFixed(2) : '0.00';

    document.getElementById('downloadValue').textContent = rxStr;
    document.getElementById('uploadValue').textContent   = txStr;
    document.getElementById('downloadBar').style.width = clamp((rxMbps / 100) * 100, 1, 100) + '%';
    document.getElementById('uploadBar').style.width   = clamp((txMbps / 100) * 100, 1, 100) + '%';

    // Bandwidth chart
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    pushChartPoint(bwChart, timeLabel, rxMbps, txMbps);
  }

  // CPU
  const cpu = data.cpu?.load ?? 0;
  setKpi(
    'cpuValue', cpu.toFixed(0), '%',
    'cpuBar', cpu,
    'cpuRating', cpu < 50 ? 'Normal' : cpu < 80 ? 'High' : 'Critical',
    cpu < 50 ? 'var(--green)' : cpu < 80 ? 'var(--yellow)' : 'var(--red)'
  );

  // Memory
  const mem = data.memory?.usedPercent ?? 0;
  setKpi(
    'memValue', mem.toFixed(0), '%',
    'memBar', mem,
    'memRating',
    data.memory ? formatBytes(data.memory.used) + ' / ' + formatBytes(data.memory.total) : '—',
    mem < 70 ? 'var(--teal)' : mem < 90 ? 'var(--yellow)' : 'var(--red)'
  );

  // Hosts
  if (data.hosts) renderHosts(data.hosts);

  // Interfaces
  if (data.networkInterfaces) renderInterfaces(data.networkInterfaces);

  // Latency chart — push 8.8.8.8 and 1.1.1.1
  const h1 = data.hosts?.find(h => h.host === '8.8.8.8');
  const h2 = data.hosts?.find(h => h.host === '1.1.1.1');
  const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  pushChartPoint(latencyChart, timeLabel,
    h1?.latency ?? null,
    h2?.latency ?? null
  );
}

function renderHosts(hosts) {
  const list = document.getElementById('hostsList');
  list.innerHTML = hosts.map(h => `
    <div class="host-item ${h.alive ? 'alive' : 'dead'}">
      <div class="host-dot"></div>
      <div class="host-name">${h.host}</div>
      <div class="host-stats">
        <span>RTT <span class="host-stat-val">${h.latency !== null ? h.latency.toFixed(1) + 'ms' : 'N/A'}</span></span>
        <span>Loss <span class="host-stat-val">${h.packetLoss ?? 0}%</span></span>
      </div>
    </div>
  `).join('');
}

function renderInterfaces(ifaces) {
  const tbody = document.getElementById('ifacesBody');
  if (!ifaces || ifaces.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No interfaces found</td></tr>';
    return;
  }
  tbody.innerHTML = ifaces.map(iface => `
    <tr>
      <td>${iface.iface || '—'}</td>
      <td>${iface.ip4 || '—'}</td>
      <td>${iface.mac || '—'}</td>
      <td><span class="badge badge-type">${iface.type || 'eth'}</span></td>
      <td><span class="badge ${iface.operstate === 'up' ? 'badge-up' : 'badge-down'}">${iface.operstate || 'unknown'}</span></td>
    </tr>
  `).join('');
}

// ─── Initial REST status load (hostname, platform, uptime) ─────────────────
async function loadInitialStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.hostname) document.getElementById('hostname').textContent = data.hostname;
    if (data.platform) document.getElementById('platform').textContent = data.platform;
    if (data.uptime)   document.getElementById('uptime').textContent   = formatUptime(data.uptime);
  } catch (e) { /* ignore */ }
}
loadInitialStatus();
setInterval(loadInitialStatus, 30_000);

// ─── WebSocket Connection ──────────────────────────────────────────────────
let ws;
let reconnectTimer;

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    badge.className = 'connection-badge connecting';
    badgeLabel.textContent = 'Connected';
    clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'metrics') renderMetrics(data);
    } catch (e) { console.error('Parse error:', e); }
  };

  ws.onclose = () => {
    setStatus('offline');
    badge.className = 'connection-badge connecting';
    badgeLabel.textContent = 'Reconnecting…';
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onerror = () => ws.close();
}

connect();
