# Architecture Overview

## Core Components

- **Gateway** — Handles incoming messages from Slack, Telegram, etc.
- **Agent Runtime** — Executes AI agent sessions with tool access
- **Memory System** — Persists context across sessions

## Data Flow

1. User sends message via channel
2. Gateway routes to appropriate agent
3. Agent processes with LLM + tools
4. Response sent back through channel
5. Session transcript saved to disk
