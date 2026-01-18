# Manage Easy MCP Server

> **Note:** This is a **connector** that runs on your computer. It acts as a bridge between Claude Desktop and your existing Firebase Backend.

## Architecture

```mermaid
graph LR
    A[Claude Desktop] -- Stdio --> B[MCP Connector\n(Running Locally)]
    B -- HTTPS --> C[Firebase Cloud Functions\n(Existing Deployment)]
```

You do **NOT** need to deploy this connector to a server. It is designed to run locally inside Claude Desktop.

## Prerequisites

1.  **Node.js**: v18+ installed on your machine.
2.  **API Key**: You need a `me_sk_` key to authenticate with your Firebase backend.

## Setup Instructions

### 1. Build the Connector
Run these commands in your terminal **once** to prepare the code:

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Desktop
This tells Claude where to find the connector on your hard drive.

1.  Open the config file:
    - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
    - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2.  Add this entry (update the path and token):

```json
{
  "mcpServers": {
    "manage-easy": {
      "command": "node",
      "args": ["/Users/umut/Code/manage-easy/mcp-server/build/index.js"],
      "env": {
        "MCP_FIREBASE_TOKEN": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

> **Tip:** Use `pwd` in the terminal to find the full path to the `build/index.js` file.

### 3. Restart Claude
Completely quit and restart the Claude Desktop app. You should now see the `manage-easy` tools available.

## Troubleshooting

- **"Connection Refused"**: Check your internet connection. The connector needs to reach the Firebase URL (`us-central1-manage-easy-1768423759.cloudfunctions.net`).
- **"Unauthorized"**: Your `MCP_FIREBASE_TOKEN` is missing or invalid.
- **Tools not showing**: Check the Claude Desktop logs using `tail -f ~/Library/Logs/Claude/mcp.log`.
