import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpen, 
  PlusCircle, 
  Sparkles, 
  Headphones, 
  ArrowRight, 
  Trash2, 
  Calendar, 
  FileCheck, 
  Layers,
  Key,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { BookProject } from '../types';

export const DashboardView: React.FC = () => {
  const {
    projects,
    currentProject,
    setCurrentProjectById,
    setActiveView,
    deleteProject,
    activeTextKey,
    activeAudioKey,
  } = useApp();

  const handleOpenProject = async (proj: BookProject) => {
    await setCurrentProjectById(proj.id);
    // Find next logical step
    const hasUnfinishedSummaries = proj.sections.some((s) => !s.humanValidated);
    const hasUnfinishedAudio = proj.sections.some((s) => s.humanValidated && !s.audioBlobId);

    if (proj.sections.length === 0) {
      setActiveView('sections');
    } else if (hasUnfinishedSummaries) {
      setActiveView('studio');
    } else if (hasUnfinishedAudio) {
      setActiveView('audio');
    } else {
      setActiveView('player');
    }
  };

  const calculateProgress = (proj: BookProject) => {
    if (!proj.sections || proj.sections.length === 0) return 0;
    const total = proj.sections.length;
    // Each section has 2 main milestones: validated summary (50%) + audio generated (50%)
    let points = 0;
    proj.sections.forEach((s) => {
      if (s.humanValidated) points += 0.5;
      if (s.status === 'termine' || s.audioBlobId) points += 0.5;
    });
    return Math.round((points / total) * 100);
  };

  const hasKeys = !!activeTextKey?.key && !!activeAudioKey?.key;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Pédagogique Sans Serveur</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Transformez vos livres PDF en résumés audio captivants.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Extraction 100% locale par PDF.js, découpage intelligent en chapitres, 
            inventaire des idées maîtresses, scripts oraux pédagogiques avec vérification de couverture, 
            et génération de podcasts via l'API Google Gemini.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveView('new-book')}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Importer un livre PDF
            </button>
            <button
              onClick={() => setActiveView('api-keys')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors flex items-center gap-2 border border-slate-700"
            >
              <Key className="w-4 h-4 text-amber-400" />
              Gérer les clés API
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
      </div>

      {/* Security & Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              100% Local & Privé
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Le PDF d'origine reste sur votre machine. Aucun OCR distant, aucune base tierce, stockage dans IndexedDB.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              Contrôle Pédagogique
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inventaire méthodique des idées (thèses, arguments, exemples), rapport de couverture et validation humaine.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              Prêt pour GitHub Pages
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Application statique sans serveur Node.js en production, téléchargeable en ZIP et hébergeable gratuitement.
            </p>
          </div>
        </div>
      </div>

      {/* API Key Warning if not configured */}
      {!hasKeys && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-200">
                Configurez vos clés Google AI Studio
              </h4>
              <p className="text-xs text-slate-300">
                Vous avez besoin d'au moins une clé API Gemini pour l'analyse des textes et la génération des audios.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('api-keys')}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            Configurer maintenant
          </button>
        </div>
      )}

      {/* Projects List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Vos livres en cours</h2>
            <p className="text-xs text-slate-400">
              {projects.length} projet{projects.length > 1 ? 's' : ''} enregistré{projects.length > 1 ? 's' : ''} localement
            </p>
          </div>
          {projects.length > 0 && (
            <button
              onClick={() => setActiveView('new-book')}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Ajouter un livre
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          /* Empty state */
          <div className="border border-dashed border-slate-800 rounded-2xl p-12 text-center bg-slate-900/30">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Aucun livre importé pour l'instant</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Glissez-déposez votre premier livre au format PDF pour extraire son contenu, structurer ses chapitres et concevoir votre résumé audio.
            </p>
            <button
              onClick={() => setActiveView('new-book')}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Importer mon premier livre PDF
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const progress = calculateProgress(proj);
              const validatedCount = proj.sections.filter((s) => s.humanValidated).length;
              const audioCount = proj.sections.filter((s) => s.audioBlobId).length;
              const isSelected = currentProject?.id === proj.id;

              return (
                <div
                  key={proj.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-900/90 border-amber-500/40 shadow-xl shadow-amber-500/5'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📖</span>
                        <h3 className="font-bold text-base text-white truncate hover:text-amber-300 transition-colors">
                          {proj.title}
                        </h3>
                      </div>
                      {proj.author && (
                        <p className="text-xs text-slate-400 truncate mb-1">
                          Par {proj.author}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {proj.totalPages} pages
                        </span>
                        <span>•</span>
                        <span>{proj.sections.length} sections</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(proj.updatedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm(`Supprimer définitivement "${proj.title}" et tous ses audios locaux ?`)) {
                          deleteProject(proj.id);
                        }
                      }}
                      title="Supprimer ce projet"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Progression globale</span>
                      <span className="font-semibold text-amber-400">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Section & Audio counters */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Scripts validés
                      </span>
                      <span className="font-bold text-white">
                        {validatedCount} / {proj.sections.length}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Headphones className="w-3.5 h-3.5 text-sky-400" />
                        Audios prêts
                      </span>
                      <span className="font-bold text-white">
                        {audioCount} / {proj.sections.length}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => handleOpenProject(proj)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-amber-400 shadow-sm"
                  >
                    <span>Continuer le livre</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
