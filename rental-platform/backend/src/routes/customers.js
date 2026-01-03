import express from "express";
import Customer from "../models/Customer.js";
import { authMiddleware, requireRole } from "../auth/index.js";

const router = express.Router();

// Attach basic auth middleware that sets req.user
router.use(authMiddleware);

// GET /customers - list customers or lookup by email
router.get("/", async (req, res) => {
  try {
    if (req.query.email) {
      const c = await Customer.findOne({ email: req.query.email });
      return res.json(c ? [c] : []);
    }
    const customers = await Customer.find().limit(100);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// POST /customers - create a customer (public). If email exists, return existing customer.
router.post("/", async (req, res) => {
  try {
    const { fullName, email } = req.body;
    if (!fullName || !email) return res.status(400).json({ error: 'Missing name/email' });
    const existing = await Customer.findOne({ email });
    if (existing) return res.status(200).json(existing);
    const customer = await Customer.create({ fullName, email });
    res.status(201).json(customer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
