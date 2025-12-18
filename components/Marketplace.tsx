
import React, { useState, useEffect } from 'react';
import { getOffers, getAdminPhone, isAdmin, deleteOffer, approveOffer, fetchOffers } from '../services/dataService';
import { Offer, OfferType } from '../types';
import { analyzeOffer, isAiConfigured } from '../services/geminiService';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, SparklesIcon, XMarkIcon, TrashIcon, CheckBadgeIcon, StarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const Marketplace: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [tradeOffer, setTradeOffer] = useState<Offer | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'PENDING'>('PUBLIC');

  useEffect(() => {
    setOffers(getOffers());
    setAdminMode(isAdmin());
    loadRemoteData();
  }, []);

  const loadRemoteData = async () => {
    setLoading(true);
    const data = await fetchOffers();
    setOffers(data);
    setLoading(false);
  };

  const filteredOffers = offers.filter(offer => {
    if (adminMode) {
        if (viewMode === 'PUBLIC' && offer.status !== 'APPROVED') return false;
        if (viewMode === 'PENDING' && offer.status !== 'PENDING') return false;
    } else {
        if (offer.status !== 'APPROVED') return false;
    }
    const term = searchTerm.toLowerCase();
    return (offer.title || '').toLowerCase().includes(term) || (offer.nickname || '').toLowerCase().includes(term);
  });

  const handleAnalyze = async (offer: Offer) => {
    if (!isAiConfigured()) {
        alert("La IA no está lista o falta la API Key.");
        return;
    }
    setAnalyzing(true);
    setShowAiModal(true);
    const result = await analyzeOffer(`Oferta: ${offer.title}. Vendedor: @${offer.nickname}. Precio: ${offer.price}`);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const getWhatsAppLink = (offer: Offer) => {
    const phone = (offer.contactInfo || '').replace(/[^0-9]/g, '');
    if (!phone) return null;
    return `https://wa.me/${phone}?text=${encodeURIComponent(`Hola @${offer.nickname}, me interesa tu oferta "${offer.title}"`)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          Mercado P2P {loading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
        </h2>
        <div className="relative w-full md:max-w-xs">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-500" />
          <input type="text" className="w-full pl-10 bg-slate-900 border border-slate-700 rounded-xl py-2 text-white" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {adminMode && (
        <div className="flex gap-2 mb-6 bg-slate-800 p-1 rounded-xl w-fit border border-white/5">
          <button onClick={() => setViewMode('PUBLIC')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white' : 'text-gray-400'}`}>Público</button>
          <button onClick={() => setViewMode('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white' : 'text-gray-400'}`}>Pendientes</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.map((offer) => (
          <div key={offer.id} className="bg-slate-800 rounded-2xl border border-white/10 overflow-hidden flex flex-col relative">
            {adminMode && (
              <div className="absolute top-2 right-2 flex gap-1 z-10">
                {offer.status === 'PENDING' && <button onClick={() => approveOffer(offer.id).then(loadRemoteData)} className="bg-green-600 p-1.5 rounded-full"><CheckBadgeIcon className="h-4 w-4 text-white" /></button>}
                <button onClick={() => { if(confirm('¿Borrar?')) { deleteOffer(offer.id); loadRemoteData(); } }} className="bg-red-600 p-1.5 rounded-full"><TrashIcon className="h-4 w-4 text-white" /></button>
              </div>
            )}
            <div className="p-5 flex-1">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded border border-primary-500/20">{offer.type}</span>
                <div className="flex items-center text-yellow-500 text-xs font-bold"><StarIconSolid className="h-3 w-3 mr-1" />{offer.reputation || 0}</div>
              </div>
              <h3 className="text-white font-bold">@{offer.nickname}</h3>
              <p className="text-primary-400 text-sm font-semibold mb-2">{offer.title}</p>
              <p className="text-gray-400 text-xs line-clamp-2 mb-4">{offer.description}</p>
              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Precio</span>
                <span className="text-emerald-400 font-bold">{offer.price}</span>
              </div>
            </div>
            <div className="p-3 bg-slate-900/50 flex gap-2">
              <button onClick={() => handleAnalyze(offer)} className="flex-1 bg-slate-700 text-secondary-400 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-600"><SparklesIcon className="h-4 w-4" /> IA</button>
              <button onClick={() => setTradeOffer(offer)} className="flex-[2] bg-white text-slate-900 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-gray-100"><ChatBubbleLeftRightIcon className="h-4 w-4" /> Iniciar</button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL IA - CORREGIDO */}
      {showAiModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAiModal(false)}></div>
          <div className="relative bg-slate-800 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-secondary-400" /> Análisis IA</h3>
              <button onClick={() => setShowAiModal(false)} className="text-gray-400"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6">
              {analyzing ? (
                <div className="flex flex-col items-center py-8"><ArrowPathIcon className="h-10 w-10 text-secondary-400 animate-spin" /><p className="text-secondary-300 mt-4">Analizando oferta...</p></div>
              ) : (
                <div className="text-gray-200 text-sm leading-relaxed prose prose-invert"><ReactMarkdown>{aiAnalysis}</ReactMarkdown></div>
              )}
            </div>
            <div className="p-4 bg-slate-900/50"><button onClick={() => setShowAiModal(false)} className="w-full bg-slate-700 text-white font-bold py-2 rounded-xl">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* MODAL INICIAR - CORREGIDO (SIN PANTALLA NEGRA) */}
      {tradeOffer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setTradeOffer(null)}></div>
          <div className="relative bg-slate-800 rounded-3xl w-full max-w-sm border border-primary-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900">
              <h3 className="text-white font-bold">Sala de Negocio</h3>
              <button onClick={() => setTradeOffer(null)} className="text-gray-400"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-6 space-y-6 text-center">
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Vendedor</p>
                <p className="text-white font-bold text-lg">@{tradeOffer.nickname}</p>
              </div>
              
              <a href={getWhatsAppLink(tradeOffer) || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
                <ChatBubbleLeftRightIcon className="h-6 w-6 mr-2" /> Chatear por WhatsApp
              </a>

              <div className="pt-4 space-y-3">
                <button onClick={() => { alert('¡Completado!'); setTradeOffer(null); }} className="w-full bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  <CheckCircleIcon className="h-5 w-5" /> Marcar como Finalizado
                </button>
                <button onClick={() => setTradeOffer(null)} className="w-full text-xs text-gray-500 font-bold py-2">Cerrar Ventana</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
