import QRCode from 'qrcode';
import fs from 'fs';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/generate-qr.mjs <url>');
  process.exit(1);
}

QRCode.toFile('expo-go-qr.png', url, (err) => {
  if (err) throw err;
  console.log('QR code generated successfully: expo-go-qr.png');
});
