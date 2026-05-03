export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'bestflats.vip';
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/';

function cleanUploadPath(path: string) {
  const clean = path.startsWith('/') ? path.substring(1) : path;
  if (clean.startsWith('uploads/appartement/')) return `uploads/${clean.split('/').pop()}`;
  return clean;
}

export function assetUrl(path?: string) {
  if (!path) return '/placeholder.svg';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}/${cleanUploadPath(path)}`;
}
