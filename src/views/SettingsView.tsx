import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { 
  Settings, 
  HardDrive, 
  Download, 
  Upload, 
  Trash2, 
  Info, 
  ExternalLink, 
  BookOpen, 
  Gauge, 
  Cpu
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentProject, saveProject, addToast } = useApp();

  const [storageStats, setStorageStats] = useState<{
    usageBytes: number;
    quotaBytes: number;
    percentUsed: number;
  } | null>(null);

  const [speechSpeed, setSpeechSpeed] = useState(
    currentProject?.speakingSpeedWordsPerMinute || 140
  );

  const [textModel, setTextModel] = useState(
    currentProject?.textModelPreference || 'gemini-3.8-flash'
  );

  const [audioModel, setAudioModel] = useState(
    currentProject?.audioModelPreference || 'gemini-3.8-flash-lite-tts'
  );

  useEffect(() => {
    dbService.getStorageEstimate().then(setStorageStats);
  }, []);

  const handleSavePreferences = async () => {
    if (!currentProject) return;

    await saveProject({
      ...currentProject,
      speakingSpeedWordsPerMinute: Number(speechSpeed),
      textModelPreference: textModel,
      audioModelPreference: audioModel,
    });

    addToast({
      type: 'success',
      title: 'Paramètres mis à jour',
      message: 'Les préférences du projet ont été sauvegardées.',
    });
  };

  const handleExportProjectJson = () => {
    if (!currentProject) return;
    // Strip any raw text or sensitive info if needed, keeping structure, scripts, and idea inventories
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: {
        id: currentProject.id,
        title: currentProject.title,
        author: currentProject.author,
        filename: currentProject.filename,
        totalPages: currentProject.totalPages,
        sections: currentProject.sections.map((s) => ({
          orderIndex: s.orderIndex,
          title: s.title,
          pageStart: s.pageStart,
          pageEnd: s.pageEnd,
          status: s.status,
          humanValidated: s.humanValidated,
          ideaInventory: s.ideaInventory,
          oralScript: s.oralScript,
          coverageReport: s.coverageReport,
          audioDurationSeconds: s.audioDurationSeconds,
          audioVoice: s.audioVoice,
        })),
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-sauvegarde.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      type: 'info',
      message: 'Exportation JSON générée sans clé API.',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Mo';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} Mo`;
    return `${(mb / 1024).toFixed(2)} Go`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Paramètres & Stockage local
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Gestion de l'espace disque IndexedDB, vitesse d'élocution et exportations.
        </p>
      </div>

      {/* Storage Estimate */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          Espace de stockage local (IndexedDB)
        </h3>

        {storageStats ? (
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Utilisé : <strong>{formatBytes(storageStats.usageBytes)}</strong> sur {formatBytes(storageStats.quotaBytes)} alloués
              </span>
              <span className="font-mono text-amber-400 font-semibold">
                {storageStats.percentUsed.toFixed(1)}%
              </span>
            </div>

            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(1, storageStats.percentUsed)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Vos livres, scripts et fichiers audio WAV 24kHz sont conservés localement dans la base IndexedDB de votre navigateur. Aucune donnée n'est stockée sur un serveur tiers.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            L'estimation du quota n'est pas supportée par ce navigateur.
          </p>
        )}
      </div>

      {/* Preferences Form */}
      {currentProject && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            Préférences du projet actif ({currentProject.title})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                Vitesse de lecture orale (mots par minute)
              </label>
              <input
                type="number"
                min="100"
                max="220"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard recommandé en français : 130 à 150 mots/minute.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Modèle d'analyse textuelle
              </label>
              <select
                aria-label="Sélectionner le modèle d'analyse textuelle"
                value={textModel}
                onChange={(e) => setTextModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="gemini-3.8-flash">
                  gemini-3.8-flash (Recommandé — Rapide et fidèle)
                </option>
                <option value="gemini-4-argon">
                  gemini-4-argon (Raisonnement complexe)
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSavePreferences}
              className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors"
            >
              Enregistrer les préférences
            </button>
          </div>
        </div>
      )}

      {/* Export / Backup Section */}
      {currentProject && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Sauvegarde du projet (Sans clé API)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Exportez l'ensemble du plan, des inventaires d'idées et des scripts oraux rédigés au format JSON. Ce fichier ne contient aucune clé secrète et peut être archivé ou partagé en toute sécurité.
          </p>
          <button
            onClick={handleExportProjectJson}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-2 border border-slate-700"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exporter le projet en JSON</span>
          </button>
        </div>
      )}

      {/* GitHub Pages Deployment Info */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-sky-400">
          <Info className="w-4 h-4" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Déploiement statique sur GitHub Pages
          </h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Le projet inclut un workflow GitHub Actions préconfiguré (<code>.github/workflows/deploy.yml</code>) et un fichier <code>README.md</code> détaillé expliquant comment héberger gratuitement cette application sur votre compte GitHub.
        </p>
        <p className="text-xs text-slate-400">
          Consultez le fichier <code>README.md</code> à la racine du dépôt pour le guide pas-à-pas de publication.
        </p>
      </div>
    </div>
  );
};
