// TODO: eng-upload will implement full Cloudflare Images upload pipeline

const CLOUDFLARE_ACCOUNT_ID = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID

export function getImageUrl(imageId: string, variant = 'public'): string {
  if (!CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('Missing NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID environment variable')
  }
  return `https://imagedelivery.net/${CLOUDFLARE_ACCOUNT_ID}/${imageId}/${variant}`
}
