import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, setAdminSession, isAdmin, verifyServerPin } from '../services/dataService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ArrowRightOnRectangleIcon, GlobeAmericasIcon, ServerIcon, TableCellsIcon, KeyIcon, ExclamationTriangleIcon, ShareIcon, SparklesIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
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
      alert('PIN Incorrecto. Verifique su ADMIN_PIN en Vercel o el PIN en la Hoja de Cálculo.');
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var sheet = ss.getSheets()[0]; // Hoja de Ofertas
  
  // --- ACCIÓN: AUTH ---
  if (data.action === 'auth') {
    var configSheet = ss.getSheetByName("Config");
    if (!configSheet) {
      configSheet = ss.insertSheet("Config");
      configSheet.getRange("A1").setValue("ADMIN PIN");
      configSheet.getRange("B1").setValue("2024");
    }
    var storedPin = configSheet.getRange("B1").getValue().toString();
    return ContentService.createTextOutput(JSON.stringify({ "success": (data.pin.toString() === storedPin) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // --- ACCIÓN: READ (LEER OFERTAS) ---
  if (data.action === 'read') {
    var rows = sheet.getDataRange().getValues();
    var offers = [];
    
    // IMPORTANTE: Empezamos en i = 1 para saltar los encabezados de la Fila 1
    for (var i = 1; i < rows.length; i++) {
       var r = rows[i];
       // Validamos que exista un ID (columna 0) para considerarlo oferta válida
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
      // Convertimos a string para comparar seguros
      if (String(rows[i][0]) === String(data.id)) {
        // Columna K es índice 10 (Status), sumamos 1 porque getRange es base-1
        sheet.getRange(i + 1, 11).setValue(data.status);
        break;
      }
    }
    return ContentService.createTextOutput("Updated").setMimeType(ContentService.MimeType.TEXT);
  }

  // --- ACCIÓN: SAVE (GUARDAR OFERTA) ---
  if (data.action === 'save') {
    sheet.appendRow([
      data.id, data.createdAt, data.type, data.category, 
      data.title, data.asset, data.price, data.location, 
      data.description, data.contactInfo, data.status, data.nickname
    ]);
    
    try {
      var email = Session.getEffectiveUser().getEmail();
      MailApp.sendEmail({ to: email, subject: "NUEVA OFERTA P2P", body: "Revisar hoja de cálculo." });
    } catch (e) {}
    
    return ContentService.createTextOutput(JSON.stringify({ "success": true })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    alert("Código actualizado copiado al portapapeles");
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
             <p className="font-bold text-gray-300 mb-1 border-b border-gray-700 pb-1">¿Qué PIN debo usar?</p>
             <ul className="space-y-1 mt-1">
               <li><span className="text-green-500 font-bold">1. Sin Conexión:</span> Usa la variable <code>ADMIN_PIN</code> configurada en Vercel.</li>
               <li><span className="text-blue-500 font-bold">2. Conectado:</span> Usa el PIN definido en la Hoja de Cálculo (Celda B1).</li>
               <li><span className="text-red-500 font-bold">3. Nota:</span> El PIN "1234" ya no está disponible por seguridad.</li>
             </ul>
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
                  <li><strong>Modo Offline:</strong> Variable de entorno <code>ADMIN_PIN</code>.</li>
                  <li><strong>Modo Online:</strong> Celda <strong>B1</strong> en la hoja "Config".</li>
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
                Estructura de la Hoja
            </h3>
            <p className="text-sm text-gray-300 mb-4">
                En tu Google Sheet, en la <strong>Fila 1</strong>, escribe estos títulos en orden (Columnas A - L):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {headers.map((h) => (
                    <div key={h} className="bg-slate-900 border border-slate-700 p-2 rounded text-xs font-mono text-center text-gray-400">
                        {h}
                    </div>
                ))}
            </div>
          </div>

          {/* Script Code */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Código Backend</h3>
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