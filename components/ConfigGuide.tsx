
import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, saveAdminPhone, getAdminPhone, setAdminSession, verifyServerPin, testConnection, validateSheetUrl, isAdmin } from '../services/dataService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ServerIcon, ShareIcon, SparklesIcon, BoltIcon, ArrowPathIcon, PhoneIcon, XCircleIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, message?: string} | null>(null);
  const [testing, setTesting] = useState(false);
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    setPhone(getAdminPhone());
    setIsAuthenticated(isAdmin());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const isValid = await verifyServerPin(pin);
    if (isValid) {
      setAdminSession(true);
      setIsAuthenticated(true);
      setPin('');
    } else {
      alert('PIN Incorrecto. Intenta con 1234');
      setPin('');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setAdminSession(false);
    setIsAuthenticated(false);
  };

  const copyMagicLink = () => {
    const encoded = btoa(url);
    const link = `${window.location.origin}/?setup=${encoded}`;
    navigator.clipboard.writeText(link);
    alert("¡Link Mágico copiado!");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="bg-slate-800 max-w-sm w-full p-8 rounded-3xl border border-primary-500/30 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4 border border-primary-500/20">
              <LockClosedIcon className="h-8 w-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Panel Maestro</h2>
            <p className="text-gray-500 text-sm mt-1">Ingresa el PIN de seguridad</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 text-white text-center text-2xl tracking-[0.5em] rounded-xl p-4 focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="****"
              autoFocus
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95"
            >
              {loading ? 'Verificando...' : 'Desbloquear'}
            </button>
          </form>
          <p className="text-[10px] text-gray-500 text-center mt-6">PIN predeterminado: 1234</p>
        </div>
      </div>
    );
  }

  const appScriptCode = `// --- CÓDIGO v13 ---
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ofertas") || ss.insertSheet("Ofertas");
  sheet.clear();
  sheet.appendRow(["ID", "FECHA", "TIPO", "CATEGORIA", "TITULO", "ACTIVO", "PRECIO", "UBICACION", "DESCRIPCION", "CONTACTO", "ESTADO", "NICKNAME", "REPUTACION"]);
}
function doPost(e) {
  var lock = LockService.getScriptLock(); lock.tryLock(5000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Ofertas");
    var data = e.parameter;
    if (!data && e.postData) data = JSON.parse(e.postData.contents);
    if (data.action === 'save') {
      sheet.appendRow([data.id, data.createdAt || new Date().toISOString(), data.type, data.category, data.title, data.asset, data.price, data.location, data.description, data.contactInfo, data.status || 'PENDING', data.nickname, "0"]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === 'read') {
      var rows = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < rows.length; i++) {
        results.push({ id: rows[i][0], createdAt: rows[i][1], type: rows[i][2], category: rows[i][3], title: rows[i][4], asset: rows[i][5], price: rows[i][6], location: rows[i][7], description: rows[i][8], contactInfo: rows[i][9], status: rows[i][10], nickname: rows[i][11], reputation: rows[i][12] });
      }
      return ContentService.createTextOutput(JSON.stringify({success: true, data: results})).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === 'updateStatus') {
      var rows = sheet.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) { if (String(rows[i][0]) === String(data.id)) { sheet.getRange(i + 1, 11).setValue(data.status); return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON); } }
    }
    if (data.action === 'delete') {
      var rows = sheet.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) { if (String(rows[i][0]) === String(data.id)) { sheet.deleteRow(i + 1); return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON); } }
    }
  } catch(e) { return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON); }
  finally { lock.releaseLock(); }
}`;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Configuración Maestro</h2>
        <button 
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs"
        >
          Bloquear Acceso
        </button>
      </div>
        
      <div className="space-y-6">
          <div className="bg-slate-800/80 p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest">Soporte y Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Email Soporte</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white" />
                <button onClick={() => { saveAdminEmail(email); setEmailSaved(true); setTimeout(() => setEmailSaved(false), 2000); }} className="mt-2 text-xs font-bold text-primary-400">{emailSaved ? '✓ Guardado' : 'Guardar Email'}</button>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">WhatsApp Admin</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-700 p-3 text-white" />
                <button onClick={() => { saveAdminPhone(phone); setPhoneSaved(true); setTimeout(() => setPhoneSaved(false), 2000); }} className="mt-2 text-xs font-bold text-primary-400">{phoneSaved ? '✓ Guardado' : 'Guardar Teléfono'}</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-4">Base de Datos (Google Sheet)</h3>
            <div className="flex gap-2">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 bg-slate-900 p-3 rounded-lg text-white border border-slate-700" />
              <button onClick={() => { saveSheetUrl(url); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="bg-primary-600 px-6 rounded-lg font-bold">{saved ? '✓' : 'OK'}</button>
            </div>
            <button onClick={async () => { setTesting(true); const r = await testConnection(); setTestResult(r); setTesting(false); }} className="mt-4 text-[10px] font-bold text-yellow-500 uppercase flex items-center gap-2">
              {testing ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : <BoltIcon className="h-3 w-3" />} Probar Conexión
            </button>
            {testResult && <p className={`mt-2 text-[10px] ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</p>}
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-white/5">
            <h3 className="text-sm font-bold text-primary-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ServerIcon className="h-4 w-4" /> Código de Servidor</h3>
            <div className="relative bg-black p-4 rounded-xl text-[10px] font-mono text-green-500 overflow-x-auto border border-white/5">
               <button onClick={() => { navigator.clipboard.writeText(appScriptCode); alert('Copiado'); }} className="absolute top-2 right-2 bg-slate-700 p-1 rounded">Copiar</button>
               <pre>{appScriptCode}</pre>
            </div>
          </div>
      </div>
    </div>
  );
}
