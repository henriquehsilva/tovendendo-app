export const normalizeExternalOffers = (offers) =>
  (Array.isArray(offers) ? offers : [])
    .map((offer) => ({
      marketplace: String(offer?.marketplace || "").trim(),
      url: String(offer?.url || "").trim(),
      price: Number(offer?.price) || 0,
    }))
    .filter((offer) => offer.marketplace && offer.url && offer.price > 0);

export const isSafeOfferUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

export const externalOfferError = (offers) => {
  const filled = (Array.isArray(offers) ? offers : []).filter((offer) =>
    offer?.marketplace || offer?.url || offer?.price,
  );
  if (filled.some((offer) => !String(offer.marketplace || "").trim()))
    return "Informe o nome da loja ou marketplace em todas as ofertas externas.";
  if (filled.some((offer) => !isSafeOfferUrl(offer.url)))
    return "Informe um link válido, começando com http:// ou https://, para cada oferta externa.";
  if (filled.some((offer) => !(Number(offer.price) > 0)))
    return "Informe um preço válido para cada oferta externa.";
  return "";
};
