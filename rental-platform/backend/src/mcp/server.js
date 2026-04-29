import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import User from "../models/User.js";
import { encrypt, generateUserKey, protectKey, blindIndex, normalizeEmail } from "../lib/encryption.js";
import { logger } from "../logger.js";
import Apartment from "../models/Apartment.js";
import { geocodeAddress } from "../lib/geocoder.js";

let serverInstance = null;

function amountDollarsToCents(value) {
  if (value === undefined || value === null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

export function getMcpServer() {
  if (serverInstance) return serverInstance;

  serverInstance = new McpServer({ name: "rental-mcp", version: "1.0.0" });

  serverInstance.tool("create_customer", {
    fullName: z.string().min(2),
    email: z.string().email()
  }, async (input) => {
    const forensicId = Math.random().toString(36).substring(7);
    const email = normalizeEmail(input.email);
    const emailHash = blindIndex(email);
    logger.info({ forensicId, emailHash }, "MCP_TOOL_CALL: create_customer initiated");

    const existing = await User.findOne({ emailHash, role: 'guest' });
    if (existing) {
      return { content: [{ type: "text", text: `Customer already exists with ID: ${existing.id}` }], structuredContent: { id: existing.id } };
    }

    const userKey = generateUserKey();
    const customer = await User.create({
      fullName: encrypt(input.fullName, userKey),
      email: encrypt(email, userKey),
      emailHash,
      role: 'guest',
      userKey: protectKey(userKey)
    });

    logger.info({ forensicId, customerId: customer.id }, "MCP_TOOL_CALL: Customer created successfully");
    return { content: [{ type: "text", text: `Customer created with ID: ${customer.id}` }], structuredContent: { id: customer.id } };
  });

  serverInstance.tool("create_apartment", {
    name: z.string().min(1),
    description: z.string().optional(),
    smallDescription: z.string().optional(),
    address: z.string().optional(),
    photos: z.array(z.string()).optional(),
    pricePerNight: z.number().optional(),
    rules: z.string().optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
    depositAmount: z.number().optional(),
    ethAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
  }, async (input) => {
    const forensicId = Math.random().toString(36).substring(7);
    logger.info({ forensicId, name: input.name }, "MCP_TOOL_CALL: create_apartment initiated");

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
      depositAmount: amountDollarsToCents(input.depositAmount),
      ethAddress: input.ethAddress
    };

    const apt = await Apartment.create(payload);
    logger.info({ forensicId, apartmentId: apt.id }, "MCP_TOOL_CALL: Apartment created successfully");
    return { content: [{ type: "text", text: JSON.stringify(apt) }], structuredContent: apt };
  });

  logger.info("MCP server configured (tools registered)");
  return serverInstance;
}

export function startMcpServer() {
  return getMcpServer();
}
