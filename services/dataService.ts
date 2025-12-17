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
const sendToSheet = async (payload: any): Promise<boolean> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return false;

  try {
    // IMPORTANTE: No usar mode: 'cors' explícito.
    // Al usar text/plain y no poner mode, el navegador hace una "Simple Request".
    // Esto evita el "Preflight" (OPTIONS) que Google Script suele bloquear.
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Intentar leer el error si es posible, o asumir error de red
        const txt = await response.text().catch(() => "Error desconocido");
        console.error("Server Error:", txt);
        return false;
    }

    // A veces Google devuelve HTML de error (como 404 de página de google), verificar si es JSON
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        if (json.error) {
            console.error("Script Error:", json.error);
            return false;
        }
    } catch(e) {
        // Si no es JSON, es un error de Google (ej: script no encontrado o permisos)
        console.error("Respuesta no válida del script:", text.substring(0, 100));
        return false;
    }
    
    return true;
  } catch (e) {
    console.error("Error de conexión:", e);
    return false;
  }
};

// --- PUBLIC METHODS ---

export const fetchOffers = async (): Promise<Offer[]> => {
  const scriptUrl = getSheetUrl();
  if (!scriptUrl) return getOffers(); 

  try {
    console.log("📥 Descargando datos...");
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'read' })
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
  return await sendToSheet(payload);
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
  const sent = await sendToSheet(payload);
  
  if (!sent) {
      return { 
          success: false, 
          message: "Falló el envío. Verifica: 1. URL termine en /exec. 2. Permisos 'Cualquier persona' (Anyone)." 
      };
  }

  // 2. Intentar Leer de vuelta (Verificación real)
  console.log("2. Esperando propagación (2s)...");
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("3. Intentando leer los datos...");
  try {
      const remoteData = await fetchOffers();
      const found = remoteData.find(o => o.id === testId);
      
      if (found) {
          // Limpiar el dato de prueba (blind delete)
          deleteOffer(testId);
          return { 
              success: true, 
              message: `¡CONEXIÓN EXITOSA! ✅ Se escribió y leyó el ID ${testId} correctamente.` 
          };
      } else {
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