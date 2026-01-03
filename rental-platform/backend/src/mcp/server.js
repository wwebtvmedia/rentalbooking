// src/mcp/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Customer from "../models/Customer.js";
import { logger } from "../logger.js";

export function startMcpServer() {
  const server = new McpServer({
    name: "rental-mcp",
    version: "1.0.0"
  });

  server.registerTool("create_customer", {
    inputSchema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" }
      },
      required: ["fullName", "email"]
    }
  }, async (input, extra) => {
    // Extract simple auth from incoming request headers (if present)
    const auth = extra?.requestInfo?.headers?.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const user = token === "admin-token" ? { role: "admin" } : token === "user-token" ? { role: "user" } : null;

    if (user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const customer = await Customer.create(input);
    logger.info({ customerId: customer.id }, "Customer created via MCP");

    // Return a call-tool style result with structured content
    return {
      content: [
        { type: "text", text: JSON.stringify(customer) }
      ],
      structuredContent: customer
    };
  });

  // Note: not starting a transport here. Callers should connect the server to a transport when needed.
  logger.info("MCP server configured (tools registered)");
}
