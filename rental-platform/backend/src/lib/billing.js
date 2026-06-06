// Tax + invoice helpers. TAX_RATE is a fraction (e.g. 0.20 = 20%); default 0.20.
export function taxRate() {
  const r = Number(process.env.TAX_RATE);
  return Number.isFinite(r) && r >= 0 ? r : 0.20;
}

const round2 = (n) => Number((n || 0).toFixed(2));

// Build an invoice (bill) with tax from a set of settled bookings.
export function buildInvoice({ invoiceFor, bookings = [], from, to }) {
  const rate = taxRate();
  const lineItems = bookings.map((b) => ({
    bookingId: b._id,
    apartmentId: b.apartmentId,
    date: b.start,
    amount: round2((b.depositAmount || 0) / 100),
  }));
  const subtotal = round2(lineItems.reduce((a, b) => a + b.amount, 0));
  const taxAmount = round2(subtotal * rate);
  const total = round2(subtotal + taxAmount);
  return {
    invoiceFor: invoiceFor || null,
    period: { from: from || null, to: to || null },
    currency: (process.env.STRIPE_CURRENCY || 'usd').toUpperCase(),
    lineItems,
    subtotal,
    taxRate: rate,
    taxAmount,
    total,
    generatedAt: new Date().toISOString(),
  };
}
