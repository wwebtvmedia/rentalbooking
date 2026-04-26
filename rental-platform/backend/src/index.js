import express from "express";
import mongoose from "mongoose";
import { logger } from "./logger.js";
import customerRoutes from "./routes/customers.js";
import bookingRoutes from "./routes/bookings.js";
import availabilityRoutes from "./routes/availabilities.js";
import calendarRoutes from "./routes/calendar.js";
import authRoutes from "./routes/auth.js";
import ucpRoutes from "./routes/ucp.js";
import { authMiddleware } from "./auth/index.js";
import { getMcpServer } from "./mcp/server.js";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

const mcpTransports = new Map();

async function handleMcp(req, res) {
  const { SSEServerTransport } = await import("@modelcontextprotocol/sdk/server/sse.js");
  const transport = new SSEServerTransport("/mcp/messages", res);
  const server = getMcpServer();
  await server.connect(transport);

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

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test',
});
app.use(limiter);

// Allow one or more frontend origins. Set FRONTEND_ORIGIN as a comma-separated list in production.
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    
    // Check if origin matches any in the allowedOrigins list
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Dynamic Subdomain Check: Allow anything ending in .bestflats.vip
    const isBestFlatsSubdomain = /^https?:\/\/(.*?\.)?bestflats\.vip$/.test(origin);
    if (isBestFlatsSubdomain) return callback(null, true);

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// MCP SSE routes
app.get("/mcp", authMiddleware, (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}, handleMcp);
app.post("/mcp/messages", authMiddleware, (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}, handleMcpMessages);

// Stripe webhooks need the raw request body, so this route must be mounted before express.json().
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const { stripeWebhookHandler } = await import('./routes/webhooks.js');
  return stripeWebhookHandler(req, res);
});

app.use(express.json());

// serve uploaded files
import path from 'path';
const uploadDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

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
app.use('/payments', (await import('./routes/payments.js')).default);
app.use('/admin/platform', (await import('./routes/admin.js')).default);
app.use('/admin/host', (await import('./routes/host.js')).default);
app.use('/admin/concierge', (await import('./routes/concierge.js')).default);

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === "production" ? "Internal Server Error" : err.message
  });
});

app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
});

export default app;
