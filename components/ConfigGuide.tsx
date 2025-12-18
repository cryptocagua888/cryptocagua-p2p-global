
import React, { useState, useEffect } from 'react';
import { saveSheetUrl, getSheetUrl, saveAdminEmail, getAdminEmail, saveAdminPhone, getAdminPhone, setAdminSession, isAdmin, testConnection } from '../services/dataService';
import { LockClosedIcon, BoltIcon, ArrowPathIcon, ServerIcon } from '@heroicons/react/24/outline';

export const ConfigGuide: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setIsAuthenticated(isAdmin());
    setUrl(getSheetUrl());
    setEmail(getAdminEmail());
    setPhone(getAdminPhone());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === "1234") {
      setAdminSession(true);
      setIsAuthenticated(true);
      setPin('');
    } else {
      alert("PIN Incorrecto (Default: 1234)");
      setPin('');
    }
  };

  const handleSave = () => {
    saveSheetUrl(url);
    saveAdminEmail(email);
    saveAdminPhone(phone);
    setStatus('✓ Configuración guardada');
    setTimeout(() => setStatus(''), 3000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-3xl border border-primary-500/30 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <LockClosedIcon className="h-12 w-12 text-primary-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">Panel Maestro</h2>
            <p className="text-gray-500 text-sm">Acceso Restringido</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-4 text-center text-2xl tracking-widest focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="****"
              autoFocus
            />
            <button className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">
              Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Configuración</h2>
        <button onClick={() => { setAdminSession(false); setIsAuthenticated(false); }} className="text-red-400 text-xs font-bold uppercase border border-red-500/20 px-4 py-2 rounded-xl">Cerrar Sesión</button>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-white/5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Google Sheet URL</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">WhatsApp Admin</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email Soporte</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none" />
            </div>
          </div>
          <button onClick={handleSave} className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl">Guardar Todo</button>
          {status && <p className="text-center text-green-400 text-xs font-bold">{status}</p>}
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl border border-white/5">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><ServerIcon className="h-5 w-5" /> Estado del Servidor</h3>
          <button onClick={async () => { setLoading(true); const r = await testConnection(); alert(r.message); setLoading(false); }} className="flex items-center gap-2 text-yellow-500 text-sm font-bold">
            {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <BoltIcon className="h-4 w-4" />}
            Probar Conexión con Google Sheets
          </button>
        </div>
      </div>
    </div>
  );
};
