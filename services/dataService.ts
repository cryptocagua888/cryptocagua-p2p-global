
import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

const STORAGE_KEY = 'cryptocagua_offers_v6';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const EMAIL_KEY = 'cryptocagua_admin_email';
const PHONE_KEY = 'cryptocagua_admin_phone';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_session_persistent'; // Nombre cambiado para evitar conflictos
const PROFILE_KEY = 'cryptocagua_user_profile'; 

const GLOBAL_SCRIPT_URL = ''; 

export const getSheetUrl = () => localStorage.getItem(CONFIG_KEY) || GLOBAL_SCRIPT_URL;
export const saveSheetUrl = (url: string) => localStorage.setItem(CONFIG_KEY, url);
export const getAdminEmail = () => localStorage.getItem(EMAIL_KEY) || '';
export const saveAdminEmail = (email: string) => localStorage.setItem(EMAIL_KEY, email);
export const getAdminPhone = () => localStorage.getItem(PHONE_KEY) || '';
export const saveAdminPhone = (phone: string) => localStorage.setItem(PHONE_KEY, phone.replace(/\+/g, '').replace(/\s/g, ''));

export const validateSheetUrl = (url: string): { valid: boolean, error?: string } => {
    if (!url) return { valid: false, error: "URL vacía" };
    if (!url.includes("script.google.com")) return { valid: false, error: "No es un dominio de Google" };
    return { valid: true };
}

export const getOffers = (): Offer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const sendToSheet = async (payload: any): Promise<{success: boolean}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false };
  try {
    const formData = new URLSearchParams();
    Object.keys(payload).forEach(key => {
        formData.append(key, typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : String(payload[key]));
    });
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });
    return { success: response.ok };
  } catch (e) {
    return { success: false };
  }
};

export const fetchOffers = async (): Promise<Offer[]> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return getOffers(); 
  try {
    const formData = new URLSearchParams();
    formData.append('action', 'read');
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData
    });
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) { return getOffers(); }
};

export const deleteOffer = (id: string) => {
  const offers = getOffers().filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  sendToSheet({ action: 'delete', id }); 
};

export const approveOffer = async (id: string) => {
  const offers = getOffers().map(o => o.id === id ? { ...o, status: 'APPROVED' as OfferStatus } : o);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  await sendToSheet({ action: 'updateStatus', id, status: 'APPROVED' });
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
  const offers = [newOffer, ...getOffers()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  return newOffer;
};

export const syncWithGoogleSheets = async (offer: Offer): Promise<boolean> => {
  return (await sendToSheet({ action: 'save', ...offer })).success;
};

export const testConnection = async (): Promise<{success: boolean, message: string}> => {
  const result = await sendToSheet({ action: 'save', id: 'TEST', type: 'TEST', title: 'Test' });
  return result.success ? { success: true, message: "Conexión exitosa" } : { success: false, message: "Error de conexión" };
};

export const setAdminSession = (isValid: boolean) => {
  if (isValid) localStorage.setItem(ADMIN_SESSION_KEY, 'true');
  else localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const isAdmin = () => localStorage.getItem(ADMIN_SESSION_KEY) === 'true';

export const verifyServerPin = async (pin: string): Promise<boolean> => {
  const RESCUE_PIN = "1234"; // Pin por defecto si no hay env
  return pin === RESCUE_PIN;
};

export const saveUserProfile = (nickname: string, contactInfo: string) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname, contactInfo }));
};
export const getUserProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : null;
};
export const processMagicLink = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  const setupCode = params.get('setup');
  if (setupCode) {
    try {
      const decodedUrl = atob(setupCode);
      if (decodedUrl.startsWith('http')) {
        saveSheetUrl(decodedUrl);
        return true; 
      }
    } catch (e) {}
  }
  return false;
};
