# ClarityOS Bridge

TCP server bridge for VSCode API access from CLI. Built for AI agents.

## Installation

Install from OpenVSX:

```bash
code --install-extension yemreak.clarityos-bridge
```

## What It Does

Runs a TCP server (port 9485) inside VSCode that exposes the full VSCode API to external CLI tools.

```
CLI → TCP (port 9485) → Bridge → VSCode API
```

## Usage

Use with [vscode-cli-bridge](https://github.com/yemreak/vscode-cli-bridge) CLI tool:

```bash
# Install CLI
npm install -g @yemreak/vscode-cli

# Start bridge server
# Command Palette → "ClarityOS: Start Bridge Server"

# Execute VSCode API from terminal
vscode eval "return vscode.window.activeTextEditor?.document.fileName"

# Get system status
vscode status

# Read output logs
vscode output 50
```

## Features

- TCP server on port 9485
- JSON-RPC protocol
- Full VSCode API access
- Webview manager
- Config registry (Hammerspoon-like)
- Event broadcasting (webhooks)
- Terminal event tracking

## Commands

- `ClarityOS: Start Bridge Server` - Start TCP server
- `ClarityOS: Stop Bridge Server` - Stop TCP server

## Architecture

```
extension.ts
├─ TCP Server (lib/server.ts)
│  ├─ port 9485
│  ├─ JSON-RPC handler
│  └─ broadcast() → webhooks
│
├─ Webview Manager (lib/webview.ts)
│  └─ HTML panels
│
└─ Config Registry (lib/config.ts)
   └─ Dynamic config loading
```

## Protocol

**Request** (client → bridge):
```json
{
  "command": "eval",
  "args": ["vscode.window.showInformationMessage('hello')"]
}
```

**Response** (bridge → client):
```json
{
  "result": null,
  "error": null
}
```

## Why?

Enables AI agents to:
- Execute code in VSCode context
- Read editor state and diagnostics
- Control editor from terminal
- Access full VSCode API
- Receive real-time events

## License

Apache-2.0
