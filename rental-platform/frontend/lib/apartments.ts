import axios from 'axios';
import { API_BASE_URL } from './config';
import { FALLBACK_APARTMENTS, findFallbackApartment } from './fallbackApartments';

export async function fetchApartments() {
  try {
    const res = await axios.get(`${API_BASE_URL}/apartments`, { timeout: 8000 });
    return Array.isArray(res.data) && res.data.length > 0 ? res.data : FALLBACK_APARTMENTS;
  } catch {
    return FALLBACK_APARTMENTS;
  }
}

export async function fetchApartmentById(id?: string | string[]) {
  const normalizedId = Array.isArray(id) ? id[0] : id;
  if (!normalizedId) return findFallbackApartment(normalizedId);

  try {
    const res = await axios.get(`${API_BASE_URL}/apartments/${normalizedId}`, { timeout: 8000 });
    return res.data || findFallbackApartment(normalizedId);
  } catch {
    return findFallbackApartment(normalizedId);
  }
}
