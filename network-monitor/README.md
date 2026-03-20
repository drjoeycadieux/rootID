# 🖥️ NetMonitor — Real-Time Network Monitoring Dashboard

A sleek, real-time network monitoring dashboard built with **HTML/CSS/JavaScript** on the frontend and **Node.js + Express** on the backend. Fully containerized with Docker and ready to push to Docker Hub.

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen) ![Docker](https://img.shields.io/badge/docker-ready-blue) ![Node.js](https://img.shields.io/badge/node-20--alpine-green)

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| **Live Latency** | Real-time RTT to 8.8.8.8 with color-coded rating |
| **Packet Loss** | Percentage packet loss across monitored hosts |
| **Bandwidth** | Live download/upload speed (Mbps) per interface |
| **CPU & Memory** | System resource usage updated every 5 seconds |
| **Host Ping Panel** | Status of 8.8.8.8, 1.1.1.1, google.com, cloudflare.com |
| **Network Interfaces** | IP address, MAC, type, and up/down state for all adapters |
| **Live Charts** | Chart.js sparklines for latency history and bandwidth |
| **WebSocket Push** | All metrics pushed from server to browser every 5s |
| **Auto-Reconnect** | WebSocket reconnects automatically if the server restarts |

---

## 🗂️ Project Structure

```
network-monitor/
├── public/
│   ├── index.html       # Dashboard UI
│   ├── style.css        # Dark-theme styles
│   └── app.js           # Frontend logic (charts, WebSocket, live updates)
├── server.js            # Node.js + Express backend (REST API + WebSocket)
├── package.json         # Dependencies
├── Dockerfile           # Multi-stage Alpine Docker image
├── docker-compose.yml   # One-command local deployment
└── .dockerignore        # Keeps the image lean
```

---

## 🚀 Quick Start

### Option 1 — Docker (Recommended)

```bash
# Build the image
docker build -t network-monitor:latest .

# Run the container
docker run -p 3000:3000 --cap-add=NET_RAW network-monitor:latest
```

Then open **http://localhost:3000**

> `--cap-add=NET_RAW` is required for the `ping` command to work inside the container.

### Option 2 — Docker Compose

```bash
docker-compose up -d
```

Stops with:
```bash
docker-compose down
```

### Option 3 — Run Locally (Node.js)

```bash
npm install
node server.js
```

Requires **Node.js 18+** installed on your machine.

---

## 🐳 Push to Docker Hub

```bash
# Tag with your Docker Hub username
docker tag network-monitor:latest YOUR_USERNAME/network-monitor:latest

# Login to Docker Hub
docker login

# Push the image
docker push YOUR_USERNAME/network-monitor:latest
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the dashboard UI |
| `GET` | `/api/ping?host=<host>` | Ping a host — returns latency, packet loss |
| `GET` | `/api/status` | System info — hostname, uptime, CPU, memory, interfaces |
| `WS` | `ws://localhost:3000` | Live metrics stream (every 5 seconds) |

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `production` | Node environment |

Set via environment variable or in `docker-compose.yml`.

---

## 🛠️ Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript + [Chart.js](https://www.chartjs.org/)
- **Backend** — [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) + [ws](https://github.com/websockets/ws)
- **System Metrics** — [systeminformation](https://systeminformation.io/)
- **Ping** — [ping](https://www.npmjs.com/package/ping) (wraps OS ping binary)
- **Container** — Docker Alpine (`node:20-alpine`)

---

## 📝 Notes

- **Ping on Windows** — Ping may show `N/A` when running locally on Windows without administrator privileges. It works fully inside Docker on Linux hosts with `--cap-add=NET_RAW`.
- **Network interfaces** — The interfaces table reflects the host machine's adapters (or the container's adapters when running in Docker).
- **Security** — The Docker image runs as a **non-root user** for better security hygiene.

---

## 📄 License

MIT — free to use, modify, and distribute.
