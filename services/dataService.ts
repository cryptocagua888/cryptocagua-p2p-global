import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

// CAMBIO: Actualizamos a v2 para limpiar el caché de los usuarios que tenían la data demo
const STORAGE_KEY = 'cryptocagua_offers_v2';
const CONFIG_KEY = 'cryptocagua_sheet_url';
const EMAIL_KEY = 'cryptocagua_admin_email';
const ADMIN_SESSION_KEY = 'cryptocagua_admin_session';
const PROFILE_KEY = 'cryptocagua_user_profile'; // New key for user data
const EXPIRATION_HOURS = 72; // Las ofertas desaparecen en 3 días

// --- CONFIGURACIÓN GLOBAL ---
const GLOBAL_SCRIPT_URL = ''; 

// Helper para leer variables de entorno en Vite/CRA/Next de forma segura
const getEnv = (key: string) => {
  // 1. Intentar Vite (import.meta.env)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Intentar process.env estándar
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}

  return '';
};

// CAMBIO: PIN DE RESCATE (SERVER SIDE)
// La variable EN VERCEL debe llamarse 'VITE_ADMIN_PIN' para que sea visible aquí.
const RESCUE_PIN = getEnv('VITE_ADMIN_PIN') || 
                   getEnv('REACT_APP_ADMIN_PIN') ||
                   getEnv('NEXT_PUBLIC_ADMIN_PIN') ||
                   getEnv('ADMIN_PIN'); 

// Helper para verificar si el PIN está cargado (para diagnóstico)
export const isPinConfigured = () => !!RESCUE_PIN && RESCUE_PIN.length > 0;

// CAMBIO: Data inicial vacía.
const INITIAL_DATA: Offer[] = [];

// --- Config Getters ---

export const getSheetUrl = () => {
  // Configuración persistente en localStorage (el link mágico se usa una vez)
  const local = localStorage.getItem(CONFIG_KEY);
  if (local) return local;
  return GLOBAL_SCRIPT_URL;
};

export const getAdminEmail = () => {
  return localStorage.getItem(EMAIL_KEY) || '';
};

// --- Magic Link Logic ---
export const processMagicLink = (): boolean => {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const setupCode = params.get('setup');

  if (setupCode) {
    try {
      // Decode Base64 to get the URL
      const decodedUrl = atob(setupCode);
      
      // Basic validation to ensure it looks like a URL
      if (decodedUrl.startsWith('http')) {
        saveSheetUrl(decodedUrl);
        
        // Clean the URL so the user doesn't see the ugly token
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({path: newUrl}, '', newUrl);
        
        return true; // Configuration applied successfully
      }
    } catch (e) {
      console.error("Invalid Magic Link", e);
    }
  }
  return false;
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
  // Si no hay URL configurada, no intentamos fetch para evitar errores de red
  if (!scriptUrl) return getOffers(); 

  try {
    // Para LEER usamos text/plain y un body stringificado simple, esto suele funcionar bien para respuestas
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'read' })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) {
    console.warn("Modo Offline activo (Error conectando a Sheets):", e);
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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'updateStatus', id, status: 'APPROVED' })
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
  // Guardamos en localStorage para persistencia total
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
  console.log("Intento de Auth con PIN:", pin);
  
  // 1. MASTER KEY CHECK (PRIORIDAD MÁXIMA)
  if (RESCUE_PIN && pin === RESCUE_PIN) {
    console.log("Autenticación exitosa por Variable de Entorno (Master Key)");
    return true;
  }

  const scriptUrl = getSheetUrl();
  
  // 2. Si no es la Master Key y no hay hoja, fallamos.
  if (!scriptUrl) {
    return false;
  }

  // 3. Intentamos validar con la Hoja via JSON
  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'auth', pin: pin })
    });
    
    if (!response.ok) throw new Error("Network response not ok");

    const result = await response.json();
    return result.success === true;

  } catch (e) {
    return false;
  }
};

// --- TEST CONNECTION ---
export const testConnection = async (): Promise<{success: boolean, message: string}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false, message: "No hay URL configurada" };

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: 'save', 
        id: 'TEST-' + Date.now(),
        type: 'TEST',
        title: 'Prueba de Conexión',
        description: 'Si ves esto, la conexión funciona.',
        category: 'DIGITAL',
        asset: 'Test',
        price: '0',
        location: 'System',
        createdAt: new Date().toISOString(),
        contactInfo: 'System',
        nickname: 'Admin',
        status: 'PENDING'
      })
    });
    
    if(!response.ok) return { success: false, message: `Error HTTP: ${response.status}` };
    
    const text = await response.text();
    // Try to parse just to verify it is valid JSON, though we don't need the content
    try { JSON.parse(text); } catch(e) { return { success: false, message: "La respuesta del script no es JSON válido." }; }

    return { success: true, message: "Conexión exitosa. Revisa si apareció una fila 'TEST' en tu hoja." };
  } catch (e: any) {
    return { success: false, message: `Error de Red: ${e.message}` };
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

  const payload = {
    action: 'save',
    ...offer
  };

  try {
    console.log("Enviando a Sheets (Intento JSON):", payload);
    
    // Método 1: Standard con redirect (preferido)
    // Usamos text/plain para evitar Preflight CORS que GAS no soporta bien
    await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload)
    });
    
    console.log("Envío exitoso (o aceptado por el servidor).");
    return true;
  } catch (e) {
    console.error('Error Sync (Intento 1):', e);
    
    // Método 2: Fallback no-cors (Ciego)
    // Si el primero falla por CORS estricto, intentamos "a ciegas"
    try {
        console.log("Reintentando con modo no-cors...");
        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (e2) {
        console.error("Fallo total al sincronizar:", e2);
        return false;
    }
  }
};