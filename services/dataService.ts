import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

// CAMBIO: Actualizamos a v2 para limpiar el caché de los usuarios que tenían la data demo
const STORAGE_KEY = 'cryptocagua_offers_v2';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const EMAIL_KEY = 'cryptocagua_admin_email';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_session';
const PROFILE_KEY = 'cryptocagua_user_profile'; // New key for user data
const EXPIRATION_HOURS = 72; // Las ofertas desaparecen en 3 días

// --- CONFIGURACIÓN GLOBAL (PARA PRODUCCIÓN) ---
// 1. Despliega tu script de Google Apps Script.
// 2. Copia la URL (que termina en /exec).
// 3. Pégala aquí abajo entre las comillas.
// Ejemplo: const GLOBAL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx.../exec';
const GLOBAL_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzG0JpURjoflk8HIcuHdFxc4jYxCL96rJ9GQxdgibWxqfI_Tt3Da9HlQ_c3zsx1Ifg2/exec'; 

// CAMBIO: Data inicial vacía. Ahora solo se mostrará lo que venga de Google Sheets.
const INITIAL_DATA: Offer[] = [];

// Helper para acceder a variables de entorno de forma segura
// Ahora que index.html tiene un polyfill, esto no crasheará, pero puede retornar undefined.
const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (window.process && window.process.env) {
      // @ts-ignore
      return window.process.env[key];
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// --- Config Getters ---

export const getSheetUrl = () => {
  // Prioridad 1: Configuración Local (Para el Admin/Desarrollo)
  const local = localStorage.getItem(CONFIG_KEY);
  if (local) return local;
  
  // Prioridad 2: Configuración Global (Para los usuarios en Vercel)
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
  if (!scriptUrl) return getOffers(); // Fallback to local if no URL

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'read' })
    });

    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      // Update local storage cache
      // We only want to overwrite local if we got valid data
      // Note: In a real app, we might merge, but here we replace to stay in sync
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) {
    console.error("Error fetching remote offers:", e);
    return getOffers(); // Fallback on error
  }
};

export const deleteOffer = (id: string) => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return;
  const offers: Offer[] = JSON.parse(stored);
  const updatedOffers = offers.filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOffers));
  
  // TODO: Add 'delete' action to Google Script if needed in future
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
  // Prioridad 1: Variable de Entorno (si existe)
  const envPin = getEnv('ADMIN_PIN');
  if (envPin && envPin.length > 0) {
     return pin === envPin;
  }

  // Prioridad 2: Google Sheets (Legacy / Backup)
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