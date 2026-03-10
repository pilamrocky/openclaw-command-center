---
description: Start the Command Center server with Tailscale network access
---

# Start Command Center with Tailscale

This workflow starts the server and exposes it on your Tailscale network.

## Prerequisites

- Tailscale installed and connected on the VPS: `tailscale status`
- Node.js >= 18 installed

## Quick Start

// turbo

1. Get your Tailscale IP:

```bash
tailscale ip -4
```

2. Start the server bound to your Tailscale IP (replace `TAILSCALE_IP` with the output from step 1):

```bash
cd /home/rocky/repos/openclaw-command-center
HOST=$(tailscale ip -4) PORT=3333 node lib/server.js
```

3. Access the dashboard from any device on your Tailscale network at:

```
http://<tailscale-ip>:3333
```

## Why This Works

- Binding to the Tailscale IP means **only devices on your tailnet** can reach the dashboard
- The VPS's public IP won't serve the dashboard (it's not bound to 0.0.0.0)
- Tailscale already encrypts all traffic on the tailnet, so HTTP is fine
- No conflict with existing Tailscale Serve on port 443 (used by OpenClaw)

## Alternative: Different Tailscale Serve Port

If you prefer HTTPS via Tailscale Serve (and want auth headers), use a non-443 port:

```bash
# Start server on localhost
node lib/server.js

# Expose on a different HTTPS port
tailscale serve --bg --https 8443 localhost:3333

# Access at: https://<hostname>.<tailnet>.ts.net:8443
```

## Running in Background

To keep the server running after you disconnect:

```bash
# Option A: Using nohup
HOST=$(tailscale ip -4) nohup node lib/server.js > /tmp/command-center.log 2>&1 &

# Option B: Using tmux
tmux new-session -d -s command-center "HOST=\$(tailscale ip -4) node /home/rocky/repos/openclaw-command-center/lib/server.js"

# Option C: Using screen
screen -dmS command-center bash -c "HOST=\$(tailscale ip -4) node /home/rocky/repos/openclaw-command-center/lib/server.js"
```

## Stopping

```bash
# If using nohup, find and kill the process:
pkill -f "node lib/server.js"

# If using tmux:
tmux kill-session -t command-center

# If using screen:
screen -S command-center -X quit
```

## Notes

- **Port**: Change with `PORT=8080` or `--port 8080`.
- **Auth**: Add `DASHBOARD_AUTH_MODE=tailscale` if using Tailscale Serve on a separate port for user-level access control. For direct-bind mode, tailnet membership is the access control.
