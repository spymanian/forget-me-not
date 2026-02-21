import type { Metadata } from "next";
import { Playfair_Display, Courier_Prime } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  weight: ["400", "700", "800"],
  subsets: ["latin"],
  variable: "--font-display",
});

const courierPrime = Courier_Prime({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-typewriter",
});

export const metadata: Metadata = {
  title: "Forget Me Not",
  description: "Plant a memory. Watch it bloom.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${courierPrime.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
