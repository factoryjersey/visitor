import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: "What's on in Jersey | Visitor Guide", template: '%s | Jersey Visitor Guide' },
  description: "Events, tours and experiences in Jersey, from the official Jersey visitor guide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
