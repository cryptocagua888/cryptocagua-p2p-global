import React, { useState } from 'react';
import { ViewState } from '../types';
import { GlobeAltIcon, PlusCircleIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface NavbarProps {
  setView: (view: ViewState['current']) => void;
  currentView: ViewState['current'];
}

export const Navbar: React.FC<NavbarProps> = ({ setView, currentView }) => {
  const [clickCount, setClickCount] = useState(0);

  // Secret gesture logic: 5 taps on logo to open Config
  const handleLogoClick = () => {
    if (currentView === 'HOME') {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        setView('CONFIG');
        setClickCount(0);
      }
    } else {
      setView('HOME');
      setClickCount(0);
    }
  };

  const navItemClass = (viewName: ViewState['current']) => 
    `px-3 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
      currentView === viewName 
        ? 'text-primary-400 bg-white/5 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`;

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div 
            className="flex items-center cursor-pointer group select-none" 
            onClick={handleLogoClick}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-primary-600 to-secondary-600 text-white p-2.5 rounded-xl mr-3 shadow-lg group-hover:scale-105 transition-transform duration-300">
                <GlobeAltIcon className="h-6 w-6" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Cryptocagua
                <span className={`w-1.5 h-1.5 rounded-full bg-primary-500 ${clickCount > 0 ? 'animate-ping' : ''}`}></span>
              </h1>
              <span className="text-[10px] text-primary-400 font-bold tracking-[0.2em] uppercase">P2P Global Network</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setView('HOME')} className={navItemClass('HOME')}>
              Inicio
            </button>
            <button onClick={() => setView('MARKETPLACE')} className={navItemClass('MARKETPLACE')}>
              Mercado
            </button>
            {/* Config button hidden for regular users */}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('CREATE')}
              className="hidden md:inline-flex items-center px-5 py-2.5 border border-primary-500/30 text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.15)] text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:to-primary-400 focus:outline-none transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Publicar
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Bar - Optimized for touch */}
      <div className="md:hidden fixed bottom-0 left-0 w-full glass-nav border-t border-white/10 pb-safe pt-3 px-6 flex justify-between z-50 h-20 items-start">
         <button onClick={() => setView('HOME')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'HOME' ? 'text-primary-400' : 'text-gray-500'}`}>
            <GlobeAltIcon className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Inicio</span>
         </button>
         <button onClick={() => setView('MARKETPLACE')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'MARKETPLACE' ? 'text-primary-400' : 'text-gray-500'}`}>
            <ShoppingBagIcon className="h-6 w-6 mb-1" />
            <span className="text-[10px] font-medium">Mercado</span>
         </button>
         <button onClick={() => setView('CREATE')} className={`flex flex-col items-center p-2 w-16 ${currentView === 'CREATE' ? 'text-primary-400' : 'text-gray-500'}`}>
            <div className={`p-1 rounded-full ${currentView === 'CREATE' ? 'bg-primary-500/20' : ''}`}>
              <PlusCircleIcon className="h-6 w-6 mb-1" />
            </div>
            <span className="text-[10px] font-medium">Vender</span>
         </button>
      </div>
    </nav>
  );
};