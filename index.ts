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


interface ValTownResponse {
  tools?: Tool[];
}

interface ValTownExecuteResponse {
  result: any;
  error?: string;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {


  const response = await fetch("https://ajax-mcp.web.val.run", {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const valtownTools = await response.json() as ValTownResponse;
  return {    tools: valtownTools || [function blah () { return "HOW WE GET HERE"}]};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("Forwarding tool request to Val Town:", request.params.name, request.params.arguments);
  
  try {
    const toolUrl = `https://ajax-${request.params.name}.web.val.run`;
    const response = await fetch(toolUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.params.arguments || {})
    });

    if (!response.ok) {
      throw new McpError(ErrorCode.InternalError, `Val Town API error: ${response.statusText}`);
    }

    const valTownResponse = await response.json() as ValTownExecuteResponse;
    
    if (valTownResponse.error) {
      throw new McpError(ErrorCode.InternalError, `Val Town execution error: ${valTownResponse.error}`);
    }

    return {
      _meta: {},
      result: valTownResponse.result
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Failed to execute Val Town tool: ${errorMessage}`);
  }
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
