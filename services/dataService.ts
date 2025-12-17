import { Offer, OfferType, AssetCategory, OfferStatus } from '../types';

const STORAGE_KEY = 'cryptocagua_offers_v5'; // V5 Clean Slate
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
  return '';
};

const RESCUE_PIN = getEnv('VITE_ADMIN_PIN') || getEnv('REACT_APP_ADMIN_PIN'); 
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
  return offers;
};

// --- CORE SYNC FUNCTION (SIMPLIFICADA) ---
const sendToSheet = async (payload: any): Promise<boolean> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return false;

  try {
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', 
      headers: {
        'Content-Type': 'text/plain', 
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (e) {
    console.error("Error envío simple:", e);
    return false;
  }
};

// --- PUBLIC METHODS ---

export const fetchOffers = async (): Promise<Offer[]> => {
  const scriptUrl = getSheetUrl();
  // Si no hay URL configurada, devolvemos local
  if (!scriptUrl) return getOffers(); 

  try {
    console.log("📥 Descargando datos de la hoja...");
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'read' })
    });

    if (!response.ok) throw new Error("Error HTTP " + response.status);

    const data = await response.json();
    
    // Si la hoja responde éxito, SOBREESCRIBIMOS lo local para asegurar consistencia
    if (data.success && Array.isArray(data.data)) {
      console.log("✅ Datos actualizados desde la hoja:", data.data.length);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) {
    console.warn("⚠️ Error leyendo hoja (Usando caché local):", e);
    return getOffers(); 
  }
};

export const deleteOffer = (id: string) => {
  // Borrar Local
  const offers = getOffers().filter(o => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  // Borrar Remoto (Blind)
  sendToSheet({ action: 'delete', id }); 
};

export const approveOffer = async (id: string) => {
  // Aprobar Local
  const offers = getOffers().map(o => o.id === id ? { ...o, status: 'APPROVED' as OfferStatus } : o);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  // Aprobar Remoto
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
  
  // 1. Guardar Local (Optimistic UI)
  const offers = [newOffer, ...getOffers()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  
  return newOffer;
};

export const syncWithGoogleSheets = async (offer: Offer): Promise<boolean> => {
  // 2. Enviar a la hoja
  const payload = { action: 'save', ...offer };
  return await sendToSheet(payload);
};

export const testConnection = async (): Promise<{success: boolean, message: string}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false, message: "Falta URL" };

  const testId = 'TEST-' + Math.floor(Math.random() * 1000);
  const payload = {
    action: 'save', 
    id: testId,
    type: 'TEST',
    title: 'Prueba Sin Auth',
    description: 'Verificando escritura directa.',
    category: 'DIGITAL',
    asset: 'Test',
    price: '0',
    location: 'System',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    nickname: 'Admin'
  };

  const sent = await sendToSheet(payload);
  
  if (sent) {
      return { 
          success: true, 
          message: `Enviado. Verifica si apareció el ID ${testId} en la hoja "Ofertas".` 
      };
  } else {
      return { success: false, message: "Error al enviar la petición." };
  }
};

// --- AUTH (SOLO VERCEL/ENV) ---
export const setAdminSession = (isValid: boolean) => {
  if (isValid) sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const isAdmin = () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

export const verifyServerPin = async (pin: string): Promise<boolean> => {
  // YA NO CONSULTAMOS LA HOJA PARA EL PIN.
  // Solo validamos contra la variable de entorno local/servidor.
  if (RESCUE_PIN && pin === RESCUE_PIN) return true;
  return false;
};

// --- USER PROFILE ---
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