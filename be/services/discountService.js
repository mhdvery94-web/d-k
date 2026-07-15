function calculateOrderDiscount(subtotal, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return 0;
  return Math.round((subtotal * discountPercent) / 100);
}

module.exports = { calculateOrderDiscount };
