import type { Metadata, Viewport } from "next";
import { Orbitron, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import WalletModal from "@/components/WalletModal";

const display = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const mono = JetBrains_Mono({
  variable: "--font-gmono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Aries — Token Research",
  description: "Multi-agent token research. Not financial advice.",
  icons: { icon: [{ url: "/favicon.ico" }, { url: "/logo.webp", type: "image/webp" }], apple: "/logo.webp" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProvider>
          {children}
          <WalletModal />
        </WalletProvider>
      </body>
    </html>
  );
}
