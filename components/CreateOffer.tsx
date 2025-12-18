import React, { useState, useEffect } from 'react';
import { OfferType, AssetCategory } from '../types';
import { addOffer, syncWithGoogleSheets, getUserProfile, saveUserProfile, getAdminPhone } from '../services/dataService';
import { generateDescription } from '../services/geminiService';
import { SparklesIcon, ArrowLeftIcon, CheckCircleIcon, UserCircleIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';

interface CreateOfferProps {
  onSuccess: () => void;
}

export const CreateOffer: React.FC<CreateOfferProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [adminPhone, setAdminPhone] = useState('');
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
    const profile = getUserProfile();
    if (profile) {
      setFormData(prev => ({
        ...prev,
        nickname: profile.nickname,
        contactInfo: profile.contactInfo
      }));
    }
    setAdminPhone(getAdminPhone());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAiGenerate = async () => {
    if (!formData.title || !formData.category) {
      alert("Completa el título y la categoría primero.");
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
    saveUserProfile(formData.nickname, formData.contactInfo);
    try {
      const newOffer = addOffer(formData);
      await syncWithGoogleSheets(newOffer);
      setShowSuccessModal(true);
    } catch (error) {
      alert('Error al publicar');
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setShowSuccessModal(false);
    onSuccess();
  }

  const inputClass = "w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all";
  const labelClass = "block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest";

  if (showSuccessModal) {
    const waLink = adminPhone 
      ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(`Hola Admin, acabo de subir la oferta "${formData.title}". Solicito aprobación.`)}`
      : '#';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center border border-primary-500/30 shadow-2xl">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
            <CheckCircleIcon className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">¡Enviado!</h3>
          <p className="text-gray-400 text-sm mb-6">
            Tu oferta está en revisión. El administrador te contactará pronto para verificar.
          </p>
          <div className="space-y-3">
            {adminPhone && (
              <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full py-4 px-4 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold transition-all">
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5 mr-2" /> Contactar Admin
              </a>
            )}
            <button onClick={handleFinish} className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold">Volver al Mercado</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
        <div className="relative bg-slate-900/50 px-8 py-6 border-b border-white/5 flex justify-between items-center">
          <button onClick={onSuccess} className="text-gray-400 hover:text-white transition-colors"><ArrowLeftIcon className="h-6 w-6" /></button>
          <h2 className="text-xl font-bold text-white">Publicar Activo</h2>
          <div className="w-6"></div>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelClass}>@ Nickname</label><input type="text" name="nickname" required value={formData.nickname} onChange={handleChange} className={inputClass} placeholder="Ej: CriptoJuan" /></div>
            <div><label className={labelClass}>Tu WhatsApp</label><input type="text" name="contactInfo" required value={formData.contactInfo} onChange={handleChange} className={inputClass} placeholder="Ej: +58412..." /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelClass}>Tipo</label><select name="type" value={formData.type} onChange={handleChange} className={inputClass}>{Object.values(OfferType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelClass}>Categoría</label><select name="category" value={formData.category} onChange={handleChange} className={inputClass}>{Object.values(AssetCategory).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className={labelClass}>Título</label><input type="text" name="title" required value={formData.title} onChange={handleChange} className={inputClass} placeholder="¿Qué ofreces o buscas?" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className={labelClass}>Activo</label><input type="text" name="asset" required value={formData.asset} onChange={handleChange} className={inputClass} placeholder="Ej: BTC, iPhone, USD..." /></div>
            <div><label className={labelClass}>Precio / Tasa</label><input type="text" name="price" required value={formData.price} onChange={handleChange} className={inputClass} placeholder="Ej: 500$, Tasa BCV..." /></div>
          </div>
          <div><label className={labelClass}>Ubicación / País</label><input type="text" name="location" required value={formData.location} onChange={handleChange} className={inputClass} placeholder="Ej: Caracas, VE / Global" /></div>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4"><label className={labelClass}>Descripción</label><button type="button" onClick={handleAiGenerate} disabled={aiLoading} className="text-[10px] font-bold text-secondary-400 bg-secondary-400/10 px-3 py-1 rounded-full border border-secondary-400/20">{aiLoading ? 'Generando...' : 'IA Redactar'}</button></div>
            <textarea name="description" rows={4} required value={formData.description} onChange={handleChange} className={`${inputClass} resize-none`} placeholder="Detalles de la operación..."></textarea>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary-500/20">{loading ? 'Enviando...' : 'Publicar Ahora'}</button>
        </form>
      </div>
    </div>
  );
};