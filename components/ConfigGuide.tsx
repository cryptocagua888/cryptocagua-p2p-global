import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, saveAdminPhone, getAdminPhone, setAdminSession, verifyServerPin, testConnection, validateSheetUrl } from '../services/dataService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ServerIcon, ShareIcon, SparklesIcon, BoltIcon, ArrowPathIcon, PhoneIcon, XCircleIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  
  // Seguridad: Siempre empezamos como NO autenticados
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{success?: boolean, message?: string} | null>(null);
  const [testing, setTesting] = useState(false);
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    setPhone(getAdminPhone());
    
    // Al salir del componente, siempre cerramos la sesión por seguridad
    return () => {
      setAdminSession(false);
    };
  }, []);

  useEffect(() => {
    if(url.length > 10) setUrlError(validateSheetUrl(url).error || '');
    else setUrlError('');
  }, [url]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (await verifyServerPin(pin)) {
      setIsAuthenticated(true);
      setAdminSession(true);
    } else {
      alert('PIN Incorrecto. Acceso denegado.');
      setPin('');
    }
    setLoading(false);
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
        <div className="glass-panel max-w-sm w-full p-8 rounded-3xl border border-primary-500/30 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4 border border-primary-500/20">
              <LockClosedIcon className="h-8 w-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Panel Maestro</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Acceso restringido para administradores</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase tracking-widest text-center">Introduce tu PIN de seguridad</label>
              <input 
                type="password" 
                value={pin} 
                onChange={(e) => setPin(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 text-white text-center text-2xl tracking-[1em] rounded-xl p-4 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                placeholder="****"
                autoFocus
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
            >
              {loading ? 'Verificando...' : 'Desbloquear Panel'}
            </button>
          </form>
          
          <p className="text-[10px] text-gray-600 text-center mt-6">
            Si olvidaste tu PIN, contacta al desarrollador del sistema.
          </p>
        </div>
      </div>
    );
  }

  const appScriptCode = `// --- CÓDIGO v13 (REPUTACIÓN ACTIVA) ---
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
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Panel Maestro</h2>
        <button 
          onClick={() => { setAdminSession(false); setIsAuthenticated(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs hover:bg-red-500/20 transition-all"
        >
          <XCircleIcon className="h-5 w-5" /> Cerrar Panel
        </button>
      </div>
        
      <div className="space-y-8">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-primary-400 mb-3 flex items-center uppercase tracking-widest">
                <EnvelopeIcon className="h-4 w-4 mr-2" /> Email de Soporte
              </h3>
              <div className="flex gap-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ejemplo.com" className="flex-1 rounded-lg bg-slate-950 border border-slate-700 p-3 text-white" />
                <button onClick={() => { saveAdminEmail(email); setEmailSaved(true); setTimeout(() => setEmailSaved(false), 2000); }} className="bg-primary-600 px-6 rounded-lg font-bold">{emailSaved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-primary-400 mb-3 flex items-center uppercase tracking-widest">
                <PhoneIcon className="h-4 w-4 mr-2" /> WhatsApp del Admin
              </h3>
              <div className="flex gap-3">
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 584120000000" className="flex-1 rounded-lg bg-slate-950 border border-slate-700 p-3 text-white" />
                <button onClick={() => { saveAdminPhone(phone); setPhoneSaved(true); setTimeout(() => setPhoneSaved(false), 2000); }} className="bg-primary-600 px-6 rounded-lg font-bold">{phoneSaved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}</button>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-sm font-bold text-primary-400 mb-3 uppercase tracking-widest">Paso 1: Conexión (Google Script URL)</h3>
            <div className="flex gap-3">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className={`flex-1 bg-slate-950 p-3 rounded-lg text-white border ${urlError ? 'border-red-500' : 'border-slate-700'}`} />
              <button onClick={() => { saveSheetUrl(url); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="bg-primary-600 px-6 rounded-lg font-bold">{saved ? <CheckIcon className="h-5 w-5" /> : 'Guardar'}</button>
            </div>
            <button onClick={async () => { setTesting(true); const r = await testConnection(); setTestResult(r); setTesting(false); }} className="mt-4 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20">{testing ? <ArrowPathIcon className="h-4 w-4 animate-spin mr-2 inline" /> : <BoltIcon className="h-4 w-4 mr-2 inline" />}Probar Conexión</button>
            {testResult && <p className={`mt-2 text-xs p-2 rounded bg-slate-900 border border-white/5 ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</p>}
          </div>

          <div className="bg-gradient-to-r from-purple-900/20 to-primary-900/20 p-6 rounded-xl border border-primary-500/20">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center"><SparklesIcon className="h-5 w-5 mr-2 text-yellow-400" /> Link Mágico</h3>
            <div className="flex gap-3">
               <input type="text" readOnly value={`${window.location.origin}/?setup=${btoa(url)}`} className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 text-gray-500 text-xs font-mono truncate" />
               <button onClick={copyMagicLink} disabled={!url} className="bg-white text-slate-900 font-bold px-4 py-2 rounded-lg text-sm transition-colors flex items-center disabled:opacity-50"><ShareIcon className="h-4 w-4 mr-2" /> Copiar</button>
            </div>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-sm font-bold text-primary-400 mb-3 uppercase tracking-widest flex items-center"><ServerIcon className="h-5 w-5 mr-2" /> Código Google Script (v13)</h3>
            <div className="relative bg-black p-4 rounded-lg text-[10px] font-mono text-green-400 overflow-x-auto border border-white/5">
               <button onClick={() => { navigator.clipboard.writeText(appScriptCode); alert('Copiado'); }} className="absolute top-2 right-2 bg-slate-700 p-1.5 rounded-lg"><ClipboardDocumentIcon className="h-4 w-4"/></button>
               <pre>{appScriptCode}</pre>
            </div>
          </div>
      </div>
    </div>
  );
}