export function normalizeBarcodeValue(input: string): string {
  return input.replace(/\D/g, "");
}

export function getBarcodeScannerSupport(): { supported: boolean; reason?: string } {
  if (typeof window === "undefined") {
    return { supported: false, reason: "Camera scanning is only available in the browser." };
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: "Camera scanning requires HTTPS or localhost." };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return { supported: false, reason: "This browser does not support camera access." };
  }

  if (!("BarcodeDetector" in window)) {
    return { supported: false, reason: "This browser does not support live barcode detection yet." };
  }

  return { supported: true };
}

export const FOOD_BARCODE_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
];

