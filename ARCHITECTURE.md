# ClarityOS Bridge - Communication Layer

**Pattern**: TCP Server + Webview + Config Loading

```
TCP Server → VSCode API → Response
     ↓            ↓            ↓
  port 9485   full access   JSON-RPC
```

## Directory Structure

```
clarityos-bridge/
├── extension.ts
│   └── activate()
│       ├── track: terminal events
│       ├── initialize: webviewManager
│       ├── initialize: configRegistry
│       ├── store: global.bridgeConfig
│       ├── broadcast: terminal-changed → webhooks
│       ├── statusBar: bridge status + uptime
│       └── register: commands
│
├── commands/
│   ├── bridge.start.ts
│   │   └── execute()
│   │       ├── check: global.bridgeInstance
│   │       ├── check: global.bridgeConfig
│   │       ├── startBridgeServer() → TCP server
│   │       └── subscribe: disposal
│   │
│   └── bridge.stop.ts
│       └── execute()
│           ├── check: global.bridgeInstance
│           └── dispose() → close server
│
├── lib/
│   ├── server.ts
│   │   └── startBridgeServer()
│   │       ├── create: net.Server
│   │       ├── listen: 9485
│   │       ├── handle: JSON-RPC
│   │       │   ├── eval
│   │       │   ├── openFile
│   │       │   └── showQuickPick
│   │       │
│   │       └── broadcast() → POST webhooks
│   │
│   ├── config.ts
│   │   └── createConfigRegistry()
│   │       ├── register: (name, filePath)
│   │       ├── unregister: (name)
│   │       └── list: () → configs
│   │
│   └── webview.ts
│       └── createWebviewManager()
│           ├── create: (id, html)
│           ├── update: (id, html)
│           └── dispose: (id)
│
└── types.ts
    ├── CommandContext
    │   ├── extensionContext
    │   ├── workspaceRoot
    │   └── logState
    │
    └── CommandDefinition
        ├── id: string
        └── execute: (context) => Promise<void>
```

## Flow Visualization

```
Extension Lifecycle
activate() → initialize managers → store config → register commands → [STOPPED]
    ↓              ↓                      ↓               ↓                ↓
extension.ts  webview + config    global.bridgeConfig  start/stop   manual start


Bridge Start Flow
commands/bridge.start → check config → startBridgeServer() → listen 9485 → [RUNNING]
         ↓                  ↓                  ↓                   ↓            ↓
     command           global vars      net.Server           TCP socket   broadcast


TCP Communication (JSON-RPC)
client → nc localhost 9485 → send JSON → eval → vscode API → response
  ↓            ↓                  ↓        ↓         ↓            ↓
terminal   TCP socket         command   execute  full access   result


Terminal Event Broadcast
terminal change → onDidChangeActiveTerminal → broadcast() → POST webhooks
       ↓                    ↓                       ↓              ↓
  switch tab           processId capture      subscribers    HTTP POST


Config Registry (Hammerspoon Pattern)
.clarityos-configs.json → register → require() → activate(ctx) → dispose
         ↓                    ↓          ↓            ↓             ↓
    name:path pairs      registry   load module   run setup    cleanup fn
         ↓                    ↓          ↓            ↓
    fs.watch           hot reload   fresh load   vscode API


Webview Manager
create(id, html) → vscode panel → render → update(id, html) → refresh
      ↓                ↓             ↓            ↓                ↓
  unique id      WebviewPanel   show HTML   change content   live reload


Status Bar Updates
[STOPPED] → bridge.start → [RUNNING] → setInterval 30s → update tooltip
     ↓            ↓              ↓              ↓                ↓
  tooltip     startTime      uptime         elapsed         format time
     ↓            ↓              ↓              ↓                ↓
stopped msg   track start   calculate   hours:minutes   show status
```

## State Machine

```
Bridge State
[STOPPED] ──bridge.start──→ [STARTING] ──listen success──→ [RUNNING]
    ↑                              ↓                             ↓
    │                         error ↓                            ↓
    │                              ↓                             ↓
    └────────bridge.stop──────────┴──────────dispose()──────────┘


Connection State
[IDLE] ──client connect──→ [CONNECTED] ──receive JSON──→ [PROCESSING]
  ↑                              ↓                              ↓
  │                              ↓                         eval()
  │                              ↓                              ↓
  └────────response sent─────────┴────────────────────────[RESPONDING]
```

## Protocol

```
Request (client → bridge):
{
  "command": "eval",
  "args": ["vscode.window.showInformationMessage('hello')"]
}

Response (bridge → client):
{
  "result": null,
  "error": null
}

Broadcast (bridge → webhooks):
POST http://webhook-url
{
  "event": "terminal-changed",
  "timestamp": 1234567890,
  "data": {
    "name": "zsh",
    "processId": 12345
  }
}
```
