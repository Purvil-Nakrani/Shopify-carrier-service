import type { Metadata } from 'next';
import "./globals.css";

export const metadata: Metadata = {
  title: 'Shopify Freight Carrier Service',
  description: 'WWEX Freight Integration for Shopify',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
