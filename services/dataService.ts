import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

const STORAGE_KEY = 'cryptocagua_offers_v6';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const EMAIL_KEY = 'cryptocagua_admin_email';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_session';
const PROFILE_KEY = 'cryptocagua_user_profile'; 
const EXPIRATION_HOURS = 72; 

// --- CONFIGURACIÓN ---
const GLOBAL_SCRIPT_URL = ''; 

// --- HELPERS ---
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  } catch (e) {}
  return '';
};

const RESCUE_PIN = getEnv('VITE_ADMIN_PIN') || getEnv('REACT_APP_ADMIN_PIN') || getEnv('NEXT_PUBLIC_ADMIN_PIN') || getEnv('ADMIN_PIN'); 
export const isPinConfigured = () => !!RESCUE_PIN;
const INITIAL_DATA: Offer[] = [];

// --- GETTERS & SETTERS ---
export const getSheetUrl = () => localStorage.getItem(CONFIG_KEY) || GLOBAL_SCRIPT_URL;
export const saveSheetUrl = (url: string) => localStorage.setItem(CONFIG_KEY, url);
export const getAdminEmail = () => localStorage.getItem(EMAIL_KEY) || '';
export const saveAdminEmail = (email: string) => localStorage.setItem(EMAIL_KEY, email);

// --- VALIDATOR ---
export const validateSheetUrl = (url: string): { valid: boolean, error?: string } => {
    if (!url) return { valid: false, error: "URL vacía" };
    if (!url.includes("script.google.com")) return { valid: false, error: "No es un dominio de Google" };
    if (!url.endsWith("/exec")) return { valid: true, error: "⚠️ Debe terminar en /exec, no en /edit" };
    return { valid: true };
}

// --- DATA METHODS (LOCAL) ---
export const getOffers = (): Offer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let offers: Offer[] = stored ? JSON.parse(stored) : INITIAL_DATA;
  // Sanitize data to prevent undefined string crashes
  return offers.map(o => ({
      ...o,
      id: o.id || '',
      title: o.title || '',
      asset: o.asset || '',
      price: o.price || '',
      location: o.location || '',
      description: o.description || '',
      contactInfo: o.contactInfo || '',
      nickname: o.nickname || '',
      reputation: Number(o.reputation) || 0,
      status: o.status || 'PENDING'
  }));
};

// --- CORE SYNC FUNCTION ---
const sendToSheet = async (payload: any): Promise<{success: boolean, errorType?: string, errorMessage?: string}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false, errorType: 'NO_URL' };

  try {
    const formData = new URLSearchParams();
    Object.keys(payload).forEach(key => {
        const value = payload[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData
    });

    if (!response.ok) {
        return { success: false, errorType: `HTTP_${response.status}` };
    }

    const text = await response.text();
    if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
        return { success: false, errorType: 'HTML_RESPONSE' };
    }

    try {
        const json = JSON.parse(text);
        if (json.error) return { success: false, errorType: 'SCRIPT_ERROR', errorMessage: json.error };
    } catch(e) {}
    
    return { success: true };
  } catch (e: any) {
    return { success: false, errorType: 'NETWORK_ERROR', errorMessage: e.message };
  }
};

// --- PUBLIC METHODS ---

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

    if (!response.ok) throw new Error("Error HTTP " + response.status);

    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      const sanitized = data.data.map((o: any) => ({
          ...o,
          id: String(o.id || ''),
          title: String(o.title || ''),
          asset: String(o.asset || ''),
          price: String(o.price || ''),
          location: String(o.location || ''),
          description: String(o.description || ''),
          contactInfo: String(o.contactInfo || ''),
          nickname: String(o.nickname || ''),
          reputation: Number(o.reputation) || 0,
          status: String(o.status || 'PENDING')
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      return sanitized;
    }
    return getOffers();
  } catch (e) {
    return getOffers(); 
  }
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
  const payload = { action: 'save', ...offer };
  const result = await sendToSheet(payload);
  return result.success;
};

export const testConnection = async (): Promise<{success: boolean, message: string}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false, message: "Falta URL" };
  const testId = 'TEST-' + Math.floor(Math.random() * 10000);
  const payload = {
    action: 'save', 
    id: testId,
    type: 'TEST',
    title: 'Verificación Escritura v13',
    description: 'Confirmando soporte de reputación.',
    category: 'DIGITAL',
    asset: 'System Check',
    price: '0',
    location: 'System',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    nickname: 'Admin'
  };
  const sentResult = await sendToSheet(payload);
  if (!sentResult.success) return { success: false, message: "Error en el envío. Revisa permisos." };
  await new Promise(r => setTimeout(r, 2500));
  try {
      const remoteData = await fetchOffers();
      const found = remoteData.find(o => o.id === testId);
      if (found) return { success: true, message: `¡CONEXIÓN EXITOSA! ✅ El ID ${testId} se guardó correctamente. La columna de Reputación está activa.` };
      return { success: false, message: "El servidor respondió OK, pero el dato no apareció. Re-implementa el script." };
  } catch (e) {
      return { success: false, message: "Error leyendo los datos." };
  }
};

export const setAdminSession = (isValid: boolean) => {
  if (isValid) sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const isAdmin = () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

export const verifyServerPin = async (pin: string): Promise<boolean> => {
  if (RESCUE_PIN && pin === RESCUE_PIN) return true;
  return false;
};

export const saveUserProfile = (nickname: string, contactInfo: string) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname, contactInfo }));
};
export const getUserProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : null;
};
export const processMagicLink = (): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const setupCode = params.get('setup');
  if (setupCode) {
    try {
      const decodedUrl = atob(setupCode);
      if (decodedUrl.startsWith('http')) {
        saveSheetUrl(decodedUrl);
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: newUrl}, '', newUrl);
        return true; 
      }
    } catch (e) {}
  }
  return false;
};
export const getBrowserTestLink = (url: string) => {
    if (!url) return "#";
    const testId = 'BROWSER-' + Math.floor(Math.random() * 1000);
    const params = new URLSearchParams({
        action: 'save',
        id: testId,
        title: 'Prueba Navegador',
        price: '100',
        asset: 'Test',
        type: 'TEST',
        status: 'PENDING',
        nickname: 'Admin'
    });
    return `${url}?${params.toString()}`;
};