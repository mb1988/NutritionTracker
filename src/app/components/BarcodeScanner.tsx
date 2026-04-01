"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FOOD_BARCODE_FORMATS, getBarcodeScannerSupport, normalizeBarcodeValue } from "@/app/components/barcodeScannerSupport";

type Props = {
  onDetected: (barcode: string) => void;
  onClose: () => void;
};

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "unsupported" | "error">("starting");
  const [message, setMessage] = useState("Starting camera…");

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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = window.BarcodeDetector;
        if (!Detector) {
          setStatus("unsupported");
          setMessage("Live barcode detection is not available in this browser.");
          return;
        }

        const detector = new Detector({ formats: FOOD_BARCODE_FORMATS });

        setStatus("ready");
        setMessage("Point the camera at a barcode.");

        intervalRef.current = window.setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            return;
          }

          try {
            const results = await detector.detect(video);
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
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Could not start the camera.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onDetected, support]);

  function stopScanner() {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  return (
    <div className="barcode-scanner card-inset">
      <div className="barcode-scanner__header">
        <div>
          <div className="barcode-scanner__eyebrow">Camera barcode scan</div>
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

      <p className="barcode-scanner__hint">
        If scanning does not work on this browser, paste the barcode manually into the lookup field.
      </p>
    </div>
  );
}

