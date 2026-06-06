import axios from 'axios';
import { API_BASE_URL } from './config';

// The collection reflects ONLY real backend data. When the API returns nothing we show
// an empty collection (no phantom/demo listings) so links never lead to broken pages.
export async function fetchApartments() {
  try {
    const res = await axios.get(`${API_BASE_URL}/apartments`, { timeout: 8000 });
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

export async function fetchApartmentById(id?: string | string[]) {
  const normalizedId = Array.isArray(id) ? id[0] : id;
  if (!normalizedId) return null;

  try {
    const res = await axios.get(`${API_BASE_URL}/apartments/${normalizedId}`, { timeout: 8000 });
    return res.data || null;
  } catch {
    return null;
  }
}
