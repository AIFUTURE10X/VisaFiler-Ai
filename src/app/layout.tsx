import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisaDesk AI",
  description: "Thailand visa paperwork from a saved profile."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
