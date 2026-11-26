import QRCode from 'qrcode';

/** QR code as an SVG data URL (server-side, no network). */
export async function qrDataUrl(text: string): Promise<string> {
  const svg = await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
