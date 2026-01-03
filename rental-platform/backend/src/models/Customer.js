import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }
}, { timestamps: true });

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
