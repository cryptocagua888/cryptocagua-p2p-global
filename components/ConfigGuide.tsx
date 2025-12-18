import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, setAdminSession, isAdmin, verifyServerPin, isPinConfigured, testConnection, validateSheetUrl, getBrowserTestLink } from '../services/dataService';
import { isAiConfigured } from '../services/geminiService';
import { ClipboardDocumentIcon, CheckIcon, LockClosedIcon, EnvelopeIcon, ArrowRightOnRectangleIcon, ServerIcon, TableCellsIcon, KeyIcon, ExclamationTriangleIcon, ShareIcon, SparklesIcon, SignalIcon, SignalSlashIcon, BoltIcon, RocketLaunchIcon, GlobeAltIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
  
  useEffect(() => {
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    if (isAdmin()) setIsAuthenticated(true);
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
      alert('PIN Incorrecto.');
      setPin('');
    }
    setLoading(false);
  };

  const appScriptCode = `// --- CÓDIGO v13 (REPUTACIÓN ACTIVA) ---

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Ofertas") || ss.insertSheet("Ofertas");
  sheet.clear();
  sheet.appendRow(["ID", "FECHA", "TIPO", "CATEGORIA", "TITULO", "ACTIVO", "PRECIO", "UBICACION", "DESCRIPCION", "CONTACTO", "ESTADO", "NICKNAME", "REPUTACION"]);
  Logger.log("Configurado con soporte para Reputación (Columna M)");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Ofertas");
    var data = e.parameter;
    if (!data && e.postData) data = JSON.parse(e.postData.contents);

    if (data.action === 'save') {
      sheet.appendRow([
        data.id, data.createdAt || new Date().toISOString(), data.type, data.category, data.title, 
        data.asset, data.price, data.location, data.description, data.contactInfo, 
        data.status || 'PENDING', data.nickname, "0"
      ]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'read') {
      var rows = sheet.getDataRange().getValues();
      var results = [];
      for (var i = 1; i < rows.length; i++) {
        results.push({
          id: rows[i][0], createdAt: rows[i][1], type: rows[i][2], category: rows[i][3], title: rows[i][4],
          asset: rows[i][5], price: rows[i][6], location: rows[i][7], description: rows[i][8], 
          contactInfo: rows[i][9], status: rows[i][10], nickname: rows[i][11], reputation: rows[i][12]
        });
      }
      return ContentService.createTextOutput(JSON.stringify({success: true, data: results})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'updateStatus') {
      var rows = sheet.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 11).setValue(data.status);
          return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }

    if (data.action === 'delete') {
      var rows = sheet.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}`;

  const headers = [
    "A: ID", "B: FECHA", "C: TIPO", "D: CATEGORIA", "E: TITULO", "F: ACTIVO", 
    "G: PRECIO", "H: UBICACION", "I: DESCRIPCION", "J: CONTACTO", "K: ESTADO", 
    "L: NICKNAME", "M: REPUTACION (1-5)"
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl max-w-sm w-full text-center">
          <LockClosedIcon className="h-12 w-12 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-6">Acceso Admin</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN Maestro" className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white text-center" />
            <button type="submit" disabled={loading} className="w-full bg-primary-600 py-3 rounded-xl text-white font-bold">{loading ? '...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32">
      <div className="glass-panel rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-white mb-8">Configuración v13</h2>
        
        <div className="space-y-8">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">URL del Script</h3>
            <div className="flex gap-3">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 bg-slate-950 p-3 rounded-lg text-white border border-slate-700" />
              <button onClick={() => { saveSheetUrl(url); setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="bg-primary-600 px-6 rounded-lg font-bold">{saved ? 'OK' : 'Guardar'}</button>
            </div>
            <button onClick={async () => { setTesting(true); const r = await testConnection(); setTestResult(r); setTesting(false); }} className="mt-4 text-xs font-bold text-yellow-500 bg-yellow-500/10 px-4 py-2 rounded-lg border border-yellow-500/20">{testing ? 'Probando...' : 'Probar Conexión v13'}</button>
            {testResult && <p className={`mt-2 text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</p>}
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
             <h3 className="text-lg font-semibold text-primary-400 mb-4">Estructura de la Hoja (Actualizada)</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {headers.map(h => <div key={h} className="bg-slate-900 p-2 rounded text-[10px] text-gray-400 font-mono">{h}</div>)}
             </div>
             <p className="text-[10px] text-yellow-500 mt-4">⚠️ IMPORTANTE: La nueva columna "M" es para que tú pongas manualmente la reputación de los usuarios.</p>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-white/5">
            <h3 className="text-lg font-semibold text-primary-400 mb-4">Nuevo Código Script (v13)</h3>
            <div className="relative bg-black p-4 rounded-lg text-[10px] font-mono text-green-400 overflow-x-auto">
               <button onClick={() => { navigator.clipboard.writeText(appScriptCode); alert('Copiado'); }} className="absolute top-2 right-2 bg-slate-700 p-1 rounded"><ClipboardDocumentIcon className="h-4 w-4"/></button>
               <pre>{appScriptCode}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}