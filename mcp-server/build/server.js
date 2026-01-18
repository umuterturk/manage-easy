"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const index_js_1 = require("./index.js");
const app = (0, express_1.default)();
// Allow CORS so we can be called from browser-based tools
app.use((0, cors_1.default)());
// Store active transport so we can handle incoming messages
let transport = null;
app.get("/sse", async (req, res) => {
    console.log("New SSE connection...");
    transport = new sse_js_1.SSEServerTransport("/messages", res);
    // Connect the server to this new transport
    await index_js_1.server.connect(transport);
});
app.post("/messages", async (req, res) => {
    if (!transport) {
        res.status(400).send("No active transport connection");
        return;
    }
    // Forward the message to the transport
    // The transport handles parsing the body stream
    await transport.handlePostMessage(req, res);
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`MCP HTTP Server listening on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
    console.log(`POst Endpoint: http://localhost:${PORT}/messages`);
});
