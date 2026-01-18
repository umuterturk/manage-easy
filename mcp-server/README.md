# Manage Easy MCP Server

This is a Model Context Protocol (MCP) server for the Manage Easy application. It enables AI assistants to interact with the Manage Easy backend (Firehost Cloud Functions).

## Configuration

This server requires the following environment variable:

- `MCP_FIREBASE_TOKEN`: A valid Firebase ID token or API Key (starting with `me_sk_`).
- `MCP_API_URL` (Optional): Override the base API URL (default: Production Cloud Functions).

## Tools

The server exposes the following tools to interact with the system:

### Reading Data
- `list_ideas`: List all ideas. Supports filtering by tag.
- `list_features`: List features. Supports filtering by `ideaId` or `tag`.
- `list_works`: List works (tasks/bugs). Supports filtering by `ideaId`, `featureId`, or `tag`.

### Writing Data
- `create_idea`: Create a new idea with a title, description, and tags.
- `create_feature`: Create a new feature bound to an idea.
- `create_work`: Create a new work item (Task or Bug). Must be bound to an Idea or Feature.

## Resources

Direct resource access is available via the following URI schemes:

- `idea://{id}`: Get details of a specific idea.
- `feature://{id}`: Get details of a specific feature.
- `work://{id}`: Get details of a specific work item.

## Development

### Build
```bash
npm install
npm run build
```

### Run (Local / Stdio)
Use this mode for local development with Claude Desktop or other local clients.
```bash
npm start
```

### Run (Server / SSE)
Use this mode to deploy the server (e.g., to Render, Railway, or a VPS).
```bash
npm run serve
```
The server will start on port `8080` (or `$PORT`).
- SSE URL: `http://your-domain.com/sse`
- POST URL: `http://your-domain.com/messages`
