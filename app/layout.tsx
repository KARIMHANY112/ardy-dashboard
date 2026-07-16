import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ardy Owner Dashboard",
  description: "Review and approve listing requests for the Ardy marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
