// src/mcp/server.js
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import User from "../models/User.js";
import { encrypt, generateUserKey, protectKey, blindIndex } from "../lib/encryption.js";
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
      const forensicId = Math.random().toString(36).substring(7);
      logger.info({ forensicId, input }, "MCP_TOOL_CALL: create_customer initiated");

      const userKey = generateUserKey();
      const emailHash = blindIndex(input.email);

      const customer = await User.create({
        fullName: encrypt(input.fullName, userKey),
        email: encrypt(input.email, userKey),
        emailHash,
        role: 'guest',
        userKey: protectKey(userKey)
      });

      logger.info({ forensicId, customerId: customer.id }, "MCP_TOOL_CALL: Customer created successfully");

      return {
        content: [
          { type: "text", text: `Customer created with ID: ${customer.id}` }
        ],
        structuredContent: { id: customer.id, email: input.email, fullName: input.fullName }
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
      const forensicId = Math.random().toString(36).substring(7);
      logger.info({ forensicId, input }, "MCP_TOOL_CALL: create_apartment initiated");

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
      logger.info({ forensicId, apartmentId: apt.id }, "MCP_TOOL_CALL: Apartment created successfully");

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

