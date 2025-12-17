import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, setAdminSession, isAdmin, verifyServerPin, isPinConfigured, testConnection, validateSheetUrl, getBrowserTestLink } from '../services/dataService';
import { isAiConfigured } from '../services/geminiService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ArrowRightOnRectangleIcon, GlobeAmericasIcon, ServerIcon, TableCellsIcon, KeyIcon, ExclamationTriangleIcon, ShareIcon, SparklesIcon, SignalIcon, SignalSlashIcon, BoltIcon, RocketLaunchIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, message?: string} | null>(null);
  const [testing, setTesting] = useState(false);
  
  // Status flags
  const [hasEnvPin, setHasEnvPin] = useState(false);
  const [hasEnvAi, setHasEnvAi] = useState(false);
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    setHasEnvPin(isPinConfigured());
    setHasEnvAi(isAiConfigured());
    
    if (isAdmin()) {
      setIsAuthenticated(true);
    }
  }, []);

  // Validation Effect
  useEffect(() => {
    if(url.length > 10) {
        const validation = validateSheetUrl(url);
        setUrlError(validation.error || '');
    } else {
        setUrlError('');
    }
  }, [url]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Verificación puramente local/env
    const isValid = await verifyServerPin(pin);
    
    if (isValid) {
      setIsAuthenticated(true);
      setAdminSession(true);
    } else {
      alert('PIN Incorrecto. Asegúrate de configurar VITE_ADMIN_PIN en las variables de entorno.');
      setPin('');
    }
    setLoading(false);
  };
  
  const handleLogout = () => {
    setAdminSession(false);
    setIsAuthenticated(false);
    setPin('');
  };

  const handleSaveUrl = () => {
    if(validateSheetUrl(url).valid === false) {
        if(!window.confirm("La URL parece incorrecta. ¿Guardar de todos modos?")) return;
    }
    saveSheetUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!url) {
        alert("Primero guarda una URL");
        return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  }

  const handleSaveEmail = () => {
    saveAdminEmail(email);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 2000);
  };

  // Generate Magic Link
  const getMagicLink = () => {
    if (!url) return '';
    const encoded = btoa(url);
    return `${window.location.origin}/?setup=${encoded}`;
  };

  const copyMagicLink = () => {
    const link = getMagicLink();
    if (!link) {
        alert("Primero configura y guarda la URL del Script.");
        return;
    }
    navigator.clipboard.writeText(link);
    alert("¡Link Mágico copiado! Envíalo a tus usuarios.");
  };

  const appScriptCode = `// --- CÓDIGO FINAL v8 (SIN CONFIG/SIN PIN) ---
// Este script solo maneja datos. La seguridad del admin se maneja en la App (Vercel).

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(5000); 

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = null;

    // 1. Leer JSON body
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch(err) {}
    }
    // 2. Leer Parámetros URL
    if (!data && e.parameter) {
       data = e.parameter;
    }

    if (!data) {
       return ContentService.createTextOutput(JSON.stringify({ "error": "No data" })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- SOLO USAMOS LA HOJA "OFERTAS" ---
    var sheet = ss.getSheetByName("Ofertas");
    if (!sheet) {
      sheet = ss.insertSheet("Ofertas");
      sheet.appendRow(["ID", "FECHA", "TIPO", "CATEGORIA", "TITULO", "ACTIVO", "PRECIO", "UBICACION", "DESCRIPCION", "CONTACTO", "ESTADO", "NICKNAME"]);
    }

    // --- GUARDAR (SAVE) ---
    if (data.id) {
       // Si es borrar (delete logic simple: agregar estado DELETED o implementar borrado real si prefieres)
       if (data.action === 'delete') {
          // Implementación opcional de borrado real
          var rows = sheet.getDataRange().getValues();
          for (var i = 0; i < rows.length; i++) {
            if (String(rows[i][0]) === String(data.id)) {
              sheet.deleteRow(i + 1);
              return ContentService.createTextOutput(JSON.stringify({ "success": true, "action": "deleted" })).setMimeType(ContentService.MimeType.JSON);
            }
          }
       }

       // Update Status
       if (data.action === 'updateStatus') {
          var rows = sheet.getDataRange().getValues();
          for (var i = 0; i < rows.length; i++) {
            if (String(rows[i][0]) === String(data.id)) {
              sheet.getRange(i + 1, 11).setValue(data.status);
              return ContentService.createTextOutput(JSON.stringify({ "success": true, "action": "updated" })).setMimeType(ContentService.MimeType.JSON);
            }
          }
       }
    
      // Guardar Nuevo
      var date = data.createdAt || new Date().toISOString();
      sheet.appendRow([
        data.id, date, data.type || 'TEST', data.category, data.title, 
        data.asset, data.price, data.location, data.description, 
        data.contactInfo, data.status || 'PENDING', data.nickname
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ "success": true })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // --- LEER (READ) ---
    if (data.action === 'read') {
      var rows = sheet.getDataRange().getValues();
      var offers = [];
      for (var i = 1; i < rows.length; i++) {
         if(rows[i][0]) { 
           offers.push({
             id: rows[i][0], createdAt: rows[i][1], type: rows[i][2], category: rows[i][3],
             title: rows[i][4], asset: rows[i][5], price: rows[i][6], location: rows[i][7],
             description: rows[i][8], contactInfo: rows[i][9], status: rows[i][10], nickname: rows[i][11]
           });
         }
      }
      return ContentService.createTextOutput(JSON.stringify({ "success": true, "data": offers })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ "error": "Accion desconocida" })).setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ "error": e.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    alert("¡Código v8 (Sin PIN) copiado! Actualiza tu Script en Google.");
  };

  const headers = [
    "A: ID", "B: FECHA", "C: TIPO", "D: CATEGORIA", 
    "E: TITULO", "F: ACTIVO", "G: PRECIO", "H: UBICACION", 
    "I: DESCRIPCION", "J: CONTACTO", "K: ESTADO", "L: NICKNAME"
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center">
          <div className="mx-auto bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-primary-500 relative">
            <LockClosedIcon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acceso Administrativo</h2>
          <p className="text-gray-400 text-sm mb-6 flex items-center justify-center gap-1">
             Ingresa tu PIN Maestro
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN Maestro"
              className="w-full text-center text-2xl tracking-[0.5em] bg-slate-900 border border-slate-700 rounded-xl p-3 text-white mb-4 focus:ring-2 focus:ring-primary-500 outline-none"
              autoFocus
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
          
          <div className="mt-6 text-[10px] text-gray-500 bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-left">
             <div className="flex items-center justify-between mb-1">
                <span>PIN Variable (VITE_ADMIN_PIN)</span>
                {hasEnvPin ? (
                  <span className="text-green-400 flex items-center"><SignalIcon className="h-3 w-3 mr-1"/> Configurado</span>
                ) : (
                  <span className="text-red-400 flex items-center"><SignalSlashIcon className="h-3 w-3 mr-1"/> No Configurado</span>
                )}
             </div>
             {!hasEnvPin && (
                 <p className="text-red-400 mt-2">
                     ⚠ Debes configurar la variable de entorno <code>VITE_ADMIN_PIN</code> en Vercel o en tu archivo .env local para poder entrar.
                 </p>
             )}
          </div>
        </div>
      </div>
    );
  }

  const isUrlConfigured = url && url.length > 10;
  const browserTestLink = getBrowserTestLink(url);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32">
      <div className="glass-panel rounded-2xl p-8 border border-primary-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-white">Configuración</h2>
          <button onClick={handleLogout} className="text-gray-400 hover:text-white">
            <ArrowRightOnRectangleIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-8">
          
          {/* Email Config */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Email de Soporte
            </h3>
            <div className="flex gap-3">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cryptocagua.com"
                className="flex-1 rounded-lg bg-slate-950 border border-slate-700 p-3 text-white"
              />
              <button onClick={handleSaveEmail} className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 rounded-lg">
                {emailSaved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}
              </button>
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2" />
              Gestión del PIN
            </h3>
            <div className="text-sm text-gray-300">
               <p className="mb-2">El PIN ahora se gestiona exclusivamente por Seguridad de Entorno:</p>
               <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li><strong>VITE_ADMIN_PIN:</strong> {hasEnvPin ? <span className="text-green-500 font-bold">ACTIVO</span> : <span className="text-red-500">INACTIVO (Configurar en Vercel)</span>}.</li>
               </ol>
            </div>
          </div>

          {/* Connect */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Paso 1: Conexión (URL del Script)</h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className={`flex-1 rounded-lg bg-slate-950 border p-3 text-white transition-colors ${urlError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-primary-500'}`}
                />
                <button onClick={handleSaveUrl} className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 rounded-lg">
                    {saved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}
                </button>
              </div>
              
              {urlError && (
                 <div className="text-xs text-red-400 font-bold flex items-center bg-red-900/10 p-2 rounded">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {urlError}
                 </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-4">
                 <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-sm font-bold text-white">Prueba Rápida</h4>
                        <p className="text-xs text-gray-400">Envía datos a la hoja para verificar permisos.</p>
                    </div>
                    <button 
                    onClick={handleTestConnection} 
                    disabled={testing || !isUrlConfigured}
                    className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                        {testing ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" /> : <BoltIcon className="h-4 w-4 mr-2 text-yellow-400" />}
                        {testing ? 'Probando...' : 'Prueba App'}
                    </button>
                 </div>
                 
                 {testResult && (
                    <div className={`p-3 rounded-lg text-xs font-mono border ${testResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                        {testResult.success && <CheckIcon className="h-4 w-4 inline mr-1" />}
                        {testResult.message}
                    </div>
                 )}
            </div>
          </div>

          <div className="border-t border-white/10 my-6"></div>
          
          <h3 className="text-xl font-bold text-white mb-4">Guía Técnica</h3>

          {/* New Step 1: Sheet Structure */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
             <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
                <TableCellsIcon className="h-5 w-5 mr-2" />
                Estructura de la Hoja
            </h3>
            
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-200 font-bold mb-3">
                    Solo necesitas 1 hoja llamada "Ofertas" (Case Sensitive):
                </p>
                <div className="flex gap-2 items-end">
                    <div className="bg-white text-green-900 px-4 py-1.5 rounded-t-lg font-bold text-xs border-t-4 border-green-600 shadow-lg translate-y-[1px] relative z-10">
                        Ofertas
                    </div>
                    <div className="bg-slate-600/30 flex-1 h-[1px] mb-[1px]"></div>
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-2">
                Columnas requeridas:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {headers.map((h) => (
                    <div key={h} className="bg-slate-900 border border-slate-700 p-2 rounded text-[10px] font-mono text-center text-gray-400">
                        {h}
                    </div>
                ))}
            </div>
          </div>

          {/* Script Code */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
                <ServerIcon className="h-5 w-5 mr-2" />
                Código Backend (v8 - Sin Config)
            </h3>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg mb-4 flex items-start">
               <RocketLaunchIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
               <div className="text-xs text-yellow-200">
                  <span className="font-bold">PASOS OBLIGATORIOS:</span><br/>
                  1. Copia este código y actualiza Google Apps Script.<br/>
                  2. <strong>¡GUARDA EL ARCHIVO (Ctrl + S)!</strong><br/>
                  3. Implementar &rarr; Nueva Implementación.<br/>
                  4. Ya puedes borrar la hoja "Config" si existía.
               </div>
            </div>

            <div className="relative bg-black/50 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto border border-gray-700">
               <button onClick={copyCode} className="absolute top-2 right-2 text-gray-400 hover:text-white bg-slate-700 p-1.5 rounded-md">
                 <ClipboardDocumentIcon className="h-4 w-4" />
               </button>
               <pre>{appScriptCode}</pre>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ArrowPathIcon({className}: {className?: string}) {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
}