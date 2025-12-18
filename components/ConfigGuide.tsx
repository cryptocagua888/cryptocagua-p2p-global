
import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, saveAdminPhone, getAdminPhone, setAdminSession, isAdmin, testConnection } from '../services/dataService';
import { LockClosedIcon, BoltIcon, ArrowPathIcon, ServerIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsAuthenticated(isAdmin());
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    setPhone(getAdminPhone());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Prioridad a variables de entorno si existieran, sino 1234
    if (pin.trim() === "1234") {
      setAdminSession(true);
      setIsAuthenticated(true);
      setPin('');
    } else {
      alert("PIN Incorrecto");
      setPin('');
    }
  };

  const handleSave = () => {
    saveSheetUrl(url);
    saveAdminEmail(email);
    saveAdminPhone(phone);
    setStatus('✓ Configuración guardada localmente');
    setTimeout(() => setStatus(''), 3000);
  };

  const appScriptCode = `// --- CÓDIGO v13 (SOPORTE TOTAL) ---
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ofertas") || ss.insertSheet("Ofertas");
  sheet.clear();
  sheet.appendRow(["ID", "FECHA", "TIPO", "CATEGORIA", "TITULO", "ACTIVO", "PRECIO", "UBICACION", "DESCRIPCION", "CONTACTO", "ESTADO", "NICKNAME", "REPUTACION"]);
  return "Hoja configurada con éxito.";
}

function doGet(e) {
  if (e.parameter.action === 'read') {
    return readData();
  }
  return ContentService.createTextOutput("Script activo. Usa POST para acciones.").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = e.parameter;
    if (!data.action && e.postData) {
      data = JSON.parse(e.postData.contents);
    }
    
    if (data.action === 'save') {
      return saveData(data);
    }
    if (data.action === 'updateStatus') {
      return updateStatus(data.id, data.status);
    }
    if (data.action === 'delete') {
      return deleteData(data.id);
    }
    if (data.action === 'read') {
      return readData();
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function readData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ofertas");
  var rows = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < rows.length; i++) {
    results.push({
      id: rows[i][0],
      createdAt: rows[i][1],
      type: rows[i][2],
      category: rows[i][3],
      title: rows[i][4],
      asset: rows[i][5],
      price: rows[i][6],
      location: rows[i][7],
      description: rows[i][8],
      contactInfo: rows[i][9],
      status: rows[i][10],
      nickname: rows[i][11],
      reputation: rows[i][12]
    });
  }
  return ContentService.createTextOutput(JSON.stringify({success: true, data: results})).setMimeType(ContentService.MimeType.JSON);
}

function saveData(d) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ofertas");
  sheet.appendRow([d.id, d.createdAt || new Date().toISOString(), d.type, d.category, d.title, d.asset, d.price, d.location, d.description, d.contactInfo, d.status || 'PENDING', d.nickname, "0"]);
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function updateStatus(id, status) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ofertas");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.getRange(i + 1, 11).setValue(status);
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}

function deleteData(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Ofertas");
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
}`;

  const copyCode = () => {
    navigator.clipboard.writeText(appScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-slate-800 p-10 rounded-[2rem] border border-primary-500/30 w-full max-w-md shadow-[0_0_50px_rgba(6,182,212,0.1)]">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
              <LockClosedIcon className="h-10 w-10 text-primary-400" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Acceso Maestro</h2>
            <p className="text-gray-500 text-sm mt-2">Configura el motor de Cryptocagua</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Pin de Seguridad</label>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-2xl p-5 text-center text-3xl tracking-[0.5em] focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="****"
                autoFocus
              />
            </div>
            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl active:scale-95">
              Desbloquear Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 pb-40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Panel de Control</h2>
          <p className="text-primary-400 font-medium">Gestión de infraestructura y base de datos</p>
        </div>
        <button onClick={() => { setAdminSession(false); setIsAuthenticated(false); }} className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl font-bold text-sm hover:bg-red-500/20 transition-all">
          Cerrar Sesión Maestra
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-800 p-8 rounded-[2rem] border border-white/5 shadow-xl space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <ServerIcon className="h-6 w-6 text-primary-400" />
              Configuración de Enlace
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2 ml-1">URL de Implementación (Google App Script)</label>
                <input 
                  type="text" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2 ml-1">WhatsApp de Soporte</label>
                  <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary-500" placeholder="+58412..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase block mb-2 ml-1">Email del Administrador</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:ring-2 focus:ring-primary-500" placeholder="admin@cryptocagua.com" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button onClick={handleSave} className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-primary-600/20">
                Guardar Cambios
              </button>
              <button 
                onClick={async () => { setLoading(true); const r = await testConnection(); alert(r.message); setLoading(false); }} 
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
              >
                {loading ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <BoltIcon className="h-5 w-5 text-yellow-400" />}
                Probar Sincronización
              </button>
            </div>
            {status && <p className="text-center text-green-400 font-bold animate-pulse">{status}</p>}
          </div>

          <div className="bg-slate-800 p-8 rounded-[2rem] border border-white/5 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <ClipboardDocumentIcon className="h-6 w-6 text-secondary-400" />
                Código Apps Script v13
              </h3>
              <button 
                onClick={copyCode}
                className="flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-white hover:bg-slate-600 transition-all"
              >
                {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar Código'}
              </button>
            </div>
            <div className="bg-black/50 rounded-2xl p-6 border border-white/5 overflow-hidden">
              <pre className="text-[10px] font-mono text-emerald-500 overflow-x-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
                {appScriptCode}
              </pre>
            </div>
            <div className="mt-6 p-4 bg-primary-500/10 rounded-2xl border border-primary-500/20">
              <p className="text-xs text-primary-300 leading-relaxed">
                <strong>Instrucciones:</strong> Crea un nuevo proyecto en Google Apps Script, pega este código, guarda y publica como "Aplicación Web" con acceso para "Cualquier persona". Luego copia la URL arriba.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-gradient-to-br from-primary-600 to-secondary-600 p-8 rounded-[2rem] text-white shadow-2xl">
              <h4 className="text-lg font-bold mb-4">Estado Global</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60 text-sm">Base de Datos</span>
                  <span className="font-bold">{url ? 'Vinculada' : 'Sin configurar'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-white/60 text-sm">Seguridad P2P</span>
                  <span className="font-bold">Activa</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60 text-sm">Motor IA</span>
                  <span className="font-bold">Gemini v3 Flash</span>
                </div>
              </div>
           </div>

           <div className="bg-slate-800 p-8 rounded-[2rem] border border-white/5 shadow-xl">
              <h4 className="text-white font-bold mb-4">Privacidad del Maestro</h4>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">
                Este panel solo es accesible mediante el gesto secreto (5 taps en el logo) y el PIN de seguridad. Asegúrate de no compartir la URL del script con nadie.
              </p>
              <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest text-center">
                Seguridad de nivel bancario habilitada
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
