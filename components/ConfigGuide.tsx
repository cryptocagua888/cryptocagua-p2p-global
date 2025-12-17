import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, setAdminSession, isAdmin, verifyServerPin, isPinConfigured, testConnection } from '../services/dataService';
import { isAiConfigured } from '../services/geminiService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ArrowRightOnRectangleIcon, GlobeAmericasIcon, ServerIcon, TableCellsIcon, KeyIcon, ExclamationTriangleIcon, ShareIcon, SparklesIcon, SignalIcon, SignalSlashIcon, BoltIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const isValid = await verifyServerPin(pin);
    
    if (isValid) {
      setIsAuthenticated(true);
      setAdminSession(true);
    } else {
      alert('PIN Incorrecto. Verifique VITE_ADMIN_PIN en Vercel.');
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

  const appScriptCode = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- LÓGICA ROBUSTA PARA LEER EL CUERPO ---
    var data;
    try {
      // 1. Intentamos parsear JSON directamente (Lo más común)
      data = JSON.parse(e.postData.contents);
    } catch(err) {
      // 2. Si falla, verificamos si llegó como parámetro
      data = e.parameter;
    }

    // Validación básica
    if (!data || (!data.action && !data.id)) {
       return ContentService.createTextOutput(JSON.stringify({ "error": "No valid data received", "raw": e.postData.contents }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- CONFIGURAR HOJA SI NO EXISTE ---
    var sheet = ss.getSheetByName("Ofertas");
    if (!sheet) {
      sheet = ss.insertSheet("Ofertas");
      sheet.appendRow([
        "ID", "FECHA", "TIPO", "CATEGORIA", 
        "TITULO", "ACTIVO", "PRECIO", "UBICACION", 
        "DESCRIPCION", "CONTACTO", "ESTADO", "NICKNAME"
      ]);
    }
    
    // --- ACCIÓN: AUTH ---
    if (data.action === 'auth') {
      var configSheet = ss.getSheetByName("Config");
      if (!configSheet) {
        configSheet = ss.insertSheet("Config");
        configSheet.getRange("A1").setValue("ADMIN PIN");
        configSheet.getRange("B1").setValue("2024");
      }
      var storedPin = configSheet.getRange("B1").getValue().toString();
      var isMatch = (data.pin && data.pin.toString() === storedPin);
      return ContentService.createTextOutput(JSON.stringify({ "success": isMatch }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- ACCIÓN: READ ---
    if (data.action === 'read') {
      var rows = sheet.getDataRange().getValues();
      var offers = [];
      // Empezamos en 1 para saltar cabeceras
      for (var i = 1; i < rows.length; i++) {
         var r = rows[i];
         if(r[0] && r[0] !== '') { 
           offers.push({
             id: r[0], createdAt: r[1], type: r[2], category: r[3],
             title: r[4], asset: r[5], price: r[6], location: r[7],
             description: r[8], contactInfo: r[9], status: r[10], nickname: r[11]
           });
         }
      }
      return ContentService.createTextOutput(JSON.stringify({ "success": true, "data": offers }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- ACCIÓN: UPDATE STATUS ---
    if (data.action === 'updateStatus') {
      var rows = sheet.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 11).setValue(data.status);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ "success": true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- ACCIÓN: SAVE (DEFAULT) ---
    // Si tiene ID y fecha, asumimos que es guardar
    if (data.id && data.createdAt) {
      sheet.appendRow([
        data.id, 
        data.createdAt, 
        data.type, 
        data.category, 
        data.title, 
        data.asset, 
        data.price, 
        data.location, 
        data.description, 
        data.contactInfo, 
        data.status, 
        data.nickname
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ "success": true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "error": "Unknown action or invalid data structure" }))
        .setMimeType(ContentService.MimeType.JSON);

  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({ "error": e.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    alert("Código actualizado copiado al portapapeles. RECUERDA: Implementar -> Nueva Implementación en Google Apps Script.");
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
             Seguridad gestionada por variables de entorno
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingrese PIN"
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
             <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
               <span className="font-bold text-gray-300">Diagnóstico del Sistema:</span>
             </div>
             
             <div className="flex items-center justify-between mb-1">
                <span>PIN Variable (VITE_ADMIN_PIN)</span>
                {hasEnvPin ? (
                  <span className="text-green-400 flex items-center"><SignalIcon className="h-3 w-3 mr-1"/> Detectado (Llave Maestra)</span>
                ) : (
                  <span className="text-red-400 flex items-center"><SignalSlashIcon className="h-3 w-3 mr-1"/> No Detectado</span>
                )}
             </div>
             
             <div className="flex items-center justify-between mb-1">
                <span>API Key IA (VITE_API_KEY)</span>
                {hasEnvAi ? (
                  <span className="text-green-400 flex items-center"><SignalIcon className="h-3 w-3 mr-1"/> Detectado</span>
                ) : (
                  <span className="text-red-400 flex items-center"><SignalSlashIcon className="h-3 w-3 mr-1"/> No Detectado</span>
                )}
             </div>

             <div className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
                <p className="mb-1 text-yellow-500 font-bold">Nota:</p>
                <p>Si VITE_ADMIN_PIN está configurado, tendrá prioridad sobre cualquier PIN en Google Sheets.</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  const isUrlConfigured = url && url.length > 10;

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
               <p className="mb-2">Actualmente tu PIN se gestiona desde Google Sheets o Vercel:</p>
               <ol className="list-decimal list-inside space-y-1 text-gray-400">
                  <li><strong>Llave Maestra (Vercel):</strong> Variable <code>VITE_ADMIN_PIN</code> {hasEnvPin ? <span className="text-green-500 font-bold">ACTIVA</span> : <span className="text-red-500">INACTIVA</span>}.</li>
                  <li><strong>PIN Hoja (Secundario):</strong> Celda <strong>B1</strong> en la hoja "Config" (si Vercel falla).</li>
               </ol>
            </div>
          </div>

          {/* Connect */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Paso 1: Conexión (URL del Script)</h3>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="flex-1 rounded-lg bg-slate-950 border border-slate-700 p-3 text-white"
              />
              <button onClick={handleSaveUrl} className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 rounded-lg">
                {saved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <div>
                    <h4 className="text-sm font-bold text-white">Prueba de Conexión</h4>
                    <p className="text-xs text-gray-400">Esto enviará una fila de prueba a tu hoja.</p>
                 </div>
                 <button 
                   onClick={handleTestConnection} 
                   disabled={testing || !isUrlConfigured}
                   className="flex items-center px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                 >
                    {testing ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <BoltIcon className="h-4 w-4 mr-2 text-yellow-400" />
                    )}
                    {testing ? 'Probando...' : 'Probar Conexión'}
                 </button>
            </div>
            
            {testResult && (
                <div className={`mt-3 p-3 rounded-lg text-xs font-mono border ${testResult.success ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    {testResult.success && <CheckIcon className="h-4 w-4 inline mr-1" />}
                    {testResult.message}
                </div>
            )}
          </div>

          {/* MAGIC LINK SECTION */}
          {isUrlConfigured && (
             <div className="bg-gradient-to-r from-violet-900/60 to-purple-900/60 p-6 rounded-xl border border-violet-500/50 shadow-lg relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <SparklesIcon className="h-24 w-24 text-violet-400" />
                 </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-violet-300">
                        <ShareIcon className="h-5 w-5" />
                        <h3 className="text-lg font-bold text-white">Compartir Acceso (Link Mágico)</h3>
                    </div>
                    <p className="text-sm text-gray-300 mb-4 max-w-lg">
                       ¡Olvídate de explicarle a los usuarios cómo configurar la app! Copia este link y envíaselo. Al abrirlo, <strong>se conectarán automáticamente a tu base de datos</strong>.
                    </p>
                    <button 
                       onClick={copyMagicLink}
                       className="flex items-center bg-white text-violet-900 font-bold px-5 py-3 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
                    >
                       <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                       Copiar Link Mágico
                    </button>
                 </div>
             </div>
          )}

          <div className="border-t border-white/10 my-6"></div>
          
          <h3 className="text-xl font-bold text-white mb-4">Guía Técnica</h3>

          {/* New Step 1: Sheet Structure */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
             <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
                <TableCellsIcon className="h-5 w-5 mr-2" />
                Estructura de la Hoja (Base de Datos)
            </h3>
            
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-200 font-bold mb-3">
                    El sistema requiere exactamente 2 hojas con estos nombres (sin comillas):
                </p>
                <div className="flex gap-2 items-end">
                    <div className="bg-white text-green-900 px-4 py-1.5 rounded-t-lg font-bold text-xs border-t-4 border-green-600 shadow-lg translate-y-[1px] relative z-10">
                        Ofertas
                    </div>
                    <div className="bg-slate-700 text-gray-400 px-4 py-1.5 rounded-t-lg font-medium text-xs hover:bg-slate-600 border-t-4 border-slate-600">
                        Config
                    </div>
                    <div className="bg-slate-600/30 flex-1 h-[1px] mb-[1px]"></div>
                </div>
                <div className="bg-white p-3 rounded-b-lg rounded-tr-lg border-t border-green-600 shadow-sm relative z-0">
                   <div className="flex gap-1 overflow-x-auto text-[10px] font-mono text-gray-500 whitespace-nowrap pb-1">
                      <span className="bg-gray-100 border px-1">A:ID</span>
                      <span className="bg-gray-100 border px-1">B:FECHA</span>
                      <span className="bg-gray-100 border px-1">C:TIPO</span>
                      <span className="bg-gray-100 border px-1">D:CATEGORIA</span>
                      <span className="bg-gray-100 border px-1">...</span>
                   </div>
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-2">
                Columnas requeridas en la hoja <strong>"Ofertas"</strong>:
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
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Código Backend (v4 - JSON)</h3>
            <div className="relative bg-black/50 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto border border-gray-700">
               <button onClick={copyCode} className="absolute top-2 right-2 text-gray-400 hover:text-white bg-slate-700 p-1.5 rounded-md">
                 <ClipboardDocumentIcon className="h-4 w-4" />
               </button>
               <pre>{appScriptCode}</pre>
            </div>
            <p className="mt-2 text-xs text-red-400 font-bold">
               IMPORTANTE: Después de copiar esto en Google Scripts, debes hacer "Nueva Implementación" y seleccionar "Cualquier persona" en acceso.
            </p>
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