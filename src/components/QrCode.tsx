"use client";
import QR from "qrcode";
import { useEffect, useState } from "react";

/** Renders a QR as an SVG image (crisp at any print size). Dark-on-white for reliable scanning. */
export function QrCode({ value, size = 180, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QR.toString(value, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b1340", light: "#ffffff" } })
      .then((svg) => setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`));
  }, [value]);
  return (
    <div className={className} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize */}
      {src && <img src={src} alt="QR code" width={size} height={size} />}
    </div>
  );
}
