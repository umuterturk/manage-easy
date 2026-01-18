# Manage Easy MCP Server

A Model Context Protocol (MCP) server that connects AI assistants (like Claude) to the Manage Easy capabilities. It allows you to manage ideas, features, and works (tasks/bugs).

## Features

- **Resources**: Direct access to ideas, features, and works via `idea://`, `feature://`, and `work://` URIs.
- **Tools**: List, create, and search for ideas, features, and works.

## Prerequisites

- Node.js (v18 or higher)
- A Manage Easy account (or at least access to the Firebase project)

## Installation

1. Navigate to the server directory:
   ```bash
   cd mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Configuration

The server requires a Firebase Token to authenticate requests.

1. **Obtain a Token**:
   - Only `me_sk_` API keys are currently supported for direct server access.
   - If you don't have one, you'll need one generated from the backend (or ask the admin).
   - Alternatively, for local dev, you can use a valid Firebase ID token if you catch one, but API keys are persistent.

## Usage

### 1. Using with Claude Desktop (Stdio)

To use this server with the Claude Desktop app:

1. Open your Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the following to the `mcpServers` object:

   ```json
   {
     "mcpServers": {
       "manage-easy": {
         "command": "node",
         "args": ["/absolute/path/to/manage-easy/mcp-server/build/index.js"],
         "env": {
           "MCP_FIREBASE_TOKEN": "your_api_key_here"
         }
       }
     }
   }
   ```

   **Important**: Replace `/absolute/path/to/...` with the full path to your project directory.

3. Restart Claude Desktop.

### 2. Using via HTTP (SSE)

Use this mode to deploy the server remotely (e.g., Render, Railway) or access it over HTTP.

1. Start the server:
   ```bash
   export MCP_FIREBASE_TOKEN=your_api_key_here
   npm run serve
   ```

2. The server will start on port `8080`.
   - **SSE Endpoint**: `http://localhost:8080/sse`
   - **POST Endpoint**: `http://localhost:8080/messages`

## API Reference

### Tools
- `list_ideas(tag?)`
- `list_features(ideaId?, tag?)`
- `list_works(ideaId?, featureId?, tag?)`
- `create_idea(title, description?, tags?)`
- `create_feature(ideaId, title, description?, tags?)`
- `create_work(title, description?, type, status, featureId?, ideaId?, tags?)`

### Resources
- `idea://{id}`
- `feature://{id}`
- `work://{id}`
