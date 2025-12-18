import React, { useState, useEffect } from 'react';
import { getOffers, getAdminEmail, isAdmin, deleteOffer, approveOffer, fetchOffers } from '../services/dataService';
import { Offer, AssetCategory, OfferType } from '../types';
import { analyzeOffer } from '../services/geminiService';
import { MagnifyingGlassIcon, FunnelIcon, MapPinIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, SparklesIcon, XMarkIcon, FlagIcon, TrashIcon, ClockIcon, CheckBadgeIcon, ExclamationTriangleIcon, StarIcon, ShieldCheckIcon, ShieldExclamationIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const Marketplace: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
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

  const filteredOffers = offers.filter(offer => {
    if (adminMode) {
        if (viewMode === 'PUBLIC' && offer.status !== 'APPROVED') return false;
        if (viewMode === 'PENDING' && offer.status !== 'PENDING') return false;
    } else {
        if (offer.status !== 'APPROVED') return false;
    }
    const matchesCategory = filterCategory === 'ALL' || offer.category === filterCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (offer.title || '').toLowerCase().includes(term) || 
      (offer.asset || '').toLowerCase().includes(term) ||
      (offer.location || '').toLowerCase().includes(term) ||
      (offer.nickname || '').toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta oferta?')) {
      deleteOffer(id);
      setOffers(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await approveOffer(id);
    setOffers(prev => prev.map(o => o.id === id ? { ...o, status: 'APPROVED' } : o));
  };

  const openTradeRoom = (e: React.MouseEvent, offer: Offer) => {
    e.preventDefault();
    if (!offer) return;
    setTradeOffer(offer);
    setRating(0);
  };

  const getWhatsAppLink = (offer: Offer | null, type: 'TRADE' | 'REPORT' | 'COMPLETE') => {
    if (!offer) return '#';
    const contact = offer.contactInfo || '';
    let phone = contact.replace(/[^0-9]/g, '');
    const idSafe = offer.id ? offer.id.slice(0,6) : '---';
    
    if (type === 'TRADE') {
        if (phone.length < 8) return null;
        const text = `👋 Hola ${offer.nickname || ''}, te contacto desde *Cryptocagua P2P*.\n\nInteresado en:\n🆔 *ID:* ${idSafe}\n📌 *Titulo:* ${offer.title}\n💰 *Precio:* ${offer.price}\n\n✅ *Quiero iniciar el intercambio.*`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else if (type === 'REPORT') {
        const adminEmail = getAdminEmail();
        return `mailto:${adminEmail}?subject=URGENTE: REPORTE - ID ${idSafe}&body=Reporte de usuario ${offer.nickname}. ID: ${offer.id}`;
    } else if (type === 'COMPLETE') {
         const text = `✅ *FINALIZADO*\n\nComercio ID: ${idSafe} (${offer.title}) exitoso.`;
         return `https://wa.me/?text=${encodeURIComponent(text)}`; 
    }
    return '#';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh] pb-32">
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
        <div className="flex items-center gap-4">
             <h2 className="text-3xl font-bold text-white">Mercado P2P</h2>
             <button onClick={() => setShowSafetyModal(true)} className="text-xs font-bold text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-full border border-primary-500/20">
                <ShieldExclamationIcon className="h-4 w-4 mr-1.5 inline" /> ¿Seguridad?
             </button>
             {loading && <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />}
        </div>
        <input
          type="text"
          className="block w-full md:max-w-md bg-slate-900 border border-slate-700 text-gray-100 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {adminMode && (
        <div className="flex space-x-4 mb-6 bg-slate-800/50 p-1 rounded-xl border border-white/5 w-fit">
            <button onClick={() => setViewMode('PUBLIC')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white' : 'text-gray-400'}`}>Público</button>
            <button onClick={() => setViewMode('PENDING')} className={`px-4 py-2 rounded-lg text-sm font-bold ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white' : 'text-gray-400'}`}>⏳ Pendientes</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.map((offer) => (
            <div key={offer.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col h-full relative p-5">
              <div className="flex justify-between items-start mb-3">
                  <span className="bg-primary-500/10 text-primary-400 text-[10px] font-bold px-2 py-1 rounded border border-primary-500/20 uppercase">{offer.type}</span>
                  <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5">
                      <StarIconSolid className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-yellow-500 font-bold">{offer.reputation || 0}</span>
                  </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">@{offer.nickname} - {offer.title}</h3>
              <p className="text-sm text-gray-400 mb-4 flex-1">{offer.description}</p>
              <div className="space-y-2 mb-4 border-t border-white/5 pt-4">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Activo:</span><span className="text-white font-bold">{offer.asset}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Precio:</span><span className="text-green-400 font-bold">{offer.price}</span></div>
              </div>
              <div className="flex gap-2">
                  <button onClick={(e) => openTradeRoom(e, offer)} className="flex-1 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">Iniciar</button>
                  {adminMode && (
                      <button onClick={(e) => handleDelete(e, offer.id)} className="bg-red-500/20 text-red-500 p-3 rounded-xl border border-red-500/30"><TrashIcon className="h-5 w-5"/></button>
                  )}
              </div>
            </div>
        ))}
      </div>

      {/* TRADE ROOM MODAL */}
      {tradeOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setTradeOffer(null)}></div>
            <div className="relative glass-panel rounded-2xl max-w-lg w-full overflow-hidden border border-primary-500/30">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
                    <h3 className="text-xl font-bold text-white">Sala de Negocio</h3>
                    <button onClick={() => setTradeOffer(null)}><XMarkIcon className="h-6 w-6 text-gray-400 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5 grid grid-cols-2 gap-4">
                        <div><p className="text-[10px] text-gray-500 uppercase font-bold">Vendedor</p><p className="text-white font-bold">@{tradeOffer.nickname || 'Anónimo'}</p></div>
                        <div><p className="text-[10px] text-gray-500 uppercase font-bold">Reputación</p><div className="flex text-yellow-500">{[...Array(5)].map((_, i) => <StarIconSolid key={i} className={`h-3 w-3 ${i < (tradeOffer.reputation || 0) ? 'text-yellow-500' : 'text-gray-700'}`} />)}</div></div>
                    </div>
                    
                    <a href={getWhatsAppLink(tradeOffer, 'TRADE') || '#'} target="_blank" rel="noreferrer" 
                       className="flex items-center justify-center w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-500/20"
                       onClick={(e) => !getWhatsAppLink(tradeOffer, 'TRADE') && (e.preventDefault(), alert('Sin teléfono válido.'))}>
                        <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3" /> Abrir Chat de WhatsApp
                    </a>

                    <div className="text-center pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-400 mb-3">Califica tu experiencia después de pagar/recibir:</p>
                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                                    {rating >= s ? <StarIconSolid className="h-8 w-8 text-yellow-400" /> : <StarIcon className="h-8 w-8 text-gray-600" />}
                                </button>
                            ))}
                        </div>
                        <button disabled={rating === 0} onClick={() => {
                            const link = `mailto:${getAdminEmail()}?subject=Calificación ID ${tradeOffer.id}&body=Usuario @${tradeOffer.nickname} - Estrellas: ${rating}`;
                            window.location.href = link;
                            setTradeOffer(null);
                            alert('Gracias. El admin actualizará la reputación en breve.');
                        }} className={`px-6 py-2 rounded-lg text-xs font-bold ${rating > 0 ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Enviar Rating</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};