import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon rendered from the same wave mark.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(135deg, #0ea5e9, #0d9488)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <path d="M10 38c6-8 10-8 16 0s10 8 16 0 10-8 16 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <path d="M14 48c5-6 8-6 12 0s8 6 12 0 8-6 12 0" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
          <circle cx="47" cy="19" r="5" fill="#fff" fillOpacity="0.9" />
        </svg>
      </div>
    ),
    size,
  );
}
