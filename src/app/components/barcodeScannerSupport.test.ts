import { afterEach, describe, expect, it, vi } from "vitest";
import { FOOD_BARCODE_FORMATS, getBarcodeScannerSupport, normalizeBarcodeValue } from "@/app/components/barcodeScannerSupport";

describe("barcodeScannerSupport", () => {
  afterEach(() => {
	vi.unstubAllGlobals();
  });

  it("normalizes barcode values to digits only", () => {
	expect(normalizeBarcodeValue(" 54 4900-0000996 ")).toBe("5449000000996");
  });

  it("reports unsupported when BarcodeDetector is unavailable", () => {
	vi.stubGlobal("window", { isSecureContext: true });
	vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });

	expect(getBarcodeScannerSupport()).toEqual({
	  supported: false,
	  reason: "This browser does not support live barcode detection yet.",
	});
  });

  it("reports support when secure camera access and BarcodeDetector are available", () => {
	vi.stubGlobal("window", {
	  isSecureContext: true,
	  BarcodeDetector: class MockBarcodeDetector {},
	});
	vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });

	expect(getBarcodeScannerSupport()).toEqual({ supported: true });
	expect(FOOD_BARCODE_FORMATS).toContain("ean_13");
  });
});

