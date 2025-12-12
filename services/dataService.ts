import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

// CAMBIO: Actualizamos a v2 para limpiar el caché de los usuarios que tenían la data demo
const STORAGE_KEY = 'cryptocagua_offers_v2';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const EMAIL_KEY = 'cryptocagua_admin_email';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_session';
const PROFILE_KEY = 'cryptocagua_user_profile'; // New key for user data
const EXPIRATION_HOURS = 72; // Las ofertas desaparecen en 3 días

// --- CONFIGURACIÓN GLOBAL (PARA PRODUCCIÓN) ---
const GLOBAL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzG0JpURjoflk8HIcuHdFxc4jYxCL96rJ9GQxdgibWxqfI_Tt3Da9HlQ_c3zsx1Ifg2/exec'; 

// PIN DE RESCATE: Úsalo si olvidas el de la hoja de cálculo
const RESCUE_PIN = '1234';

// CAMBIO: Data inicial vacía.
const INITIAL_DATA: Offer[] = [];

// --- Config Getters ---

export const getSheetUrl = () => {
  const local = localStorage.getItem(CONFIG_KEY);
  if (local) return local;
  return GLOBAL_SCRIPT_URL;
};

export const getAdminEmail = () => {
  return localStorage.getItem(EMAIL_KEY) || '';
};

// --- Data Methods ---

export const getOffers = (): Offer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  let offers: Offer[] = stored ? JSON.parse(stored) : INITIAL_DATA;
  
  // Data cleanup & Migration
  offers = offers.map(o => ({
    ...o,
    status: o.status || 'APPROVED',
    reputation: o.reputation || 0,
    verified: o.verified || false,
    nickname: o.nickname || 'Anónimo'
  }));
  
  // Filter expired offers
  const now = new Date();
  offers = offers.filter(offer => {
    const created = new Date(offer.createdAt);
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours < EXPIRATION_HOURS;
  });

  return offers;
};

// --- Fetch from Google Sheets (Read) ---
export const fetchOffers = async (): Promise<Offer[]> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return getOffers(); 

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'read' })
    });

    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) {
    console.error("Error fetching remote offers:", e);
    return getOffers(); 
  }
};

export const deleteOffer = (id: string) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const offers: Offer[] = JSON.parse(stored);
  const updatedOffers = offers.filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
};

export const approveOffer = async (id: string) => {
  // 1. Update Local
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const offers: Offer[] = JSON.parse(stored);
  const updatedOffers = offers.map(o => 
    o.id === id ? { ...o, status: 'APPROVED' as OfferStatus } : o
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
  
  // 2. Update Remote
  const scriptUrl = getSheetUrl();
  if (scriptUrl) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', id: id, status: 'APPROVED' })
      });
    } catch(e) { console.error(e); }
  }
};

// --- User Profile Persistence ---
export const saveUserProfile = (nickname: string, contactInfo: string) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname, contactInfo }));
};

export const getUserProfile = () => {
  const stored = localStorage.getItem(PROFILE_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- Config Setters ---
export const saveSheetUrl = (url: string) => {
  localStorage.setItem(CONFIG_KEY, url);
};

export const saveAdminEmail = (email: string) => {
  localStorage.setItem(EMAIL_KEY, email);
};

// --- Admin Session ---
export const setAdminSession = (isValid: boolean) => {
  if (isValid) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
};

export const isAdmin = (): boolean => {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
};

// --- PIN Verification Logic ---
export const verifyServerPin = async (pin: string): Promise<boolean> => {
  // 1. BYPASS: PIN de Rescate
  if (pin === RESCUE_PIN) {
    return true;
  }

  // 2. Variable de Entorno Vercel (Acceso Estático Directo)
  // Al acceder directamente a process.env.ADMIN_PIN, el bundler puede inyectar el valor.
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.ADMIN_PIN) {
        // @ts-ignore
        if (pin === process.env.ADMIN_PIN) return true;
    }
  } catch (e) {}

  // 3. Google Sheets (Legacy / Backup)
  const scriptUrl = getSheetUrl();
  
  if (!scriptUrl) {
    return pin === '2024';
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'auth', pin: pin })
    });
    
    const result = await response.json();
    return result.success === true;
  } catch (e) {
    console.error('Error verificando PIN', e);
    return false;
  }
};

// Helper for UUID with fallback
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

export const addOffer = (offer: Omit<Offer, 'id' | 'createdAt' | 'status' | 'reputation' | 'verified'>): Offer => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const currentOffers: Offer[] = stored ? JSON.parse(stored) : INITIAL_DATA;
  
  const newOffer: Offer = {
    ...offer,
    id: generateId(),
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    reputation: 0, 
    verified: false
  };
  
  const updatedOffers = [newOffer, ...currentOffers];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
  return newOffer;
};

export const syncWithGoogleSheets = async (offer: Offer): Promise<boolean> => {
  const scriptUrl = getSheetUrl();
  
  if (!scriptUrl) {
    console.log('No Sheet URL configured. Saving locally only.');
    return true; 
  }

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'save', ...offer })
    });
    
    return true;
  } catch (e) {
    console.error('Error syncing with Google Sheets', e);
    return false;
  }
};