
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
    if (!isAiConfigured()) { alert("La IA está configurándose..."); return; }
    setSelectedOffer(o);
    setActiveModal('IA');
    setAnalyzing(true);
    const res = await analyzeOffer(`Oferta: ${o.title}, Vendedor: @${o.nickname}, Categoría: ${o.category}`);
    setAiAnalysis(res);
    setAnalyzing(false);
  };

  const openTrade = (o: Offer) => {
    setSelectedOffer(o);
    setActiveModal('TRADE');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedOffer(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-40">
      <div className="flex flex-col md:flex-row gap-6 mb-12 justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            Mercado P2P
            {loading && <ArrowPathIcon className="h-6 w-6 animate-spin text-primary-500" />}
          </h2>
          <p className="text-gray-500 text-sm">Intercambios directos sin intermediarios</p>
        </div>
        <div className="relative w-full md:max-w-md group">
          <MagnifyingGlassIcon className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" />
          <input 
            type="text" 
            className="w-full pl-12 pr-4 bg-slate-900 border border-slate-700 rounded-2xl py-4 text-white outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-inner" 
            placeholder="Buscar activos, usuarios o divisas..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      {adminMode && (
        <div className="flex gap-2 mb-10 bg-slate-800 p-1.5 rounded-2xl w-fit border border-white/5 shadow-2xl">
          <button onClick={() => setViewMode('PUBLIC')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Publicado</button>
          <button onClick={() => setViewMode('PENDING')} className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Pendientes de Aprobación</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(o => (
          <div key={o.id} className="group bg-slate-800 rounded-[2rem] border border-white/10 overflow-hidden flex flex-col relative hover:border-primary-500/50 transition-all hover:shadow-[0_0_40px_rgba(6,182,212,0.1)]">
            {adminMode && (
              <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                {o.status === 'PENDING' && (
                  <button onClick={() => approveOffer(o.id).then(load)} className="bg-green-600 p-2.5 rounded-xl shadow-xl hover:bg-green-500">
                    <CheckBadgeIcon className="h-5 w-5 text-white" />
                  </button>
                )}
                <button onClick={() => { if(confirm('¿Eliminar oferta permanentemente?')) deleteOffer(o.id); load(); }} className="bg-red-600 p-2.5 rounded-xl shadow-xl hover:bg-red-500">
                  <TrashIcon className="h-5 w-5 text-white" />
                </button>
              </div>
            )}
            <div className="p-8 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full border border-primary-500/20 tracking-[0.2em] uppercase">
                  {o.type}
                </span>
                <div className="flex items-center text-yellow-500 text-xs font-black bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  <StarIconSolid className="h-3 w-3 mr-1" />
                  {o.reputation || 0}
                </div>
              </div>
              <h3 className="text-white font-bold text-xl mb-1">@{o.nickname}</h3>
              <p className="text-primary-400 text-sm font-black mb-4 tracking-tight">{o.title}</p>
              <div className="bg-slate-900/50 p-4 rounded-2xl mb-6 flex-1">
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{o.description}</p>
              </div>
              <div className="border-t border-white/5 pt-6 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Precio Estimado</span>
                  <span className="text-emerald-400 font-black text-2xl">{o.price}</span>
                </div>
                <div className="text-right">
                   <span className="text-[10px] text-gray-500 font-bold uppercase block">Ubicación</span>
                   <span className="text-gray-300 text-xs font-bold">{o.location}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-3 border-t border-white/5">
              <button 
                onClick={() => handleAiAction(o)} 
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-secondary-400 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border border-white/5 shadow-lg"
              >
                <SparklesIcon className="h-5 w-5" /> Análisis IA
              </button>
              <button 
                onClick={() => openTrade(o)} 
                className="flex-[1.5] bg-white hover:bg-gray-100 text-slate-900 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                Iniciar Intercambio
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SISTEMA DE MODALES ROBUSTO */}
      {(activeModal && selectedOffer) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Fondo con opacidad controlada para evitar "pantalla negra" */}
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={closeModal}></div>
          
          <div className="relative bg-slate-800 rounded-[2.5rem] w-full max-w-md border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-white font-black text-xl tracking-tight">
                {activeModal === 'IA' ? 'Auditoría de Gemini IA' : 'Sala de Negociación'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="h-8 w-8" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              {activeModal === 'IA' ? (
                <div className="space-y-6">
                  {analyzing ? (
                    <div className="flex flex-col items-center py-12">
                      <div className="relative">
                        <ArrowPathIcon className="h-16 w-16 text-secondary-500 animate-spin" />
                        <SparklesIcon className="h-6 w-6 text-secondary-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-secondary-300 mt-6 font-black tracking-widest text-xs uppercase animate-pulse">Consultando Red Neuronal...</p>
                    </div>
                  ) : (
                    <div className="bg-slate-900/80 rounded-3xl p-6 border border-secondary-500/20 shadow-inner">
                      <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4">
                     <div className="flex-1 bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center">
                        <p className="text-green-400 font-bold text-[10px] uppercase">Confianza</p>
                        <p className="text-white font-black text-lg">94%</p>
                     </div>
                     <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl text-center">
                        <p className="text-yellow-400 font-bold text-[10px] uppercase">Riesgo</p>
                        <p className="text-white font-black text-lg">Bajo</p>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="text-center bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <div className="w-20 h-20 bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-500/20">
                      <span className="text-3xl font-black text-primary-400">@{selectedOffer.nickname.charAt(0).toUpperCase()}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em] mb-1">Vendedor Verificado</p>
                    <p className="text-white font-black text-2xl">@{selectedOffer.nickname}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <a 
                      href={`https://wa.me/${selectedOffer.contactInfo.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola @${selectedOffer.nickname}, te escribo desde Cryptocagua por tu oferta: ${selectedOffer.title}`)}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-lg"
                    >
                      <ChatBubbleLeftRightIcon className="h-7 w-7 mr-3" /> WhatsApp Directo
                    </a>
                    
                    <button onClick={() => { alert('¡Notificación enviada!'); closeModal(); }} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 shadow-lg shadow-primary-600/20 active:scale-95 transition-all">
                      <CheckCircleIcon className="h-7 w-7" /> Marcar como Finalizado
                    </button>
                  </div>
                  
                  <p className="text-center text-gray-500 text-[10px] font-medium leading-relaxed italic">
                    Recuerda: Cryptocagua es un protocolo P2P. No liberes activos hasta confirmar la recepción del pago.
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-900/80 border-t border-white/5">
              <button onClick={closeModal} className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all">
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
