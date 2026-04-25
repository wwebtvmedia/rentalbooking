import express from "express";
import mongoose from "mongoose";
import { logger } from "./logger.js";
import customerRoutes from "./routes/customers.js";
import bookingRoutes from "./routes/bookings.js";
import availabilityRoutes from "./routes/availabilities.js";
import calendarRoutes from "./routes/calendar.js";
import authRoutes from "./routes/auth.js";
import ucpRoutes from "./routes/ucp.js";
import { getMcpServer } from "./mcp/server.js";
import cors from "cors";

const mcpTransports = new Map();

async function handleMcp(req, res) {
  const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
  const transport = new SSEServerTransport("/mcp/messages", res);
  const server = getMcpServer();
  await server.connect(transport);

  // Store transport for message handling
  if (transport.sessionId) {
    mcpTransports.set(transport.sessionId, transport);
    res.on('close', () => {
      mcpTransports.delete(transport.sessionId);
    });
  }
}

async function handleMcpMessages(req, res) {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
  const transport = mcpTransports.get(sessionId);
  if (!transport) return res.status(400).json({ error: "No active SSE session for this ID" });
  await transport.handlePostMessage(req, res);
}

const app = express();
// Allow the frontend origin. Adjust or restrict as needed for production.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000", credentials: true }));

// MCP SSE routes
app.get("/mcp", handleMcp);
app.post("/mcp/messages", handleMcpMessages);

app.use(express.json());

// serve uploaded files
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected");
  })
  .catch((err) => {
    logger.error({ err }, "MongoDB connection error");
    process.exit(1);
  });

app.use("/customers", customerRoutes);
app.use("/bookings", bookingRoutes);
app.use("/availabilities", availabilityRoutes);
app.use("/calendar", calendarRoutes);
app.use('/auth', authRoutes);
app.use('/geocode', (await import('./routes/geocode.js')).default);
app.use('/apartments', (await import('./routes/apartments.js')).default);
app.use('/uploads', (await import('./routes/uploads.js')).default);
app.use('/seed', (await import('./routes/seed.js')).default);
app.use('/ucp', ucpRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message
  });
});

// Payments and webhooks
app.use('/payments', (await import('./routes/payments.js')).default);
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { stripeWebhookHandler } = await import('./routes/webhooks.js');
  return stripeWebhookHandler(req, res);
});

app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
});

export default app;
