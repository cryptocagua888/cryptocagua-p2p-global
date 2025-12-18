
import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

const STORAGE_KEY = 'cryptocagua_v13_storage';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_active';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const PHONE_KEY = 'cryptocagua_admin_phone';
const EMAIL_KEY = 'cryptocagua_admin_email';
// Key for storing the user's local profile (nickname and contact info)
const PROFILE_KEY = 'cryptocagua_user_profile';

export const getSheetUrl = () => localStorage.getItem(CONFIG_KEY) || '';
export const saveSheetUrl = (url: string) => localStorage.setItem(CONFIG_KEY, url);
export const getAdminPhone = () => localStorage.getItem(PHONE_KEY) || '';
export const saveAdminPhone = (p: string) => localStorage.setItem(PHONE_KEY, p.replace(/[^0-9]/g, ''));
export const getAdminEmail = () => localStorage.getItem(EMAIL_KEY) || '';
export const saveAdminEmail = (e: string) => localStorage.setItem(EMAIL_KEY, e);

// Fix: Added getUserProfile to retrieve saved nickname and contact info from localStorage
export const getUserProfile = (): { nickname: string; contactInfo: string } | null => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : null;
};

// Fix: Added saveUserProfile to persist user nickname and contact info locally
export const saveUserProfile = (nickname: string, contactInfo: string) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname, contactInfo }));
};

export const isAdmin = (): boolean => localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
export const setAdminSession = (val: boolean) => {
  if (val) localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  else localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const getOffers = (): Offer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const fetchOffers = async (): Promise<Offer[]> => {
  const url = getSheetUrl();
  if (!url) return getOffers();
  try {
    const params = new URLSearchParams();
    params.append('action', 'read');
    
    await fetch(url, { 
      method: 'POST', 
      mode: 'no-cors', // Apps Script requires a simple POST or specific handling for CORS
    });
    
    // As Apps Script with no-cors doesn't return the body, we use a 'read' action via GET
    const response = await fetch(`${url}?action=read`);
    const json = await response.json();
    
    if (json.success) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
      return json.data;
    }
    return getOffers();
  } catch (e) {
    console.error("Error al obtener ofertas:", e);
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
    const formData = new URLSearchParams();
    formData.append('action', 'save');
    Object.keys(offer).forEach(key => {
      formData.append(key, (offer as any)[key]);
    });
    
    await fetch(url, { 
      method: 'POST', 
      mode: 'no-cors', 
      body: formData 
    });
    return true;
  } catch {
    return false;
  }
};

export const approveOffer = async (id: string) => {
  const offers = getOffers().map(o => o.id === id ? { ...o, status: 'APPROVED' as OfferStatus } : o);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  const url = getSheetUrl();
  if (url) {
    const params = new URLSearchParams();
    params.append('action', 'updateStatus');
    params.append('id', id);
    params.append('status', 'APPROVED');
    await fetch(url, { method: 'POST', mode: 'no-cors', body: params });
  }
};

export const deleteOffer = (id: string) => {
  const offers = getOffers().filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  const url = getSheetUrl();
  if (url) {
    const params = new URLSearchParams();
    params.append('action', 'delete');
    params.append('id', id);
    fetch(url, { method: 'POST', mode: 'no-cors', body: params });
  }
};

export const testConnection = async () => {
  const url = getSheetUrl();
  if (!url) return { success: false, message: "URL no configurada" };
  try {
    const res = await fetch(`${url}?action=read`);
    const json = await res.json();
    return { success: json.success, message: json.success ? "Conexión exitosa" : "Error en el script" };
  } catch (e) {
    return { success: false, message: "Error de red o CORS" };
  }
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
