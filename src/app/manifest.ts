import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dheu",
    short_name: "Dheu",
    description: "Share moments with your people.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f8fa",
    theme_color: "#0b8fa8",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
