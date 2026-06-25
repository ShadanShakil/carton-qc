# Recovery and Connection Persistence Architecture

For this deployment (running on a remote VMware Ubuntu instance), all scaling, maintenance, or scripting adjustments must conform to the following recovery architecture:

## 1. Docker Container Resilience
- **Automated Container Recovery:** All application containers must be configured with a persistent restart policy using the `--restart unless-stopped` flag (or `restart: unless-stopped` in `docker-compose.yml`). This guarantees that if the underlying Ubuntu host reboots or updates, Docker will automatically relaunch the containers on startup.

## 2. Network Disconnect Handling & Tunnel Service Persistence
- **Systemd Integration for Ngrok:** Any internet tunnel mechanism (like Ngrok) must be configured and managed as a background system service (e.g. `ngrok service`) via systemd to survive connection drops or reboots without manual user interaction.
- **Static Domain Enforcement:** Bound tunnel execution to a designated static domain via the configuration file (`ngrok.yml`) to ensure that upon network or host recovery, the tunnel reconnects to the exact same pre-configured global address.
