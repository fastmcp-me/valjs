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
  // Log that we received a ListTools request
  server.sendLoggingMessage({
    level: "info",
    data: "Received ListTools request",
  });

  const response = await fetch("https://ajax-mcp.web.val.run", {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  const valtownTools = await response.json() as ValTownResponse;
  server.sendLoggingMessage({
    level: "info",
    data: `ListTools response received: ${JSON.stringify(valtownTools)}`
  });
  return {    tools: valtownTools || [function blah () { return "HOW WE GET HERE"}]};
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("Forwarding tool request to Val Town:", request.params.name, request.params.arguments);
  
  // Log the incoming tool call request with detailed information
  server.sendLoggingMessage({
    level: "info",
    data: `Tool call request received: name='${request.params.name}', arguments=${JSON.stringify(request.params.arguments)}`
  });
  
  // Log that we're returning a direct response
  server.sendLoggingMessage({
    level: "info",
    data: `Returning direct response for tool: ${request.params.name}`
  });
  
  // For demonstration purposes, just return a direct message
  // This will immediately return without making any actual network requests
  return {
    _meta: {},
    result: `This is a direct response: Tool '${request.params.name}' is not available at this time`
  };

  // The code below will never be executed due to the return statement above
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
      if (response.status === 404) {
        return {
          _meta: {},
          result: `Tool '${request.params.name}' was not found`
        };
      }
      return {
        _meta: {},
        result: `Val Town API error: ${response.statusText}`
      };
    }

    const valTownResponse = await response.json() as ValTownExecuteResponse;
    
    if (valTownResponse.error) {
      return {
        _meta: {},
        result: `Val Town execution error: ${valTownResponse.error}`
      };
    }

    return {
      _meta: {},
      result: valTownResponse.result
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch failed')) {
      return {
        _meta: {},
        result: `Tool '${request.params.name}' is not available or has not been deployed`
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      _meta: {},
      result: `Tool execution failed: ${errorMessage}`
    };
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
  
  // Log server startup
  server.sendLoggingMessage({
    level: "info",
    data: "Server started successfully",
  });
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
