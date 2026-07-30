// SKU / barcode generation for locally-created products. Both run entirely
// offline — the till has no reservation service to ask for the next code —
// so uniqueness comes from a random suffix plus the caller re-checking the
// local catalogue (see `isSkuTaken` / `isBarcodeTaken`).

const ALPHANUMERIC = /[^a-z0-9]+/gi;

function slugSegment(value: string, length: number): string {
  const cleaned = value.replace(ALPHANUMERIC, "").toUpperCase();
  return cleaned.slice(0, length);
}

function randomDigits(count: number): string {
  const bytes = new Uint8Array(count);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join("");
}

export interface SkuSeed {
  name: string;
  category?: string;
  brand?: string;
}

// e.g. { name: "Whole Milk 2L", category: "Dairy", brand: "Anchor" }
// -> "DAI-ANC-WHOLE-4821"
export function generateSku(seed: SkuSeed): string {
  const parts = [
    slugSegment(seed.category ?? "", 3) || "GEN",
    slugSegment(seed.brand ?? "", 3),
    slugSegment(seed.name, 5) || "ITEM",
    randomDigits(4),
  ];
  return parts.filter(Boolean).join("-");
}

// Standard EAN-13 modulo-10 check digit: positions alternate weight 1 and 3
// from the left, and the digit is whatever brings the weighted sum to a
// multiple of ten.
export function ean13CheckDigit(twelveDigits: string): number {
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    const digit = Number(twelveDigits[index]);
    sum += index % 2 === 0 ? digit : digit * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  return ean13CheckDigit(barcode.slice(0, 12)) === Number(barcode[12]);
}

// GS1 reserves prefixes 20–29 for in-store items that never leave the
// retailer, which is exactly what a locally-created product is.
export function generateBarcode(prefix = "200"): string {
  const body = `${prefix}${randomDigits(12 - prefix.length)}`.slice(0, 12);
  return `${body}${ean13CheckDigit(body)}`;
}

// The shelf-edge QR encodes the till lookup key rather than a URL so scanning
// works with no network. Falls back to the barcode when no SKU exists yet.
export function generateQrPayload(sku: string, barcode: string): string {
  const key = sku.trim() || barcode.trim();
  return key ? `POS:PRODUCT:${key}` : "";
}
