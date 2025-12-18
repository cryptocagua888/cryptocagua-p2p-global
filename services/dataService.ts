
import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

const STORAGE_KEY = 'cryptocagua_v10_storage';
const ADMIN_KEY = 'cryptocagua_admin_auth';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const PHONE_KEY = 'cryptocagua_admin_phone';
const EMAIL_KEY = 'cryptocagua_admin_email';

export const getSheetUrl = () => localStorage.getItem(CONFIG_KEY) || '';
export const saveSheetUrl = (url: string) => localStorage.setItem(CONFIG_KEY, url);
export const getAdminPhone = () => localStorage.getItem(PHONE_KEY) || '';
export const saveAdminPhone = (p: string) => localStorage.setItem(PHONE_KEY, p.replace(/[^0-9]/g, ''));
export const getAdminEmail = () => localStorage.getItem(EMAIL_KEY) || '';
export const saveAdminEmail = (e: string) => localStorage.setItem(EMAIL_KEY, e);

export const isAdmin = (): boolean => localStorage.getItem(ADMIN_KEY) === 'true';
export const setAdminSession = (val: boolean) => {
  if (val) localStorage.setItem(ADMIN_KEY, 'true');
  else localStorage.removeItem(ADMIN_KEY);
};

export const getOffers = (): Offer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const fetchOffers = async (): Promise<Offer[]> => {
  const url = getSheetUrl();
  if (!url) return getOffers();
  try {
    const params = new URLSearchParams({ action: 'read' });
    const res = await fetch(url, { method: 'POST', body: params });
    const json = await res.json();
    if (json.success) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
      return json.data;
    }
    return getOffers();
  } catch {
    return getOffers();
  }
};

export const addOffer = (offer: Omit<Offer, 'id' | 'createdAt' | 'status' | 'reputation' | 'verified'>): Offer => {
  const newOffer: Offer = {
    ...offer,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    reputation: 0,
    verified: false
  };
  const updated = [newOffer, ...getOffers()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newOffer;
};

export const syncWithGoogleSheets = async (offer: Offer): Promise<boolean> => {
  const url = getSheetUrl();
  if (!url) return true;
  try {
    const params = new URLSearchParams({ action: 'save', ...offer as any });
    const res = await fetch(url, { method: 'POST', body: params });
    return res.ok;
  } catch {
    return false;
  }
};

export const approveOffer = async (id: string) => {
  const offers = getOffers().map(o => o.id === id ? { ...o, status: 'APPROVED' as OfferStatus } : o);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  const url = getSheetUrl();
  if (url) {
    const params = new URLSearchParams({ action: 'updateStatus', id, status: 'APPROVED' });
    await fetch(url, { method: 'POST', body: params });
  }
};

export const deleteOffer = (id: string) => {
  const offers = getOffers().filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  const url = getSheetUrl();
  if (url) {
    const params = new URLSearchParams({ action: 'delete', id });
    fetch(url, { method: 'POST', body: params });
  }
};

export const testConnection = async () => {
  const url = getSheetUrl();
  if (!url) return { success: false, message: "URL no configurada" };
  try {
    const params = new URLSearchParams({ action: 'save', id: 'TEST', title: 'Test' });
    const res = await fetch(url, { method: 'POST', body: params });
    return { success: res.ok, message: res.ok ? "Conexión exitosa" : "Error de respuesta" };
  } catch {
    return { success: false, message: "Error de red" };
  }
};

export const getUserProfile = () => {
  const p = localStorage.getItem('cryptocagua_profile');
  return p ? JSON.parse(p) : null;
};
export const saveUserProfile = (nickname: string, contactInfo: string) => {
  localStorage.setItem('cryptocagua_profile', JSON.stringify({ nickname, contactInfo }));
};
export const processMagicLink = (): boolean => {
  const p = new URLSearchParams(window.location.search);
  const setup = p.get('setup');
  if (setup) {
    try {
      const url = atob(setup);
      if (url.startsWith('http')) {
        saveSheetUrl(url);
        return true;
      }
    } catch {}
  }
  return false;
};
