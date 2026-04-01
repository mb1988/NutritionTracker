import { afterEach, describe, expect, it, vi } from "vitest";
import { FOOD_BARCODE_FORMATS, getBarcodeScannerSupport, normalizeBarcodeValue } from "@/app/components/barcodeScannerSupport";

describe("barcodeScannerSupport", () => {
  afterEach(() => {
	vi.unstubAllGlobals();
  });

  it("normalizes barcode values to digits only", () => {
	expect(normalizeBarcodeValue(" 54 4900-0000996 ")).toBe("5449000000996");
  });

	it("keeps photo fallback available when live camera scan is blocked by insecure context", () => {
	  vi.stubGlobal("window", { isSecureContext: false });
	  vi.stubGlobal("navigator", {
		mediaDevices: { getUserMedia: vi.fn() },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
	  });

	  expect(getBarcodeScannerSupport()).toEqual({
		supported: false,
		mode: "unsupported",
		reason: "Live camera scan requires HTTPS or localhost. You can still use the photo option below.",
		preferStillImageCapture: true,
	  });
	});

  it("reports unsupported when BarcodeDetector is unavailable", () => {
	vi.stubGlobal("window", { isSecureContext: true });
	vi.stubGlobal("navigator", {
	  mediaDevices: { getUserMedia: vi.fn() },
	  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
	});

	expect(getBarcodeScannerSupport()).toEqual({
	  supported: true,
	  mode: "fallback",
	  reason: "Compatibility scan mode is ready for this browser.",
	  preferStillImageCapture: false,
	});
  });

  it("reports support when secure camera access and BarcodeDetector are available", () => {
	vi.stubGlobal("window", {
	  isSecureContext: true,
	  BarcodeDetector: class MockBarcodeDetector {},
	});
	vi.stubGlobal("navigator", {
	  mediaDevices: { getUserMedia: vi.fn() },
	  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
	});

	expect(getBarcodeScannerSupport()).toEqual({
	  supported: true,
	  mode: "native",
	  preferStillImageCapture: false,
	});
	expect(FOOD_BARCODE_FORMATS).toContain("ean_13");
  });

	it("prefers still image capture on iPhone fallback browsers", () => {
	  vi.stubGlobal("window", { isSecureContext: true });
	  vi.stubGlobal("navigator", {
		mediaDevices: { getUserMedia: vi.fn() },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
	  });

	  expect(getBarcodeScannerSupport()).toEqual({
		supported: true,
		mode: "fallback",
		reason: "iPhone-compatible scan mode is ready. If live scan is slow, use the photo option below.",
		preferStillImageCapture: true,
	  });
	});
});

