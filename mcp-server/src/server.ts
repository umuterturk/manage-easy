import express from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./index.js";

const app = express();
// Allow CORS so we can be called from browser-based tools
app.use(cors());

// Store active transport so we can handle incoming messages
let transport: SSEServerTransport | null = null;

app.get("/sse", async (req, res) => {
    console.log("New SSE connection...");
    transport = new SSEServerTransport("/messages", res);

    // Connect the server to this new transport
    await server.connect(transport);
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
