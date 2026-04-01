declare type BarcodeFormat =
  | "aztec"
  | "code_128"
  | "code_39"
  | "code_93"
  | "codabar"
  | "data_matrix"
  | "ean_13"
  | "ean_8"
  | "itf"
  | "pdf417"
  | "qr_code"
  | "upc_a"
  | "upc_e";

declare interface DetectedBarcode {
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: ReadonlyArray<{ x: number; y: number }>;
  format?: BarcodeFormat;
  rawValue?: string;
}

declare interface BarcodeDetectorOptions {
  formats?: BarcodeFormat[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: ImageBitmapSource | HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | OffscreenCanvas): Promise<DetectedBarcode[]>;
  static getSupportedFormats?: () => Promise<BarcodeFormat[]>;
}

declare interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}

