export const cleanCustomer = (customer = {}) => ({
  name: String(customer.name || "")
    .trim()
    .replace(/\s+/g, " "),
  email: String(customer.email || "")
    .trim()
    .toLowerCase(),
  phone: String(customer.phone || "").replace(/\D/g, ""),
});

export const validCustomer = (customer) =>
  customer.name.length >= 3 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email) &&
  customer.phone.length >= 10 &&
  customer.phone.length <= 13;

export const safeQuantity = (value) =>
  Math.max(1, Math.min(99, Math.floor(Number(value)) || 1));

export const priceInCents = (value) => Math.round(Number(value) * 100);

export const discountPercent = (value) =>
  Math.max(0, Math.min(99, Number(value) || 0));

export const discountedPriceInCents = (price, percentage) =>
  Math.round(priceInCents(price) * (1 - discountPercent(percentage) / 100));

export const plainProductDescription = (value) =>
  String(value || "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/^(#{1,3}|[-*])\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
