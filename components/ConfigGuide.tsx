import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, setAdminSession, isAdmin, verifyServerPin } from '../services/dataService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ArrowRightOnRectangleIcon, GlobeAmericasIcon, ServerIcon, TableCellsIcon, KeyIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEnvPinSet, setIsEnvPinSet] = useState(false);
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    if (isAdmin()) {
      setIsAuthenticated(true);
    }

    // Static Safe check for Env Var
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env.ADMIN_PIN) {
        setIsEnvPinSet(true);
      }
    } catch (e) {
      // Ignore ReferenceError
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
      alert('PIN Incorrecto');
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
            {isEnvPinSet && (
                <div className="absolute top-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-slate-800" title="ADMIN_PIN activo"></div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acceso Administrativo</h2>
          <p className="text-gray-400 text-sm mb-6 flex items-center justify-center gap-1">
            {isEnvPinSet ? (
                <>
                   <ServerIcon className="h-4 w-4" />
                   Seguridad gestionada por Vercel
                </>
            ) : (
                'Gestionado vía Google Sheets'
            )}
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
          
          <div className="mt-6 text-[10px] text-gray-500 bg-slate-900/50 p-3 rounded-lg border border-slate-700">
             <p className="font-bold text-gray-400 mb-1">¿Olvidaste tu PIN?</p>
             <p>1. Usa el PIN de Rescate: <strong className="text-white">1234</strong></p>
             <p className="mt-1">2. O el configurado en Vercel (Variable: ADMIN_PIN)</p>
          </div>
        </div>
      </div>
    );
  }

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
            {isEnvPinSet ? (
                <div className="text-sm text-green-400 flex items-center bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                    <CheckIcon className="h-5 w-5 mr-2" />
                    El PIN está siendo gestionado seguramente por Vercel.
                </div>
            ) : (
                <p className="text-sm text-gray-300">
                Para cambiar tu PIN de acceso, ve a tu Hoja de Cálculo de Google:
                <br/>
                1. Abre la pestaña llamada <strong>Config</strong> (si no existe, se creará al usar el sistema).
                <br/>
                2. Cambia el número en la celda <strong>B1</strong>.
                </p>
            )}
          </div>

          <div className="border-t border-white/10 my-6"></div>
          
          <h3 className="text-xl font-bold text-white mb-4">Base de Datos P2P</h3>

          {/* New Step 1: Sheet Structure */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4 flex items-center">
                <TableCellsIcon className="h-5 w-5 mr-2" />
                Paso 1: Estructura de la Hoja (Headers)
            </h3>
            <p className="text-sm text-gray-300 mb-4">
                En tu Google Sheet, en la <strong>Fila 1</strong>, escribe estos títulos en orden (Columnas A - L) para mantener el orden visual:
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
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Paso 2: Actualizar Código Backend</h3>
            <p className="text-sm text-gray-300 mb-2">Este nuevo código está ajustado para respetar los encabezados de la Fila 1.</p>
            <div className="relative bg-black/50 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto border border-gray-700">
               <button onClick={copyCode} className="absolute top-2 right-2 text-gray-400 hover:text-white bg-slate-700 p-1.5 rounded-md">
                 <ClipboardDocumentIcon className="h-4 w-4" />
               </button>
               <pre>{appScriptCode}</pre>
            </div>
            <p className="text-xs text-yellow-500 mt-2">
                ⚠️ Recuerda: Después de pegar, haz clic en "Implementar" - "Nueva implementación" en Google Apps Script.
            </p>
          </div>

          {/* Connect */}
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Paso 3: Conexión Local (Admin)</h3>
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

          {/* GLOBAL CONFIG INSTRUCTION */}
          <div className="bg-gradient-to-r from-emerald-900/60 to-teal-900/60 p-6 rounded-xl border border-emerald-500/50 shadow-lg">
             <div className="flex items-start gap-4">
                <div className="bg-emerald-500 p-3 rounded-full text-white">
                   <GlobeAmericasIcon className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white mb-2">Conexión Global Activa</h3>
                   <p className="text-emerald-200 text-sm">
                      Tu aplicación ya está conectada a la base de datos global. Los usuarios verán las ofertas automáticamente.
                   </p>
                   <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <CheckIcon className="h-3 w-3 mr-1" /> URL Configurada en el Código
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}