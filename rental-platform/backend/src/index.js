import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { logger } from "./logger.js";
import bookingRoutes from "./routes/bookings.js";
import availabilityRoutes from "./routes/availabilities.js";
import calendarRoutes from "./routes/calendar.js";
import authRoutes from "./routes/auth.js";
import ucpRoutes from "./routes/ucp.js";
import { authMiddleware, requireRole } from "./auth/index.js";
import { getMcpServer } from "./mcp/server.js";

const mcpTransports = new Map();

async function handleMcp(req, res) {
  const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
  const transport = new SSEServerTransport("/mcp/messages", res);
  const server = getMcpServer();
  await server.connect(transport);

  if (transport.sessionId) {
    mcpTransports.set(transport.sessionId, transport);
    res.on('close', () => mcpTransports.delete(transport.sessionId));
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

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});
app.use(limiter);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Add common production variations to allowedOrigins
if (process.env.NODE_ENV === 'production') {
    if (!allowedOrigins.includes("https://bestflats.vip")) allowedOrigins.push("https://bestflats.vip");
    if (!allowedOrigins.includes("https://www.bestflats.vip")) allowedOrigins.push("https://www.bestflats.vip");
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    
    // Exact match in allowedOrigins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    
    // Regex match for bestflats.vip subdomains
    if (/^https:\/\/([a-z0-9-]+\.)?bestflats\.vip$/i.test(origin)) return callback(null, true);
    
    // Local development
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
    }
    
    logger.warn({ origin }, "CORS blocked for origin");
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// MCP is powerful: only admins can open sessions and post messages.
app.get("/mcp", authMiddleware, requireRole('admin'), handleMcp);
app.post("/mcp/messages", authMiddleware, requireRole('admin'), handleMcpMessages);

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { stripeWebhookHandler } = await import('./routes/webhooks.js');
  return stripeWebhookHandler(req, res);
});

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));

const PORT = process.env.PORT || 4000;

const connectWithRetry = async () => {
  let uri = process.env.MONGO_URI;
  if (!uri && process.env.NODE_ENV === 'test') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      logger.info({ uri }, "Using in-memory MongoDB for testing");
    } catch (e) {
      logger.error({ err: e.message }, "Failed to start MongoMemoryServer");
    }
  }

  if (!uri) {
    logger.error("MONGO_URI is not set. Retrying in 5s...");
    setTimeout(connectWithRetry, 5000);
    return;
  }

  logger.info("Attempting MongoDB connection...");
  return mongoose.connect(uri)
    .then(() => logger.info("MongoDB connected successfully"))
    .catch((err) => {
      logger.error({ err: err.message }, "MongoDB connection failed, retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

app.use("/bookings", bookingRoutes);
app.use("/availabilities", availabilityRoutes);
app.use("/calendar", calendarRoutes);
app.use('/auth', authRoutes);
app.use('/customers', (await import('./routes/customers.js')).default);
app.use('/geocode', (await import('./routes/geocode.js')).default);
app.use('/apartments', (await import('./routes/apartments.js')).default);
app.use('/uploads', (await import('./routes/uploads.js')).default);
app.use('/seed', (await import('./routes/seed.js')).default);
app.use('/ucp', ucpRoutes);
app.use('/payments', (await import('./routes/payments.js')).default);
app.use('/admin/platform', (await import('./routes/admin.js')).default);
app.use('/admin/host', (await import('./routes/host.js')).default);
app.use('/admin/concierge', (await import('./routes/concierge.js')).default);

app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  const status = err.status || 500;
  res.status(status).json({ error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message });
});

app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));

export default app;
