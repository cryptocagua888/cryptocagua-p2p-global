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
  return offers;
};

// --- CORE SYNC FUNCTION ---
const sendToSheet = async (payload: any): Promise<{success: boolean, errorType?: string}> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return { success: false, errorType: 'NO_URL' };

  try {
    // CAMBIO TÉCNICO: Usar URLSearchParams (Form Data)
    // Esto es más robusto para Google Scripts que el JSON crudo
    const formData = new URLSearchParams();
    Object.keys(payload).forEach(key => {
        const value = payload[key];
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });

    // Petición Simple (Simple Request) que evita Preflight en muchos casos
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
    
    // Detección de página de Login de Google (Error de Permisos)
    if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
        console.error("HTML Response detected (Permission Error)");
        return { success: false, errorType: 'HTML_RESPONSE' };
    }

    try {
        const json = JSON.parse(text);
        if (json.error) {
            console.error("Script Error:", json.error);
            return { success: false, errorType: 'SCRIPT_ERROR' };
        }
    } catch(e) {
        // Si no es JSON ni HTML obvio, algo raro pasa, pero quizás funcionó.
        console.warn("Non-JSON response:", text.substring(0, 50));
    }
    
    return { success: true };
  } catch (e) {
    console.error("Connection Error:", e);
    return { success: false, errorType: 'NETWORK_ERROR' };
  }
};

// --- PUBLIC METHODS ---

export const fetchOffers = async (): Promise<Offer[]> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return getOffers(); 

  try {
    console.log("📥 Descargando datos...");
    // También usamos form data para lectura
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
      console.log("✅ Datos actualizados:", data.data.length);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return getOffers();
  } catch (e) {
    console.warn("⚠️ Error lectura (Usando caché):", e);
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
    title: 'Verificación de Escritura',
    description: 'Este dato debe ser leído de vuelta para confirmar.',
    category: 'DIGITAL',
    asset: 'System Check',
    price: '0',
    location: 'System',
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    nickname: 'Admin'
  };

  // 1. Intentar Escribir
  console.log("1. Enviando datos de prueba...");
  const sentResult = await sendToSheet(payload);
  
  if (!sentResult.success) {
      // Diagnóstico detallado
      if (sentResult.errorType === 'HTML_RESPONSE') {
          return { success: false, message: "❌ ERROR DE PERMISOS: El script devolvió una página de Login. Debes configurar 'Quién tiene acceso' a 'Cualquier persona' (Anyone)." };
      }
      if (sentResult.errorType === 'NETWORK_ERROR') {
          // Si falla la red, puede ser CORS, pero intentamos leer de todos modos por si acaso fue un "falso negativo"
          console.warn("Error de red en escritura, intentando leer de todas formas...");
      } else {
          return { success: false, message: `Falló el envío (${sentResult.errorType}). Revisa la URL.` };
      }
  }

  // 2. Intentar Leer de vuelta (Verificación real)
  console.log("2. Esperando propagación (2.5s)...");
  await new Promise(r => setTimeout(r, 2500));
  
  console.log("3. Intentando leer los datos...");
  try {
      const remoteData = await fetchOffers();
      const found = remoteData.find(o => o.id === testId);
      
      if (found) {
          deleteOffer(testId); // Limpiar
          return { 
              success: true, 
              message: `¡CONEXIÓN EXITOSA! ✅ Se escribió y leyó el ID ${testId} correctamente.` 
          };
      } else {
          if (!sentResult.success) {
             return { success: false, message: "No se pudo conectar. Posible error de CORS o URL incorrecta." };
          }
          return { 
              success: false, 
              message: "El servidor respondió OK, pero el dato no apareció. Asegúrate de haber hecho 'Nueva Implementación' en el Script." 
          };
      }
  } catch (e) {
      return { success: false, message: "Error leyendo de vuelta los datos." };
  }
};

// --- AUTH ---
export const setAdminSession = (isValid: boolean) => {
  if (isValid) sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  else sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const isAdmin = () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

export const verifyServerPin = async (pin: string): Promise<boolean> => {
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