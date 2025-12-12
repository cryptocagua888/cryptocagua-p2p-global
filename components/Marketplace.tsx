import React, { useState, useEffect } from 'react';
import { getOffers, getAdminEmail, isAdmin, deleteOffer, approveOffer, fetchOffers } from '../services/dataService';
import { Offer, AssetCategory, OfferType } from '../types';
import { analyzeOffer } from '../services/geminiService';
import { MagnifyingGlassIcon, FunnelIcon, MapPinIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon, SparklesIcon, XMarkIcon, FlagIcon, TrashIcon, ClockIcon, CheckBadgeIcon, ExclamationTriangleIcon, StarIcon, ShieldCheckIcon, PaperAirplaneIcon, ShieldExclamationIcon, QuestionMarkCircleIcon, CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';

export const Marketplace: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false); // New Safety Modal
  const [tradeOffer, setTradeOffer] = useState<Offer | null>(null); // For Trade Room
  
  const [adminMode, setAdminMode] = useState(false);
  const [viewMode, setViewMode] = useState<'PUBLIC' | 'PENDING'>('PUBLIC');
  const [rating, setRating] = useState(0);

  useEffect(() => {
    // Initial local load for speed
    setOffers(getOffers());
    
    const isAdminUser = isAdmin();
    setAdminMode(isAdminUser);
    
    // Fetch remote data
    loadRemoteData();
  }, []);

  const loadRemoteData = async () => {
    setLoading(true);
    const data = await fetchOffers();
    setOffers(data);
    setLoading(false);
  };

  const refreshOffers = () => {
    // Recarga local y luego remota
    setOffers(getOffers()); 
    loadRemoteData();
  };

  const pendingCount = offers.filter(o => o.status === 'PENDING').length;

  const filteredOffers = offers.filter(offer => {
    if (adminMode) {
        if (viewMode === 'PUBLIC' && offer.status !== 'APPROVED') return false;
        if (viewMode === 'PENDING' && offer.status !== 'PENDING') return false;
    } else {
        if (offer.status !== 'APPROVED') return false;
    }

    const matchesCategory = filterCategory === 'ALL' || offer.category === filterCategory;
    
    // Improved Search: checks title, asset, location AND nickname
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      offer.title.toLowerCase().includes(term) || 
      offer.asset.toLowerCase().includes(term) ||
      offer.location.toLowerCase().includes(term) ||
      (offer.nickname && offer.nickname.toLowerCase().includes(term));
      
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const msg = viewMode === 'PENDING' ? '¿Rechazar esta solicitud?' : '¿Eliminar oferta permanentemente?';
    if (window.confirm(msg)) {
      deleteOffer(id);
      refreshOffers();
    }
  };

  const handleApprove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await approveOffer(id);
    refreshOffers();
  };

  const handleAnalyze = async (offer: Offer) => {
    setAnalyzing(true);
    setAiAnalysis('');
    setShowAiModal(true);
    
    const context = `Oferta de ${offer.type}: ${offer.title}. Activo: ${offer.asset}. Precio: ${offer.price}. Ubicación: ${offer.location}. Descripción: ${offer.description}. Vendedor: ${offer.nickname}. Reputación Vendedor: ${offer.reputation || 0} estrellas.`;
    const result = await analyzeOffer(context);
    
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const openTradeRoom = (e: React.MouseEvent, offer: Offer) => {
    e.preventDefault();
    setTradeOffer(offer);
    setRating(0);
  };

  // WhatsApp Logic
  const getWhatsAppLink = (offer: Offer, type: 'TRADE' | 'REPORT' | 'COMPLETE') => {
    let phone = offer.contactInfo.replace(/[^0-9]/g, ''); // Extract numbers
    if (phone.length < 8 && type === 'TRADE') {
       return null; 
    }

    let text = '';
    
    if (type === 'TRADE') {
        text = `👋 Hola ${offer.nickname || ''}, te contacto desde *Cryptocagua P2P*.\n\nEstoy interesado en tu oferta:\n🆔 *ID:* ${offer.id.slice(0,6)}\n📌 *Titulo:* ${offer.title}\n💰 *Precio:* ${offer.price}\n📦 *Activo:* ${offer.asset}\n\n✅ *Quiero iniciar el intercambio.*`;
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    } else if (type === 'REPORT') {
        const adminEmail = getAdminEmail();
        // Generates a pre-filled email body for reporting
        return `mailto:${adminEmail}?subject=URGENTE: REPORTE DE ESTAFA - ID ${offer.id}&body=Hola Admin, quiero reportar al usuario ${offer.nickname} (ID Oferta: ${offer.id}).%0D%0A%0D%0ADetalles del incidente:%0D%0A-%0D%0A%0D%0A(ADJUNTA CAPTURAS DE PANTALLA DEL CHAT Y COMPROBANTES AQUÍ)`;
    } else if (type === 'COMPLETE') {
         text = `✅ *AVISO DE FINALIZACIÓN*\n\nHola Admin, el comercio con ID: ${offer.id.slice(0,6)} (${offer.title}) se ha concretado exitosamente.\n\nPor favor marcar como finalizado/borrar.`;
         return `https://wa.me/?text=${encodeURIComponent(text)}`; 
    }
    return '#';
  };

  const submitRating = (offer: Offer) => {
    if (rating === 0) return;
    const adminEmail = getAdminEmail();
    const subject = `CALIFICACIÓN USUARIO - ID ${offer.id}`;
    const body = `Usuario de la oferta: ${offer.nickname} (${offer.contactInfo})\nCalificación: ${rating} Estrellas\nComentario: El intercambio fue exitoso.`;
    window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    alert('Tu calificación se ha enviado al administrador para verificación.');
    setTradeOffer(null);
  };

  const closeAiModal = () => {
    setShowAiModal(false);
    setAiAnalysis('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[80vh] pb-32">
      
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center justify-between">
        <div className="flex items-center gap-4">
             <h2 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
               Mercado P2P
             </h2>
             {/* Safety Guide Button */}
             <button 
                onClick={() => setShowSafetyModal(true)}
                className="flex items-center text-xs font-bold text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 px-3 py-1.5 rounded-full border border-primary-500/20 transition-all"
             >
                <ShieldExclamationIcon className="h-4 w-4 mr-1.5" />
                ¿Seguridad?
             </button>
             {/* Loading Indicator */}
             {loading && (
                 <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" title="Sincronizando..." />
             )}
        </div>
        
        <div className="w-full md:max-w-md relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 bg-slate-900 border border-slate-700 text-gray-100 rounded-lg py-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-500 transition-all"
                placeholder="Buscar activo, país o usuario (@nick)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
        </div>
      </div>

      {/* Admin Tabs */}
      {adminMode && (
        <div className="flex space-x-4 mb-6 bg-slate-800/50 p-1.5 rounded-xl border border-white/5 w-fit">
            <button
                onClick={() => setViewMode('PUBLIC')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'PUBLIC' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                Mercado Público
            </button>
            <button
                onClick={() => setViewMode('PENDING')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${viewMode === 'PENDING' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                ⏳ Pendientes
                {pendingCount > 0 && (
                    <span className="ml-2 bg-white text-yellow-600 text-[10px] px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                    </span>
                )}
            </button>
        </div>
      )}
      
      {/* Filters */}
      <div className="mb-8 overflow-x-auto pb-2 no-scrollbar">
        <div className="flex items-center space-x-2">
           <div className="flex items-center text-primary-400 mr-2 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20">
             <FunnelIcon className="h-4 w-4 mr-2" />
             <span className="text-sm font-bold uppercase tracking-wider">Filtros</span>
           </div>
           <button 
             onClick={() => setFilterCategory('ALL')}
             className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ${filterCategory === 'ALL' ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-gray-400 border border-slate-700 hover:border-gray-500 hover:text-gray-200'}`}
           >
             Todos
           </button>
           {Object.values(AssetCategory).map(cat => (
             <button
               key={cat}
               onClick={() => setFilterCategory(cat)}
               className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300 ${filterCategory === cat ? 'bg-white text-slate-900 shadow-lg scale-105' : 'bg-slate-800 text-gray-400 border border-slate-700 hover:border-gray-500 hover:text-gray-200'}`}
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.length === 0 ? (
           <div className="col-span-full text-center py-20 glass-panel rounded-2xl border border-dashed border-gray-700">
             <div className="mx-auto h-24 w-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                {loading ? (
                    <ArrowPathIcon className="h-10 w-10 text-primary-500 animate-spin" />
                ) : (
                    viewMode === 'PENDING' ? (
                        <CheckBadgeIcon className="h-10 w-10 text-gray-500" />
                    ) : (
                        <MagnifyingGlassIcon className="h-10 w-10 text-gray-500" />
                    )
                )}
             </div>
             <p className="text-gray-400 text-lg font-light">
                 {loading ? 'Sincronizando mercado global...' : (viewMode === 'PENDING' 
                    ? 'No hay solicitudes pendientes de aprobación.' 
                    : 'No hay resultados para esta búsqueda.')}
             </p>
           </div>
        ) : (
          filteredOffers.map((offer) => (
            <div key={offer.id} className={`group glass-panel rounded-2xl overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] flex flex-col h-full relative ${offer.status === 'PENDING' ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
              
              {/* Card Header Gradient */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${
                offer.type === OfferType.BUY ? 'from-emerald-500 to-teal-400' : 
                offer.type === OfferType.SELL ? 'from-rose-500 to-orange-400' : 
                'from-blue-500 to-indigo-400'
              }`}></div>
              
              {/* Admin Actions */}
              {adminMode && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {viewMode === 'PENDING' && (
                        <button 
                            onClick={(e) => handleApprove(e, offer.id)}
                            className="bg-green-500/80 hover:bg-green-600 text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                            title="Aprobar Oferta"
                        >
                            <CheckBadgeIcon className="h-4 w-4" />
                        </button>
                    )}
                    <button 
                        onClick={(e) => handleDelete(e, offer.id)}
                        className="bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
                        title={viewMode === 'PENDING' ? "Rechazar" : "Eliminar"}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
              )}
              
              {offer.status === 'PENDING' && (
                   <div className="absolute top-4 left-4 z-10">
                       <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded shadow-lg flex items-center">
                           <ClockIcon className="h-3 w-3 mr-1" /> Revisión
                       </span>
                   </div>
              )}
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                        offer.type === OfferType.BUY ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        offer.type === OfferType.SELL ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {offer.type}
                      </span>
                      {offer.verified && (
                          <span className="inline-flex items-center px-1.5 py-1 rounded-md text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/20" title="Usuario Verificado">
                              <ShieldCheckIcon className="h-3 w-3" />
                          </span>
                      )}
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-900/50 px-2 py-0.5 rounded-full border border-white/5">
                      <StarIconSolid className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-yellow-500 font-bold">{offer.reputation || 0}</span>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-primary-400 transition-colors">{offer.title}</h3>
                
                {/* Nickname Display */}
                <p className="text-xs text-primary-400 font-bold mb-1 flex items-center">
                  @{offer.nickname || 'Usuario'}
                </p>

                <p className="text-sm text-gray-400 font-medium mb-4 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2"></span>
                  {offer.asset}
                </p>
                
                <p className="text-gray-400 text-sm mb-6 line-clamp-3 leading-relaxed flex-1">{offer.description}</p>
                
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center"><CurrencyDollarIcon className="h-4 w-4 mr-1.5"/> Precio</span>
                    <span className="font-bold text-white">{offer.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center"><MapPinIcon className="h-4 w-4 mr-1.5"/> Ubicación</span>
                    <span className="text-gray-300">{offer.location}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-slate-900/50 border-t border-white/5 flex flex-col gap-2">
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleAnalyze(offer)}
                      className="flex items-center justify-center text-xs font-bold text-secondary-400 bg-secondary-500/10 hover:bg-secondary-500/20 py-3 rounded-xl transition-colors border border-secondary-500/20"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      IA Scan
                    </button>
                    <button
                      onClick={(e) => openTradeRoom(e, offer)}
                      className="flex items-center justify-center text-xs font-bold text-slate-900 bg-white hover:bg-gray-200 py-3 rounded-xl transition-colors"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                      Iniciar
                    </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 text-center">
         <div className="inline-flex items-center px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs text-gray-400">
           <ClockIcon className="h-4 w-4 mr-2" />
           Las publicaciones expiran automáticamente después de 72 horas para mantener el mercado actualizado.
         </div>
      </div>

      {/* SAFETY GUIDE MODAL */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
             <div className="fixed inset-0 transition-opacity" onClick={() => setShowSafetyModal(false)}>
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
             </div>
             
             <div className="inline-block align-bottom glass-panel rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-primary-500/30">
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                   <h3 className="text-xl font-bold text-white flex items-center">
                      <ShieldExclamationIcon className="h-6 w-6 mr-2 text-red-400" />
                      Protocolo de Seguridad
                   </h3>
                   <button onClick={() => setShowSafetyModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
                </div>
                <div className="p-6 space-y-6">
                   <p className="text-gray-300 text-sm">
                      Si el publicante (vendedor) no cumple con lo acordado, sigue estos pasos estrictamente para proteger tu capital:
                   </p>
                   
                   <div className="space-y-4">
                      <div className="flex">
                         <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 border border-slate-600 text-white font-bold text-sm">1</div>
                         </div>
                         <div className="ml-4">
                            <h4 className="text-sm font-bold text-white">No liberes fondos</h4>
                            <p className="text-xs text-gray-400 mt-1">Si es una venta, nunca marques como "pagado" ni liberes el activo hasta ver el dinero en tu cuenta bancaria real.</p>
                         </div>
                      </div>

                      <div className="flex">
                         <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-800 border border-slate-600 text-white font-bold text-sm">2</div>
                         </div>
                         <div className="ml-4">
                            <h4 className="text-sm font-bold text-white">Documenta Todo</h4>
                            <p className="text-xs text-gray-400 mt-1">Toma capturas de pantalla inmediatas del chat de WhatsApp, comprobantes de pago y la oferta en esta web.</p>
                         </div>
                      </div>

                      <div className="flex">
                         <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-900/50 border border-red-500 text-red-400 font-bold text-sm">3</div>
                         </div>
                         <div className="ml-4">
                            <h4 className="text-sm font-bold text-red-400">Reporta al Admin</h4>
                            <p className="text-xs text-gray-400 mt-1">Usa el botón "Reportar" en la Sala de Negocio. Esto abre un correo directo al CEO con el ID de la transacción. Adjunta tus pruebas.</p>
                         </div>
                      </div>
                   </div>

                   <button 
                     onClick={() => setShowSafetyModal(false)}
                     className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
                   >
                     Entendido, tendré cuidado
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={closeAiModal}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom glass-panel rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-secondary-500/30">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button onClick={closeAiModal} className="text-gray-400 hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                   <div className="h-10 w-10 rounded-full bg-secondary-500/20 flex items-center justify-center text-secondary-400 mr-3 border border-secondary-500/30">
                     <SparklesIcon className="h-6 w-6" />
                   </div>
                   <h3 className="text-xl font-bold text-white">Análisis de Riesgo IA</h3>
                </div>
                
                <div className="bg-slate-950/50 rounded-xl p-4 border border-white/5 min-h-[150px]">
                   {analyzing ? (
                     <div className="flex flex-col items-center justify-center h-full py-8">
                       <div className="flex space-x-2 mb-3">
                         <div className="w-2.5 h-2.5 bg-secondary-400 rounded-full animate-bounce"></div>
                         <div className="w-2.5 h-2.5 bg-secondary-400 rounded-full animate-bounce delay-100"></div>
                         <div className="w-2.5 h-2.5 bg-secondary-400 rounded-full animate-bounce delay-200"></div>
                       </div>
                       <p className="text-xs text-secondary-300 font-mono animate-pulse">Procesando datos con Gemini...</p>
                     </div>
                   ) : (
                     <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                     </div>
                   )}
                </div>
                
                <div className="mt-6">
                  <button 
                    type="button" 
                    onClick={closeAiModal}
                    className="w-full inline-flex justify-center rounded-xl shadow-lg shadow-secondary-500/20 px-4 py-3 bg-gradient-to-r from-secondary-600 to-secondary-500 text-base font-bold text-white hover:from-secondary-500 hover:to-secondary-400 focus:outline-none transition-all"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRADE ROOM MODAL (Sala de Negocios) */}
      {tradeOffer && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={() => setTradeOffer(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
                </div>

                <div className="inline-block align-bottom glass-panel rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full border border-primary-500/30">
                    <div className="bg-slate-900/50 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                Sala de Negocio P2P
                                <span className="bg-green-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">En Curso</span>
                            </h3>
                            <p className="text-xs text-gray-400">ID: {tradeOffer.id}</p>
                        </div>
                        <button onClick={() => setTradeOffer(null)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
                    </div>

                    <div className="p-6">
                        {/* Order Summary */}
                        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-white/5 flex flex-col md:flex-row gap-4">
                             <div className="flex-1">
                                 <label className="text-[10px] uppercase text-gray-500 font-bold">Activo</label>
                                 <p className="text-lg font-bold text-white">{tradeOffer.asset}</p>
                             </div>
                             <div className="flex-1">
                                 <label className="text-[10px] uppercase text-gray-500 font-bold">Precio Pactado</label>
                                 <p className="text-lg font-bold text-green-400">{tradeOffer.price}</p>
                             </div>
                             <div className="flex-1">
                                 <label className="text-[10px] uppercase text-gray-500 font-bold">Vendedor</label>
                                 <p className="text-sm text-gray-300 truncate">@{tradeOffer.nickname}</p>
                                 <div className="flex text-yellow-500 mt-1">
                                     {[...Array(5)].map((_, i) => (
                                         <StarIconSolid key={i} className={`h-3 w-3 ${i < (tradeOffer.reputation || 0) ? 'text-yellow-500' : 'text-gray-600'}`} />
                                     ))}
                                 </div>
                             </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4">
                            {/* Step 1: WhatsApp */}
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-200"></div>
                                <a 
                                    href={getWhatsAppLink(tradeOffer, 'TRADE') || '#'} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="relative flex items-center justify-center w-full bg-slate-900 border border-green-500/50 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all"
                                    onClick={(e) => {
                                        if(!getWhatsAppLink(tradeOffer, 'TRADE')) {
                                            e.preventDefault();
                                            alert("El vendedor no proporcionó un número de teléfono válido. Contáctalo manualmente: " + tradeOffer.contactInfo);
                                        }
                                    }}
                                >
                                    <ChatBubbleLeftRightIcon className="h-6 w-6 mr-3 text-green-400" />
                                    1. Enviar datos al Vendedor (WhatsApp)
                                </a>
                            </div>
                            <p className="text-[10px] text-gray-400 text-center mb-4">
                                * Esto abrirá tu WhatsApp con un mensaje pre-cargado con el ID de la orden.
                            </p>

                            <div className="border-t border-white/10 my-4"></div>

                            {/* Step 2: Rating */}
                            <div className="bg-slate-800/30 p-4 rounded-xl text-center">
                                <h4 className="text-sm font-bold text-white mb-2">2. Calificar Contraparte</h4>
                                <p className="text-xs text-gray-400 mb-3">¿Cómo fue tu experiencia? Esto ayuda a la comunidad.</p>
                                <div className="flex justify-center gap-2 mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button key={star} onClick={() => setRating(star)} className="focus:outline-none transition-transform hover:scale-125">
                                            {rating >= star ? (
                                                <StarIconSolid className="h-8 w-8 text-yellow-400" />
                                            ) : (
                                                <StarIcon className="h-8 w-8 text-gray-600 hover:text-yellow-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => submitRating(tradeOffer)}
                                    disabled={rating === 0}
                                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-colors ${rating > 0 ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                                >
                                    Enviar Calificación al Admin
                                </button>
                            </div>

                            {/* Step 3: Complete / Report */}
                            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => {
                                        const link = getWhatsAppLink(tradeOffer, 'COMPLETE');
                                        if(link) window.open(link, '_blank');
                                    }}
                                    className="flex items-center justify-center text-xs text-blue-400 hover:text-blue-300 py-2 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/20"
                                >
                                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                                    Todo salió bien
                                </button>
                                <button 
                                   onClick={(e) => {
                                       e.preventDefault();
                                       const link = getWhatsAppLink(tradeOffer, 'REPORT');
                                       if (link) window.location.href = link;
                                       else alert('Configuración incompleta del admin.');
                                   }}
                                   className="flex items-center justify-center text-xs text-red-400 hover:text-red-300 py-2 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20 font-bold"
                                 >
                                   <FlagIcon className="h-4 w-4 mr-2" />
                                   Reportar Estafa
                                 </button>
                            </div>
                            <p className="text-[10px] text-center text-red-400/70 mt-1">
                                ⚠️ Si el usuario no responde o intenta cambiar las reglas, repórtalo inmediatamente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};