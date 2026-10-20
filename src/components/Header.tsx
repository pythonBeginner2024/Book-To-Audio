import React, { useState } from 'react';
import { useApp, ActiveView } from '../context/AppContext';
import { 
  BookOpen, 
  Key, 
  Headphones, 
  Library, 
  Sparkles, 
  FileText, 
  PlusCircle, 
  Settings, 
  CheckCircle2, 
  AlertCircle,
  FolderArchive,
  Github
} from 'lucide-react';
import { GitHubDeployModal } from './GitHubDeployModal';

export const Header: React.FC = () => {
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const {
    activeView,
    setActiveView,
    projects,
    currentProject,
    setCurrentProjectById,
    activeTextKey,
    activeAudioKey,
  } = useApp();

  const navItems: Array<{ id: ActiveView; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <Library className="w-4 h-4" /> },
    { id: 'new-book', label: 'Nouveau livre', icon: <PlusCircle className="w-4 h-4" /> },
    { 
      id: 'sections', 
      label: 'Plan du livre', 
      icon: <FileText className="w-4 h-4" />,
      badge: currentProject?.sections?.length 
    },
    { 
      id: 'studio', 
      label: 'Résumés pédagogiques', 
      icon: <Sparkles className="w-4 h-4" />,
      badge: currentProject?.sections?.filter((s) => s.humanValidated).length
    },
    { 
      id: 'audio', 
      label: 'Génération audio', 
      icon: <Headphones className="w-4 h-4" />,
      badge: currentProject?.sections?.filter((s) => s.status === 'termine').length
    },
    { id: 'player', label: 'Lecteur & Téléchargements', icon: <FolderArchive className="w-4 h-4" /> },
    { id: 'api-keys', label: 'Clés API', icon: <Key className="w-4 h-4" /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings className="w-4 h-4" /> },
  ];

  const hasTextKey = !!activeTextKey?.key;
  const hasAudioKey = !!activeAudioKey?.key;

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner: Brand + Project Selector + API status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div 
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-amber-400 transition-colors">
                BookToAudio
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                Gratuit & Local
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Livres PDF en résumés audio pédagogiques
            </p>
          </div>
        </div>

        {/* Center: Active Project Selector */}
        <div className="flex items-center gap-2 max-w-xs sm:max-w-md w-full">
          {projects.length > 0 ? (
            <div className="relative w-full">
              <select
                aria-label="Sélectionner un livre actif"
                value={currentProject?.id || ''}
                onChange={(e) => setCurrentProjectById(e.target.value || null)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📖 {p.title} ({p.sections.length} sections)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic hidden md:block">
              Aucun livre chargé
            </div>
          )}
        </div>

        {/* Right: API Keys Status Indicators */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('api-keys')}
            title="Gérer les clés API Gemini"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline text-slate-300 font-medium">Clés Gemini :</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <span 
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                  hasTextKey ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
                title={hasTextKey ? `Clé Analyse : ${activeTextKey?.name}` : 'Clé analyse non configurée'}
              >
                {hasTextKey ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>Texte</span>
              </span>
              <span 
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                  hasAudioKey ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
                title={hasAudioKey ? `Clé Audio : ${activeAudioKey?.name}` : 'Clé audio non configurée'}
              >
                {hasAudioKey ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                <span>Audio</span>
              </span>
            </div>
          </button>

          {/* GitHub Pages Deploy button */}
          <button
            onClick={() => setDeployModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
            title="Guide de publication GitHub Pages"
          >
            <Github className="w-3.5 h-3.5 text-amber-400" />
            <span>Déployer (GitHub)</span>
          </button>
        </div>
      </div>

      <GitHubDeployModal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
      />

      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 py-1.5">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
