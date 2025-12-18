import React, { useState, useEffect } from 'react';
import { getOffers, getAdminEmail, getAdminPhone, isAdmin, deleteOffer, approveOffer, fetchOffers } from '../services/dataService';
import { Offer, AssetCategory, OfferType } from '../types';
import { analyzeOffer, isAiConfigured } from '../services/geminiService';
import { MagnifyingGlassIcon, ChatBubbleLeftRightIcon, SparklesIcon, XMarkIcon, TrashIcon, CheckBadgeIcon, ExclamationTriangleIcon, StarIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const Marketplace: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [tradeOffer, setTradeOffer] = useState<Offer | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'PENDING'>('PUBLIC');
  const [rating, setRating] = useState(0);

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

  const pendingCount = offers.filter(o => o.status === 'PENDING').length;

  const filteredOffers = offers.filter(offer => {
    if (adminMode) {
        if (viewMode === 'PUBLIC' && offer.status !== 'APPROVED') return false;
        if (viewMode === 'PENDING' && offer.status !== 'PENDING') return false;
    } else {
        if (offer.status !== 'APPROVED') return false;
    }
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (offer.title || '').toLowerCase().includes(term) || 
      (offer.asset || '').toLowerCase().includes(term) ||
      (offer.location || '').toLowerCase().includes(term) ||
      (offer.nickname || '').toLowerCase().includes(term);
    return matchesSearch;
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta publicación?')) {
      deleteOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await approveOffer(id);
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'APPROVED' } : o));
  };

  const handleAnalyze = async (offer: Offer) => {
    if (!isAiConfigured()) {
        alert("La IA no está configurada correctamente.");
        return;
    }
    setAnalyzing(true);
    setAiAnalysis('');
    setShowAiModal(true);
    const context = `Oferta: ${offer.title}. Activo: ${offer.asset}. Precio: ${offer.price}. Vendedor: @${offer.nickname}. Descripción: ${offer.description}`;
    const result = await analyzeOffer(context);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const openTradeRoom = (e: React.MouseEvent, offer: Offer) => {
    e.preventDefault();
    setTradeOffer(offer);
    setRating(0);
  };

  const getWhatsAppLink = (offer: Offer | null, type: 'TRADE' | 'REPORT' | 'COMPLETE_WITH_RATING') => {
    if (!offer) return '#';
    const idSafe = offer.id ? offer.id.slice(0,6) : '---';
    const adminPhone = getAdminPhone();
    
    if (type === 'TRADE') {
        const sellerContact = offer.contactInfo || '';
        let sellerPhone = sellerContact.replace(/[^0-9]/g, '');
        if (sellerPhone.length < 8) return null;
        const text = `👋 Hola ${offer.nickname || ''}, te contacto desde *Cryptocagua P2P*.\n\nInteresado en:\n🆔 *ID:* ${idSafe}\n📌 *Titulo:* ${offer.title}\n💰 *Precio:* ${offer.price}\n\n✅ *Quiero iniciar el intercambio.*`;
        return `https://wa.me/${sellerPhone}?text=${encodeURIComponent(text)}`;
    } 
    
    if (type === 'REPORT' && adminPhone) {
        const text = `🚨 *REPORTE DE ESTAFA*\nID: ${idSafe}\nUsuario: @${offer.nickname}\nRevisar urgente.`;
        return `https://wa.me/${adminPhone}?text=${encodeURIComponent(text)}`;
    } 
    
    if (type === 'COMPLETE_WITH_RATING' && adminPhone) {
         const stars = rating > 0 ? `${rating}/5 ⭐` : "Sin calificar";
         const text = `✅ *COMERCIO CONCRETADO*\n🆔 ID: ${idSafe}\n👤 Vendedor: @${offer.nickname}\n🌟 Calificación: ${stars}\n\nTodo salió bien, solicito cerrar el registro.`;
         return `https://wa.me/${adminPhone}?text=${encodeURIComponent(text)}`;
    }
    
    return null;
  };

  const handleFinalizeAndRate = () => {
    if (rating === 0) {
      if (!window.confirm("No has seleccionado estrellas. ¿Deseas finalizar de todos modos?")) {
        return;
      }
    }

    const link = getWhatsAppLink(tradeOffer, 'COMPLETE_WITH_RATING');
    if (link) {
        window.open(link, '_blank');
        alert('¡Excelente! Se ha enviado la confirmación al administrador.');
        setTradeOffer(null);
    } else {
        alert('El administrador no tiene configurado WhatsApp.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh] pb-32">
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
        <div className="flex items-center gap-4">
             <h2 className="text-3xl font-bold text-white">Mercado P2P</h2>
             <button onClick={() => setShowSafetyModal(true)} className="flex items-center text-xs font-bold text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-1.5 rounded-full border border-primary-500/20">
                <ShieldExclamationIcon className="h-4 w-4 mr-1.5" /> ¿Seguridad?
             </button>
             {loading && <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />}
        </div>
        <div className="w-full md:max-w-md relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3.5 text-gray-500" />
            <input type="text" className="block w-full pl-10 bg-slate-900 border border-slate-700 text-gray-100 rounded-lg py-3 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {adminMode && (
        <div className="flex space-x-4 mb-8 bg-slate-800/50 p-1.5 rounded-xl border border-white/5 w-fit">
            <button onClick={() => setViewMode('PUBLIC')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400'}`}>Público</button>
            <button onClick={() => setViewMode('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400'}`}>
                ⏳ Pendientes {pendingCount > 0 && <span className="ml-2 bg-white text-yellow-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>}
            </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.map((offer) => (
            <div key={offer.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col h-full relative hover:border-primary-500/50 transition-all duration-300">
              {adminMode && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {offer.status === 'PENDING' && <button onClick={(e) => handleApprove(e, offer.id)} className="bg-green-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><CheckBadgeIcon className="h-4 w-4" /></button>}
                    <button onClick={(e) => handleDelete(e, offer.id)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><TrashIcon className="h-4 w-4" /></button>
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${offer.type === OfferType.BUY ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{offer.type}</span>
                  <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5"><StarIconSolid className="h-3 w-3 text-yellow-500" /><span className="text-xs text-yellow-500 font-bold">{offer.reputation || 0}</span></div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">@{offer.nickname}</h3>
                <h4 className="text-sm font-semibold text-primary-400 mb-3">{offer.title}</h4>
                <p className="text-sm text-gray-400 mb-6 line-clamp-3 flex-1">{offer.description}</p>
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs"><span className="text-gray-500 uppercase font-bold tracking-tighter">Precio</span><span className="font-bold text-green-400">{offer.price}</span></div>
                </div>
              </div>
              <div className="p-4 bg-slate-900/50 flex gap-2">
                  <button onClick={() => handleAnalyze(offer)} className="flex-1 bg-slate-800 text-secondary-400 font-bold py-3 rounded-xl border border-white/5 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"><SparklesIcon className="h-4 w-4" /> IA</button>
                  <button onClick={(e) => openTradeRoom(e, offer)} className="flex-[2] bg-white text-slate-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"><ChatBubbleLeftRightIcon className="h-4 w-4" /> Iniciar</button>
              </div>
            </div>
        ))}
      </div>

      {/* MODAL IA - CORREGIDO SIN ANIMACIONES QUE FALLAN */}
      {showAiModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80" onClick={() => setShowAiModal(false)}></div>
            <div className="relative bg-slate-800 rounded-3xl max-w-md w-full overflow-hidden border border-secondary-500/30 shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="h-6 w-6 text-secondary-400" />
                        <h3 className="text-xl font-bold text-white">Análisis IA</h3>
                    </div>
                    <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-8">
                    {analyzing ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <ArrowPathIcon className="h-12 w-12 text-secondary-400 animate-spin" />
                            <p className="text-secondary-300 font-medium">Analizando...</p>
                        </div>
                    ) : (
                        <div className="text-gray-200 leading-relaxed max-h-[60vh] overflow-y-auto">
                            <ReactMarkdown>{aiAnalysis || "Error en el análisis."}</ReactMarkdown>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-slate-900 border-t border-white/10">
                    <button onClick={() => setShowAiModal(false)} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl">Cerrar</button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL SALA DE NEGOCIO - CORREGIDO SIN ANIMACIONES QUE FALLAN */}
      {tradeOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/90" onClick={() => setTradeOffer(null)}></div>
            <div className="relative bg-slate-800 rounded-2xl max-w-lg w-full overflow-hidden border border-primary-500/30 shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900">
                    <div><h3 className="text-xl font-bold text-white">Sala de Negocio</h3></div>
                    <button onClick={() => setTradeOffer(null)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4">
                        <div><p className="text-[10px] text-gray-500 uppercase font-bold">Vendedor</p><p className="text-white font-bold text-sm">@{tradeOffer.nickname}</p></div>
                        <div><p className="text-[10px] text-gray-500 uppercase font-bold">Reputación</p><div className="flex text-yellow-500">{[...Array(5)].map((_, i) => <StarIconSolid key={i} className={`h-3 w-3 ${i < (tradeOffer.reputation || 0) ? 'text-yellow-500' : 'text-slate-700'}`} />)}</div></div>
                    </div>
                    
                    <a href={getWhatsAppLink(tradeOffer, 'TRADE') || '#'} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg" onClick={(e) => !getWhatsAppLink(tradeOffer, 'TRADE') && (e.preventDefault(), alert('Teléfono no válido.'))}>
                        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3" /> Abrir WhatsApp del Vendedor
                    </a>

                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 text-center">
                        <p className="text-xs font-bold text-primary-400 mb-3 uppercase tracking-widest">Calificar Vendedor</p>
                        <div className="flex justify-center gap-2 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button key={s} onClick={() => setRating(s)}>
                              {rating >= s ? <StarIconSolid className="h-10 w-10 text-yellow-400" /> : <StarIcon className="h-10 w-10 text-gray-600" />}
                            </button>
                          ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button onClick={handleFinalizeAndRate} className="w-full flex items-center justify-center bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-xl shadow-xl">
                            <CheckCircleIcon className="h-6 w-6 mr-2" /> Finalizar y Reportar
                        </button>
                        
                        <button onClick={() => { 
                            const link = getWhatsAppLink(tradeOffer, 'REPORT'); 
                            if(link) window.open(link, '_blank');
                        }} className="w-full text-[10px] font-bold text-red-400 py-2 flex items-center justify-center gap-1 opacity-70">
                            <ExclamationTriangleIcon className="h-3 w-3" /> Reportar Problema
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};