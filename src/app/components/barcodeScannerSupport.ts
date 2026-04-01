export type BarcodeScannerSupport = {
  supported: boolean;
  mode: "native" | "fallback" | "unsupported";
  reason?: string;
  preferStillImageCapture: boolean;
};

export function normalizeBarcodeValue(input: string): string {
  return input.replace(/\D/g, "");
}

export function getBarcodeScannerSupport(): BarcodeScannerSupport {
  if (typeof window === "undefined") {
    return {
      supported: false,
      mode: "unsupported",
      reason: "Camera scanning is only available in the browser.",
      preferStillImageCapture: false,
    };
  }

  const preferStillImageCapture = isLikelyIPhoneBrowser(navigator.userAgent ?? "");

  if (!window.isSecureContext) {
    return {
      supported: false,
      mode: "unsupported",
      reason: "Live camera scan requires HTTPS or localhost. You can still use the photo option below.",
      preferStillImageCapture,
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      supported: false,
      mode: "unsupported",
      reason: "Live camera scan is not available in this browser. Try the photo option below.",
      preferStillImageCapture,
    };
  }

  if ("BarcodeDetector" in window) {
    return {
      supported: true,
      mode: "native",
      preferStillImageCapture,
    };
  }

  return {
    supported: true,
    mode: "fallback",
    reason: preferStillImageCapture
      ? "iPhone-compatible scan mode is ready. If live scan is slow, use the photo option below."
      : "Compatibility scan mode is ready for this browser.",
    preferStillImageCapture,
  };
}

function isLikelyIPhoneBrowser(userAgent: string): boolean {
  return /iPhone|iPod/i.test(userAgent);
}

export const FOOD_BARCODE_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
];

