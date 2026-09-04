export function productInstallments(value) {
  const installments = Math.floor(Number(value) || 0);
  return Math.min(24, Math.max(0, installments));
}

export const INSTALLMENT_OPTIONS = [...Array.from({ length: 12 }, (_, index) => index + 1), 18, 24];

export function installmentMessage(value) {
  const installments = productInstallments(value);
  if (installments < 2) return "";
  return `Parcele em até ${installments}x* na maquininha no momento da entrega ou retirada. *A operadora poderá acrescentar a taxa do parcelamento.`;
}
