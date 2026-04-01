"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { IScannerControls } from "@zxing/browser";
import { FOOD_BARCODE_FORMATS, getBarcodeScannerSupport, normalizeBarcodeValue } from "@/app/components/barcodeScannerSupport";

type Props = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeIntervalRef = useRef<number | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "unsupported" | "error">("starting");
  const [message, setMessage] = useState("Starting camera…");
  const [photoLoading, setPhotoLoading] = useState(false);

  const support = useMemo(() => getBarcodeScannerSupport(), []);

  useEffect(() => {
    if (!support.supported) {
      setStatus("unsupported");
      setMessage(support.reason ?? "Camera scanning is not supported in this browser.");
      return;
    }

    let cancelled = false;

    async function startScanner() {
      try {
        if (support.mode === "native") {
          await startNativeScanner(cancelled);
          return;
        }

        await startCompatibilityScanner(cancelled);
      } catch (error) {
        setStatus("error");
        setMessage(describeScannerError(error));
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onDetected, support]);

  async function startNativeScanner(cancelled: boolean) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
      },
    });

    if (cancelled) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("Camera preview is unavailable.");
    }

    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play();

    const Detector = window.BarcodeDetector;
    if (!Detector) {
      throw new Error("Live barcode detection is not available in this browser.");
    }

    const detector = new Detector({ formats: FOOD_BARCODE_FORMATS });

    setStatus("ready");
    setMessage("Point the barcode at the camera.");

    nativeIntervalRef.current = window.setInterval(async () => {
      const activeVideo = videoRef.current;
      if (!activeVideo || activeVideo.readyState < 2) {
        return;
      }

      try {
        const results = await detector.detect(activeVideo);
        const first = results.find((result) => result.rawValue);
        const rawValue = first?.rawValue ? normalizeBarcodeValue(first.rawValue) : "";
        if (rawValue) {
          stopScanner();
          onDetected(rawValue);
        }
      } catch {
        // keep scanning silently; transient detect failures are common
      }
    }, 450);
  }

  async function startCompatibilityScanner(cancelled: boolean) {
    const video = videoRef.current;
    if (!video) {
      throw new Error("Camera preview is unavailable.");
    }

    video.setAttribute("playsinline", "true");

    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
    if (cancelled) {
      return;
    }

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    setStatus("ready");
    setMessage(
      support.preferStillImageCapture
        ? "iPhone mode is on. If live scan misses, tap “Take photo instead”."
        : "Compatibility scan is ready. Hold the barcode inside the frame.",
    );

    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      },
      video,
      (result) => {
        const rawValue = result?.getText ? normalizeBarcodeValue(result.getText()) : "";
        if (rawValue) {
          stopScanner();
          onDetected(rawValue);
        }
      },
    );

    if (cancelled) {
      controls.stop();
      return;
    }

    scannerControlsRef.current = controls;
    const previewStream = video.srcObject;
    streamRef.current = previewStream instanceof MediaStream ? previewStream : null;
  }

  async function handlePhotoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setPhotoLoading(true);

    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = await loadImageFromObjectUrl(objectUrl);
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromImageElement(image);
        const rawValue = result?.getText ? normalizeBarcodeValue(result.getText()) : "";

        if (!rawValue) {
          throw new Error("No barcode was found in that photo.");
        }

        stopScanner();
        onDetected(rawValue);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      setMessage(error instanceof Error
        ? `${error.message} Try another photo or type the barcode manually.`
        : "Could not read that photo. Try another shot or type the barcode manually.");
    } finally {
      setPhotoLoading(false);
    }
  }

  function stopScanner() {
    if (nativeIntervalRef.current != null) {
      window.clearInterval(nativeIntervalRef.current);
      nativeIntervalRef.current = null;
    }

    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  return (
    <div className="barcode-scanner card-inset">
      <div className="barcode-scanner__header">
        <div>
          <div className="barcode-scanner__eyebrow">Barcode scan</div>
          <div className="barcode-scanner__status">{message}</div>
        </div>
        <button type="button" className="btn-ghost btn-sm" onClick={() => { stopScanner(); onClose(); }}>
          Close
        </button>
      </div>

      <div className="barcode-scanner__viewport">
        {status === "ready" ? (
          <video ref={videoRef} className="barcode-scanner__video" autoPlay muted playsInline />
        ) : (
          <div className="barcode-scanner__placeholder">
            <span style={{ fontSize: "1.5rem" }}>{status === "unsupported" ? "📵" : status === "error" ? "⚠️" : "📷"}</span>
            <p>{message}</p>
          </div>
        )}
        {status === "ready" && (
          <div className="barcode-scanner__guide" aria-hidden="true">
            <div className="barcode-scanner__guide-line" />
          </div>
        )}
      </div>

      <div className="barcode-scanner__actions">
        <button
          type="button"
          className="btn-tonal btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={photoLoading}
        >
          {photoLoading ? "Reading photo…" : support.preferStillImageCapture || support.mode === "unsupported" ? "📸 Take photo instead" : "📸 Scan from photo"}
        </button>
        <span className="barcode-scanner__mode-badge">
          {support.mode === "native" ? "Live scan" : support.mode === "fallback" ? "Compatibility mode" : "Photo fallback"}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelected}
        style={{ display: "none" }}
      />

      <p className="barcode-scanner__hint">
        On iPhone browsers like Brave, Chrome, and Safari, the photo option is often the most reliable fallback.
      </p>
    </div>
  );
}

function describeScannerError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError") {
      return "Camera permission was blocked. Allow camera access and try again.";
    }
    if (error.name === "NotFoundError") {
      return "No back camera was found on this device.";
    }
    return error.message;
  }

  return "Could not start the camera.";
}

function loadImageFromObjectUrl(objectUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected photo could not be opened."));
    image.src = objectUrl;
  });
}

