/** Formats an amount in the given ISO currency for display. */
export function formatMoney(amount: number, currencyCode = "USD", locale = "en-US"): string {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
