import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import fetch from "node-fetch";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "valtown-mcp-alpha",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      logging: {},
    },
  }
);


// Define MCP tools
const VALTOWN_TOOL: Tool = {
  name: "valtown_hello_tool",
  description: "This is a tool from the valtown MCP server.\nSays hello to the user",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "The name of the person to greet.",
      },
    },
    required: [],
  },
};


const tools = [
  VALTOWN_TOOL,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

function doHello(name: string) {
  return {
    message: `Hello, ${name}!`,
  };
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "valtown_hello_tool") {
    console.error("Hello tool", request.params.arguments);
    const input = request.params.arguments as { name: string };
    const response = await fetch("https://esm.town/v/ajax/mcp", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: input.name
      })
    });
    const data = await response.json();
    return data;
  }
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
});

server.onerror = (error: any) => {
  console.error(error);
};

process.on("SIGINT", async () => {
  await server.close();
  process.exit(0);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("valtown MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
