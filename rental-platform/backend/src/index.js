import express from "express";
import mongoose from "mongoose";
import { logger } from "./logger.js";
import customerRoutes from "./routes/customers.js";
import bookingRoutes from "./routes/bookings.js";
import availabilityRoutes from "./routes/availabilities.js";
import calendarRoutes from "./routes/calendar.js";
import authRoutes from "./routes/auth.js";
import { startMcpServer } from "./mcp/server.js";
import cors from "cors";

const app = express();
// Allow the frontend origin. Adjust or restrict as needed for production.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000", credentials: true }));
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
app.use('/apartments', (await import('./routes/apartments.js')).default);
app.use('/uploads', (await import('./routes/uploads.js')).default);

app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
});

if (process.env.NODE_ENV !== 'test') {
  startMcpServer();
}

export default app;
