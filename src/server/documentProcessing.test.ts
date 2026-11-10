import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { hasDocumentSignature, optimizeOcrImage } from './documentProcessing.ts';

test('document signature validation accepts PDF, JPEG, PNG, and WEBP content only for matching MIME types', () => {
  const fixtures: [Buffer, string][] = [
    [Buffer.from('%PDF-1.7'), 'application/pdf'],
    [Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'],
    [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'],
    [Buffer.from('RIFF0000WEBP'), 'image/webp'],
  ];

  for (const [content, mimeType] of fixtures) {
    assert.equal(hasDocumentSignature(content, mimeType), true);
    assert.equal(hasDocumentSignature(content, 'text/plain'), false);
  }
  assert.equal(hasDocumentSignature(Buffer.from('not a document'), 'application/pdf'), false);
});

test('image optimization resizes large images and encodes readable JPEG output', async () => {
  const source = await sharp({
    create: { width: 3200, height: 1800, channels: 3, background: '#ffffff' },
  }).png().toBuffer();

  const optimized = await optimizeOcrImage(source);
  const metadata = await sharp(optimized).metadata();

  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 2800);
  assert.equal(metadata.height, 1575);
});
