import React, { useState, useEffect } from 'react';
import { OfferType, AssetCategory } from '../types';
import { addOffer, syncWithGoogleSheets, getUserProfile, saveUserProfile } from '../services/dataService';
import { generateDescription } from '../services/geminiService';
import { SparklesIcon, ArrowLeftIcon, CheckCircleIcon, UserCircleIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';

interface CreateOfferProps {
  onSuccess: () => void;
}

export const CreateOffer: React.FC<CreateOfferProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState({
    type: OfferType.SELL,
    title: '',
    asset: '',
    price: '',
    location: '',
    category: AssetCategory.CRYPTO,
    description: '',
    contactInfo: '',
    nickname: ''
  });

  useEffect(() => {
    // Load saved user profile
    const profile = getUserProfile();
    if (profile) {
      setFormData(prev => ({
        ...prev,
        nickname: profile.nickname,
        contactInfo: profile.contactInfo
      }));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAiGenerate = async () => {
    if (!formData.title || !formData.category) {
      alert("Por favor completa el título y la categoría primero.");
      return;
    }
    setAiLoading(true);
    const generated = await generateDescription(formData.title, formData.category);
    setFormData(prev => ({ ...prev, description: generated }));
    setAiLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Save profile for next time
    saveUserProfile(formData.nickname, formData.contactInfo);

    try {
      const newOffer = addOffer(formData);
      // This sync triggers the Google Script which sends the email to Admin
      await syncWithGoogleSheets(newOffer);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      alert('Error al publicar la oferta');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    onSuccess();
  }

  const inputClass = "w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-600 transition-all";
  const labelClass = "block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wide";

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center border border-primary-500/30 shadow-2xl">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
          <p className="text-gray-300 text-sm mb-6 leading-relaxed">
            Tu oferta ha sido enviada al Admin. <br/>
            <span className="text-yellow-400 font-bold">Importante:</span> Te contactaremos pronto a tu WhatsApp para verificar tu identidad antes de publicar.
          </p>
          <div className="space-y-3">
            <button
                onClick={handleFinish}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 rounded-xl text-white font-bold transition-colors"
            >
                Entendido
            </button>
            <a
                href={`https://wa.me/584120000000?text=Hola Admin, acabo de subir la oferta "${formData.title}". Quedo atento a la verificación.`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-gray-300 text-xs font-bold transition-colors border border-slate-600"
            >
                <ChatBubbleBottomCenterTextIcon className="h-4 w-4 mr-2" />
                Contactar al Admin ahora
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative bg-slate-900/50 px-8 py-6 border-b border-white/5">
          <button onClick={onSuccess} className="absolute left-6 top-6 text-gray-400 hover:text-white">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Nueva Publicación</h2>
            <p className="text-primary-400 text-sm mt-1">Crea una orden P2P segura y global</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="bg-slate-800/30 p-5 rounded-xl border border-primary-500/10">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center">
                  <UserCircleIcon className="h-5 w-5 mr-2 text-primary-400" />
                  Identidad del Vendedor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Nick / Alias</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 font-bold">@</span>
                        <input
                            type="text"
                            name="nickname"
                            required
                            placeholder="Ej: CriptoMaster"
                            value={formData.nickname}
                            onChange={handleChange}
                            className={`${inputClass} pl-8`}
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Contacto (WhatsApp)</label>
                    <input
                        type="text"
                        name="contactInfo"
                        required
                        placeholder="+58 412 000 0000"
                        value={formData.contactInfo}
                        onChange={handleChange}
                        className={`${inputClass} border-yellow-500/30 focus:border-yellow-500`}
                    />
                    <p className="text-[10px] text-yellow-500/80 mt-1.5">
                    * Requerido para verificación del Admin.
                    </p>
                </div>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Tipo de Operación</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={inputClass}
              >
                {Object.values(OfferType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Categoría</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={inputClass}
              >
                {Object.values(AssetCategory).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Título del Anuncio</label>
            <input
              type="text"
              name="title"
              required
              placeholder="Ej: Vendo Bitcoin a buen precio"
              value={formData.title}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Activo</label>
              <input
                type="text"
                name="asset"
                required
                placeholder="Ej: BTC, USD, iPhone, Servicios"
                value={formData.asset}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Precio / Tasa</label>
              <input
                type="text"
                name="price"
                required
                placeholder="Ej: 500 USD o 'A convenir'"
                value={formData.price}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Ubicación</label>
            <input
              type="text"
              name="location"
              required
              placeholder="Ciudad, País o 'Global'"
              value={formData.location}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-300">Descripción</label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="text-xs flex items-center text-secondary-400 hover:text-secondary-300 font-bold bg-secondary-500/10 px-3 py-1 rounded-full transition-colors"
              >
                <SparklesIcon className={`h-3.5 w-3.5 mr-1 ${aiLoading ? 'animate-pulse' : ''}`} />
                {aiLoading ? 'Redactando...' : 'Generar con IA'}
              </button>
            </div>
            <textarea
              name="description"
              rows={4}
              required
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-lg bg-slate-900 border-0 p-3 text-white focus:ring-1 focus:ring-secondary-500 placeholder-gray-600 resize-none"
              placeholder="Detalla tu oferta aquí..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:to-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transform transition-all active:scale-95 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <span className="flex items-center">
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Procesando...
                </span>
              ) : 'Enviar para Aprobación'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};