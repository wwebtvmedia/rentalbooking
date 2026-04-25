// src/mcp/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
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

  serverInstance.tool("create_customer", 
    {
      fullName: z.string(),
      email: z.string().email()
    },
    async (input, extra) => {
      // Simple auth check
      const auth = extra?.requestInfo?.headers?.authorization || "";
      if (!auth.includes("admin-token") && process.env.NODE_ENV !== 'development') {
        throw new Error("Unauthorized");
      }

      const customer = await Customer.create(input);
      logger.info({ customerId: customer.id }, "Customer created via MCP");

      return {
        content: [
          { type: "text", text: JSON.stringify(customer) }
        ],
        structuredContent: customer
      };
    }
  );

  serverInstance.tool("create_apartment",
    {
      name: z.string(),
      description: z.string().optional(),
      smallDescription: z.string().optional(),
      address: z.string().optional(),
      photos: z.array(z.string()).optional(),
      pricePerNight: z.number().optional(),
      rules: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
      depositAmount: z.number().optional()
    },
    async (input, extra) => {
      // Simple auth check
      const auth = extra?.requestInfo?.headers?.authorization || "";
      if (!auth.includes("admin-token") && process.env.NODE_ENV !== 'development') {
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
    }
  );

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

