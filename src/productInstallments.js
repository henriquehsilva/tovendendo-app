export function productInstallments(value) {
  const installments = Math.floor(Number(value) || 0);
  return Math.min(12, Math.max(0, installments));
}

export function installmentMessage(value) {
  const installments = productInstallments(value);
  if (installments < 2) return "";
  return `Parcele em até ${installments}x na maquininha no momento da entrega ou retirada. A operadora poderá acrescentar a taxa do parcelamento.`;
}
