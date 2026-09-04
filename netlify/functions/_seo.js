export const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

export const plainText = (value, maxLength = 180) => String(value || "")
  .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[*_#>`~-]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

export const absoluteUrl = (baseUrl, value) => {
  try { return new URL(String(value || ""), baseUrl).href; }
  catch { return baseUrl; }
};

export const safeJsonLd = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

export const productImages = (product, baseUrl) => {
  const images = product.imageUrls?.length ? product.imageUrls : [product.imageUrl];
  return images.filter(Boolean).map((image) => absoluteUrl(baseUrl, image));
};

export const productAvailability = (product) =>
  product.unavailable === true || product.active === false ||
  (product.stock !== undefined && Number(product.stock) <= 0)
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";

export const productSchema = ({ baseUrl, store, product, productId }) => {
  const url = `${baseUrl}/loja/${encodeURIComponent(store.slug)}/produto/${encodeURIComponent(productId)}`;
  const discount = Math.min(99, Math.max(0, Number(product.cashbackPercent) || 0));
  const price = Math.round((Number(product.price) || 0) * (1 - discount / 100) * 100) / 100;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: plainText(product.description, 500),
    image: productImages(product, baseUrl),
    sku: product.sku || productId,
    ...(product.gtin ? { gtin: String(product.gtin) } : {}),
    brand: { "@type": "Brand", name: product.brand || store.brand },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "BRL",
      price: price.toFixed(2),
      availability: productAvailability(product),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: store.brand },
    },
  };
};
