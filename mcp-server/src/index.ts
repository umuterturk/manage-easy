import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { z } from "zod";

// --- Configuration ---
// Token should be passed as env var: MCP_FIREBASE_TOKEN
const FIREBASE_TOKEN = process.env.MCP_FIREBASE_TOKEN;
// Default to Production URL, but allow override for local testing
const API_BASE_URL = process.env.MCP_API_URL || "https://us-central1-manage-easy-1768423759.cloudfunctions.net";

if (!FIREBASE_TOKEN) {
    console.error("Error: MCP_FIREBASE_TOKEN environment variable is required.");
    process.exit(1);
}

// --- Helper Functions ---
async function apiRequest(endpoint: string, method: string = "GET", body?: any) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: any = {
        "Authorization": `Bearer ${FIREBASE_TOKEN}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data: any = await response.json();
        if (!response.ok) {
            throw new Error(data.error || `API Error: ${response.statusText}`);
        }
        return data;
    } catch (error: any) {
        throw new Error(`Failed to request ${url}: ${error.message}`);
    }
}

// --- Server Setup ---
const server = new Server(
    {
        name: "manage-easy-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// --- Resources ---
// Expose ideas, features, and works as resources.
// Scheme: idea://{id}, feature://{id}, work://{id}

server.setRequestHandler(ListResourcesRequestSchema, async () => {
    // We could list ALL items here, but that might be huge.
    // For now, let's return a static explanation or a subset if desired.
    // To be truly useful, we might just rely on Tools to search, 
    // but Resources allow direct "read" access.
    // Let's implement dynamic reading via ReadResource, and minimal listing.
    return {
        resources: [], // Discovery via tools is preferred for now due to volume
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const url = new URL(request.params.uri);
    const id = url.pathname.replace(/^\//, ''); // Remove leading slash

    if (url.protocol === "idea:") {
        const data = await apiRequest(`/getIdea?id=${id}`);
        return {
            contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(data.idea, null, 2),
            }]
        };
    } else if (url.protocol === "feature:") {
        const data = await apiRequest(`/getFeature?id=${id}`);
        return {
            contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(data.feature, null, 2),
            }]
        };
    } else if (url.protocol === "work:") {
        const data = await apiRequest(`/getWork?id=${id}`);
        return {
            contents: [{
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify(data.work, null, 2),
            }]
        };
    }

    throw new Error(`Unsupported resource scheme: ${url.protocol}`);
});

// --- Tools ---

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_ideas",
                description: "List all ideas, optionally filtered by tag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        tag: { type: "string", description: "Filter ideas by this tag" },
                    },
                },
            },
            {
                name: "list_features",
                description: "List features, optionally filtered by ideaId or tag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ideaId: { type: "string", description: "Filter features by Idea ID" },
                        tag: { type: "string", description: "Filter features by tag" },
                    },
                },
            },
            {
                name: "list_works",
                description: "List works (tasks/bugs), optionally filtered by featureId, ideaId, or tag.",
                inputSchema: {
                    type: "object",
                    properties: {
                        featureId: { type: "string", description: "Filter works by Feature ID" },
                        ideaId: { type: "string", description: "Filter works by Idea ID" },
                        tag: { type: "string", description: "Filter works by tag" },
                    },
                },
            },
            {
                name: "create_work",
                description: "Create a new work item (Task or Bug). MUST be bound to an Idea (via ideaId) or Feature (via featureId).",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Title of the work item" },
                        description: { type: "string", description: "Description of the work item" },
                        type: { type: "string", enum: ["TASK", "BUG"], description: "Type of work" },
                        status: { type: "string", enum: ["CREATED", "TODO", "IN_PROGRESS", "DONE"], description: "Status of work" },
                        featureId: { type: "string", description: "ID of the feature this work belongs to (auto-binds ideaId)" },
                        ideaId: { type: "string", description: "ID of the idea (REQUIRED if featureId is not provided)" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags for the work item" },
                    },
                    required: ["title"],
                },
            },
            {
                name: "create_idea",
                description: "Create a new Idea.",
                inputSchema: {
                    type: "object",
                    properties: {
                        title: { type: "string", description: "Title of the idea" },
                        description: { type: "string", description: "Description of the idea" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags" },
                    },
                    required: ["title"],
                },
            },
            {
                name: "create_feature",
                description: "Create a new Feature under an Idea.",
                inputSchema: {
                    type: "object",
                    properties: {
                        ideaId: { type: "string", description: "ID of the parent Idea" },
                        title: { type: "string", description: "Title of the feature" },
                        description: { type: "string", description: "Description" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags" },
                    },
                    required: ["ideaId", "title"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "list_ideas") {
            const queryParams = new URLSearchParams();
            if (args?.tag) queryParams.append("tag", String(args.tag));

            const data = await apiRequest(`/listIdeas?${queryParams.toString()}`);
            return { content: [{ type: "text", text: JSON.stringify(data.ideas, null, 2) }] };
        }

        if (name === "list_features") {
            const queryParams = new URLSearchParams();
            if (args?.ideaId) queryParams.append("ideaId", String(args.ideaId));
            if (args?.tag) queryParams.append("tag", String(args.tag));

            const data = await apiRequest(`/listFeatures?${queryParams.toString()}`);
            return { content: [{ type: "text", text: JSON.stringify(data.features, null, 2) }] };
        }

        if (name === "list_works") {
            const queryParams = new URLSearchParams();
            if (args?.ideaId) queryParams.append("ideaId", String(args.ideaId));
            if (args?.featureId) queryParams.append("featureId", String(args.featureId));
            if (args?.tag) queryParams.append("tag", String(args.tag));

            const data = await apiRequest(`/listWorks?${queryParams.toString()}`);
            return { content: [{ type: "text", text: JSON.stringify(data.works, null, 2) }] };
        }

        if (name === "create_work") {
            const parsed = z.object({
                title: z.string(),
                description: z.string().optional(),
                type: z.enum(["TASK", "BUG"]).optional(),
                status: z.enum(["CREATED", "TODO", "IN_PROGRESS", "DONE"]).optional(),
                featureId: z.string().optional(),
                ideaId: z.string().optional(),
                tags: z.array(z.string()).optional(),
            }).parse(args);

            const data = await apiRequest("/createWork", "POST", parsed);
            return { content: [{ type: "text", text: `Work created successfully: ID ${data.id}` }] };
        }

        if (name === "create_idea") {
            const parsed = z.object({
                title: z.string(),
                description: z.string().optional(),
                tags: z.array(z.string()).optional(),
            }).parse(args);

            const data = await apiRequest("/createIdea", "POST", parsed);
            return { content: [{ type: "text", text: `Idea created successfully: ID ${data.id}` }] };
        }

        if (name === "create_feature") {
            const parsed = z.object({
                ideaId: z.string(),
                title: z.string(),
                description: z.string().optional(),
                tags: z.array(z.string()).optional(),
            }).parse(args);

            const data = await apiRequest("/createFeature", "POST", parsed);
            return { content: [{ type: "text", text: `Feature created successfully: ID ${data.id}` }] };
        }

        throw new Error(`Unknown tool: ${name}`);

    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

// --- Run ---
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

run().catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
