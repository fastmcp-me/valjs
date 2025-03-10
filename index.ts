import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

async function main() {
  const server = new Server(
    {
      name: "valjs-mcp",
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

  const transport = new StdioServerTransport();
  await server.connect(transport);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "random_joke",
          description: "tell a random joke",
          inputSchema: {},
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "random_joke") {
      return { result: "Why did the chicken cross the road? To get to the other side!" };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
