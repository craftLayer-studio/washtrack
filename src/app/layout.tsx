import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'https://washtrack.craftlayer.store'),
  title: { default: 'WashTrack: QR garment tags and WhatsApp updates for laundries', template: '%s | WashTrack' },
  description:
    'Every garment tagged, every customer updated. QR tags and intake photos, scan-to-update stages, WhatsApp ready alerts, UPI payments, pickups and monthly plans for Indian laundries and dry cleaners.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
