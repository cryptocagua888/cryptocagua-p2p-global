
import React, { useState, useEffect } from 'react';
import { getOffers, isAdmin, deleteOffer, approveOffer, fetchOffers } from '../services/dataService';
import { Offer } from '../types';
import { analyzeOffer, isAiConfigured } from '../services/geminiService';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, SparklesIcon, XMarkIcon, TrashIcon, CheckBadgeIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const Marketplace: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [activeModal, setActiveModal] = useState<'IA' | 'TRADE' | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'PENDING'>('PUBLIC');

  useEffect(() => {
    setAdminMode(isAdmin());
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchOffers();
    setOffers(data);
    setLoading(false);
  };

  const filtered = offers.filter(o => {
    if (adminMode) {
      if (viewMode === 'PUBLIC' && o.status !== 'APPROVED') return false;
      if (viewMode === 'PENDING' && o.status !== 'PENDING') return false;
    } else {
      if (o.status !== 'APPROVED') return false;
    }
    const term = searchTerm.toLowerCase();
    return o.title.toLowerCase().includes(term) || o.nickname.toLowerCase().includes(term);
  });

  const handleAiAction = async (o: Offer) => {
    if (!isAiConfigured()) { alert("IA no disponible."); return; }
    setSelectedOffer(o);
    setActiveModal('IA');
    setAnalyzing(true);
    const res = await analyzeOffer(`Oferta: ${o.title}, Vendedor: @${o.nickname}`);
    setAiAnalysis(res);
    setAnalyzing(false);
  };

  const openTrade = (o: Offer) => {
    setSelectedOffer(o);
    setActiveModal('TRADE');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">Mercado {loading && <ArrowPathIcon className="h-4 w-4 animate-spin text-gray-500" />}</h2>
        <div className="relative w-full md:max-w-xs">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-500" />
          <input type="text" className="w-full pl-10 bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-white outline-none" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {adminMode && (
        <div className="flex gap-2 mb-8 bg-slate-800 p-1 rounded-xl w-fit border border-white/5">
          <button onClick={() => setViewMode('PUBLIC')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white' : 'text-gray-400'}`}>Público</button>
          <button onClick={() => setViewMode('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white' : 'text-gray-400'}`}>Pendientes</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(o => (
          <div key={o.id} className="bg-slate-800 rounded-2xl border border-white/10 overflow-hidden flex flex-col relative">
            {adminMode && (
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {o.status === 'PENDING' && <button onClick={() => approveOffer(o.id).then(load)} className="bg-green-600 p-1.5 rounded-lg"><CheckBadgeIcon className="h-4 w-4 text-white" /></button>}
                <button onClick={() => { if(confirm('Eliminar?')) deleteOffer(o.id); load(); }} className="bg-red-600 p-1.5 rounded-lg"><TrashIcon className="h-4 w-4 text-white" /></button>
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-bold bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded border border-primary-500/20">{o.type}</span>
                <div className="flex items-center text-yellow-500 text-xs font-bold"><StarIconSolid className="h-3 w-3 mr-1" />{o.reputation || 0}</div>
              </div>
              <h3 className="text-white font-bold text-lg">@{o.nickname}</h3>
              <p className="text-primary-400 text-sm font-bold mb-2">{o.title}</p>
              <p className="text-gray-400 text-xs line-clamp-2 flex-1">{o.description}</p>
              <div className="border-t border-white/5 pt-4 mt-4 flex justify-between items-center">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Precio</span>
                <span className="text-emerald-400 font-bold">{o.price}</span>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-2">
              <button onClick={() => handleAiAction(o)} className="flex-1 bg-slate-700 text-secondary-400 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1"><SparklesIcon className="h-4 w-4" /> IA</button>
              <button onClick={() => openTrade(o)} className="flex-[2] bg-white text-slate-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1">Iniciar</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODALES SIMPLIFICADOS (SIN CAPAS COMPLEJAS) */}
      {activeModal && selectedOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90">
          <div className="relative bg-slate-800 rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900">
              <h3 className="text-white font-bold">{activeModal === 'IA' ? 'Análisis IA' : 'Sala de Negocio'}</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-400"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6">
              {activeModal === 'IA' ? (
                analyzing ? <div className="text-center py-8"><ArrowPathIcon className="h-10 w-10 animate-spin mx-auto text-secondary-400" /></div> : <div className="text-gray-200 text-sm prose-invert"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center bg-slate-900 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-gray-500 font-bold uppercase">Vendedor</p>
                    <p className="text-white font-bold text-lg">@{selectedOffer.nickname}</p>
                  </div>
                  <a href={`https://wa.me/${selectedOffer.contactInfo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
                    <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" /> WhatsApp
                  </a>
                  <button onClick={() => setActiveModal(null)} className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl">Finalizar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
