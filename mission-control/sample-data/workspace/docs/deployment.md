# Deployment Guide

## Prerequisites
- Node.js 18+
- Tailscale installed and authenticated
- OpenClaw CLI configured

## Steps

1. Clone the repository
2. Run `npm install`
3. Configure `openclaw.json`
4. Start the gateway: `openclaw gateway start`
5. Verify: `openclaw gateway status`

## Tailscale Setup

```bash
# Enable Tailscale serve for HTTPS
sudo tailscale serve --bg https+insecure://localhost:3000
```
