import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Marketplace } from './components/Marketplace';
import { CreateOffer } from './components/CreateOffer';
import { ConfigGuide } from './components/ConfigGuide';
import { ViewState } from './types';
import { ArrowRightIcon, ShieldCheckIcon, UserGroupIcon, BoltIcon } from '@heroicons/react/24/outline';

function App() {
  const [currentView, setCurrentView] = useState<ViewState['current']>('HOME');

  const renderView = () => {
    switch (currentView) {
      case 'MARKETPLACE':
        return <Marketplace />;
      case 'CREATE':
        return <CreateOffer onSuccess={() => setCurrentView('MARKETPLACE')} />;
      case 'CONFIG':
        return <ConfigGuide />;
      case 'HOME':
      default:
        return (
          <div className="flex flex-col">
            {/* Hero Section */}
            <div className="relative overflow-hidden min-h-[80vh] flex items-center">
              {/* Background Effects */}
              <div className="absolute top-0 left-0 w-full h-full bg-background overflow-hidden -z-10">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-600/20 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-secondary-600/20 blur-[120px]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
              </div>

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 pt-10">
                <div className="lg:grid lg:grid-cols-12 lg:gap-8">
                  <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary-500/30 bg-primary-500/10 text-primary-300 text-xs font-semibold uppercase tracking-wide mb-6">
                      <span className="flex h-2 w-2 rounded-full bg-primary-400 mr-2 animate-pulse"></span>
                      P2P Global & Descentralizado
                    </div>
                    <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                      <span className="block">Intercambia</span>
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">Sin Fronteras</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-400 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                      Cryptocagua es el protocolo P2P que te permite comerciar cualquier activo. Desde Cripto y Fiat hasta servicios, potenciado por IA para tu seguridad.
                    </p>
                    <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => setCurrentView('MARKETPLACE')}
                        className="px-8 py-4 text-base font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-500 md:text-lg transition-all shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50"
                      >
                        Explorar Mercado
                      </button>
                      <button
                        onClick={() => setCurrentView('CREATE')}
                        className="px-8 py-4 text-base font-bold rounded-xl text-primary-300 bg-slate-800 border border-slate-700 hover:bg-slate-700 md:text-lg transition-all"
                      >
                        Publicar Anuncio
                      </button>
                    </div>
                  </div>
                  <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
                    <div className="relative mx-auto w-full rounded-lg lg:max-w-md">
                       <div className="relative block w-full bg-white rounded-lg overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500 border-4 border-slate-800">
                          <img
                            className="w-full"
                            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
                            alt="Crypto Dashboard"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="py-24 bg-slate-900 relative">
               <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="lg:text-center mb-16">
                  <h2 className="text-base text-secondary-400 font-semibold tracking-wide uppercase">Tecnología</h2>
                  <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-white sm:text-4xl">
                    El futuro del intercambio P2P
                  </p>
                </div>

                <div className="mt-10">
                  <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                    <div className="relative group p-6 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-white/5">
                      <dt>
                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg">
                          <ShieldCheckIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="ml-16 text-lg leading-6 font-bold text-white group-hover:text-primary-400 transition-colors">Seguridad IA Gemini</p>
                      </dt>
                      <dd className="mt-2 ml-16 text-base text-gray-400">
                        Análisis automático de ofertas en tiempo real para detectar fraudes y riesgos antes de que operes.
                      </dd>
                    </div>

                    <div className="relative group p-6 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-white/5">
                      <dt>
                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-700 text-white shadow-lg">
                          <BoltIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="ml-16 text-lg leading-6 font-bold text-white group-hover:text-secondary-400 transition-colors">Serverless & Rápido</p>
                      </dt>
                      <dd className="mt-2 ml-16 text-base text-gray-400">
                        Arquitectura ligera conectada a la nube de Google para máxima disponibilidad sin intermediarios costosos.
                      </dd>
                    </div>

                    <div className="relative group p-6 rounded-2xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-white/5">
                      <dt>
                        <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg">
                          <UserGroupIcon className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <p className="ml-16 text-lg leading-6 font-bold text-white group-hover:text-indigo-400 transition-colors">Red Global</p>
                      </dt>
                      <dd className="mt-2 ml-16 text-base text-gray-400">
                        Conecta con traders verificados por la comunidad en cualquier país. Sin restricciones geográficas.
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="relative py-16">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900/50 to-secondary-900/50"></div>
              <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                  <span className="block">Comienza a operar hoy.</span>
                </h2>
                <p className="mt-4 text-xl text-gray-300">
                  Configura tu propia base de datos y toma el control de tus finanzas.
                </p>
                <button
                  onClick={() => setCurrentView('CONFIG')}
                  className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-white/20 text-base font-medium rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 sm:w-auto transition-all"
                >
                  Configurar Base de Datos <ArrowRightIcon className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans selection:bg-primary-500 selection:text-white">
      <Navbar setView={setCurrentView} currentView={currentView} />
      <div className="pb-10">
        {renderView()}
      </div>
      <footer className="bg-slate-900 border-t border-white/5 mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © 2024 Cryptocagua P2P. Powered by Google Gemini & Apps Script.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;