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
import { z } from "zod";

async function getTools(): Promise<Tool[]> {
  const response = await fetch("https://ajax-mcp.web.val.run", {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return (await response.json() as Tool[]) || [];
}

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
  result?: any;
  error?: string;
  baby_name?: string;
  answer?: string;
  text?: string;
  response?: string;
  [key: string]: any;
}

/**
 * Pass through the ValTown response
 * @param response The raw response from ValTown
 * @param server The MCP server instance for logging
 * @returns The raw response
 */
async function formatValTownResponse(response: ValTownExecuteResponse, server: Server): Promise<any> {
  server.sendLoggingMessage({
    level: "info",
    data: `ValTown response: ${JSON.stringify(response)}`
  });
  return response;
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Log that we received a ListTools request
  server.sendLoggingMessage({
    level: "info",
    data: "Received ListTools request",
  });

  const tools = await getTools();
  server.sendLoggingMessage({
    level: "info",
    data: `ListTools response received: ${JSON.stringify(tools)}`
  });

  // Return the tools from ValTown API
  return {
    tools
  };
});



server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error("Forwarding tool request to Val Town:", request.params.name, request.params.arguments);

  // Check if the tool has slop enabled
  const tools = await getTools();

  console.log({tools})
  const tool = tools.find((t: Tool) => t.name === request.params.name);

  
  // Log the incoming tool call request with detailed information
  server.sendLoggingMessage({
    level: "info",
    data: `Tool call request received: name='${request.params.name}', arguments=${JSON.stringify(request.params.arguments)}`
  });

  const payload = request.params.arguments;

  try {
    // Construct the URL for the Val Town tool
    let toolUrl = `https://ajax-${request.params.name}.web.val.run/`;
    
    if (tool?.slop) {
      toolUrl = `${tool.slop}/tools/${request.params.name}`;
      server.sendLoggingMessage({
        level: "info",
        data: `SLOP CALL DETECTED`
      });
    } 

    server.sendLoggingMessage({
      level: "info",
      data: `Attempting to fetch from URL: ${toolUrl}`
    });
    
    // Log the request details
    server.sendLoggingMessage({
      level: "info",
      data: `Request payload: ${JSON.stringify(payload)}`
    });

    // Make the API request and await the response
    const response = await fetch(toolUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Log response details
    const headers = Object.fromEntries(response.headers.entries());
    server.sendLoggingMessage({
      level: "info",
      data: `Response headers: ${JSON.stringify(headers)}`
    });

    server.sendLoggingMessage({
      level: "info",
      data: `Response status: ${response.status} ${response.statusText}`
    });

    // Handle non-OK responses
    if (!response.ok) {
      if (response.status === 404) {
        return {
          error: "NOT_FOUND",
          message: `Tool '${request.params.name}' was not found`
        };
      }
      return {
        error: "API_ERROR",
        message: `Val Town API error: ${response.statusText}`
      };
    }

    // Parse the JSON response
    const valTownResponse = await response.json();

    server.sendLoggingMessage({
      level: "info",
      data: `Response parsed: ${JSON.stringify(valTownResponse)}`
    });
    
    // Call our formatter function to prepare the response
    const formattedResponse = await formatValTownResponse(valTownResponse as ValTownExecuteResponse, server);
    
    // Return the enhanced response
    return formattedResponse;
    
  } catch (error: unknown) {
    // Handle all errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    server.sendLoggingMessage({
      level: "error",
      data: `Error executing tool: ${errorMessage}`
    });
    return {
      error: errorMessage,
      message: "Tool execution failed"
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
