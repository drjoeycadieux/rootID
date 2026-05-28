# network-monitor

`network-monitor` is a real-time Dockerized network monitoring dashboard built with Node.js. It exposes live network telemetry through a browser interface, including latency, packet loss, bandwidth, CPU, memory, and interface status. The application uses a lightweight Express backend, WebSocket streaming, and a Docker-friendly runtime designed for local deployment and quick observability demos.

## Highlights
- Live latency and packet loss monitoring with host ping checks
- Real-time bandwidth, CPU, memory, and interface statistics
- WebSocket-based updates for continuous dashboard refreshes
- Docker Compose friendly deployment workflow
- Node.js 22 Alpine runtime with updated base packages
- Non-root runtime user for reduced container privileges
- Multi-stage image build for leaner production assets

## Included Features
- Responsive dashboard UI for live network metrics
- Host ping panel for connectivity checks
- Interface inventory with IP, MAC, and link state details
- System resource monitoring (CPU, memory, uptime)
- REST API endpoints for ping and system status

## Use Cases
- Network troubleshooting and diagnostics
- Infrastructure visibility during local testing
- Docker-based observability demos
- Lightweight monitoring dashboards for development and lab environments

## Suggested Docker Hub Description
A real-time Dockerized network monitoring dashboard for live latency, packet loss, bandwidth, CPU, memory, and interface monitoring. Built on Node.js with WebSocket updates, ping-based checks, and a hardened Alpine-based runtime for easy local deployment.

## Quick Start
```bash
docker run -p 3000:3000 --cap-add=NET_RAW network-monitor:latest
```

Then open http://localhost:3000.

## Runtime Notes
- `--cap-add=NET_RAW` is required so the container can perform ping operations.
- The image is optimized for Linux hosts and local Docker workflows.
- API and dashboard endpoints are available from the running container on port 3000.

## Repository Links
- Source repository: https://github.com/drjoeycadieux/rootID
- Application endpoint: http://localhost:3000
