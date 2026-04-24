// src/mcp/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Customer from "../models/Customer.js";
import { logger } from "../logger.js";
import Apartment from "../models/Apartment.js";
import { geocodeAddress } from "../lib/geocoder.js";

let serverInstance = null;

export function getMcpServer() {
  if (serverInstance) return serverInstance;

  serverInstance = new McpServer({
    name: "rental-mcp",
    version: "1.0.0"
  });

  serverInstance.registerTool("create_customer", {
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

  server.registerTool("create_apartment", {
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        smallDescription: { type: "string" },
        address: { type: "string" },
        photos: { type: "array", items: { type: "string" } },
        pricePerNight: { type: "number" },
        rules: { type: "string" },
        lat: { type: "number" },
        lon: { type: "number" },
        depositAmount: { type: "number" }
      },
      required: ["name"]
    }
  }, async (input, extra) => {
    const auth = extra?.requestInfo?.headers?.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const user = token === "admin-token" ? { role: "admin" } : null;

    if (user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    let { lat, lon } = input;
    const { address } = input;

    if ((lat === undefined || lon === undefined) && address) {
      const g = await geocodeAddress(address);
      if (g) {
        lat = lat === undefined ? g.lat : lat;
        lon = lon === undefined ? g.lon : lon;
      }
    }

    const payload = {
      name: input.name,
      description: input.description || '',
      smallDescription: input.smallDescription || '',
      address: address || '',
      photos: input.photos || [],
      pricePerNight: Number(input.pricePerNight || 0),
      rules: input.rules || '',
      lat,
      lon,
      depositAmount: input.depositAmount !== undefined ? Math.round(Number(input.depositAmount) * 100) : undefined
    };

    const apt = await Apartment.create(payload);
    logger.info({ apartmentId: apt.id }, "Apartment created via MCP");

    return {
      content: [
        { type: "text", text: JSON.stringify(apt) }
      ],
      structuredContent: apt
    };
  });

  logger.info("MCP server configured (tools registered)");
  return serverInstance;
}

export function startMcpServer() {
  const server = getMcpServer();
  // Standard stdio transport for local use if needed
  import("@modelcontextprotocol/sdk/transport/stdio.js").then(({ McpStdioTransport }) => {
     // This is just a placeholder as index.js calls it. 
     // For Express, we will use SSE instead.
  }).catch(() => {});
  return server;
}

