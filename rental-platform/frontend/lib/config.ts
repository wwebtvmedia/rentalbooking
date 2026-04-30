export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.bestflats.vip';
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'bestflats.vip';
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/';

export function assetUrl(path?: string) {
  if (!path) return '/placeholder.svg';
  if (path.startsWith('http')) return path;
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
}
