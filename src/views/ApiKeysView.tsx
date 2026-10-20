import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { keyManager, KeyManager } from '../services/keyManager';
import { KeyUsage, ApiKeyConfig } from '../types';
import { 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  Layers, 
  Loader2,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';

export const ApiKeysView: React.FC = () => {
  const { keys, activeTextKey, activeAudioKey, addToast } = useApp();

  // New key form state
  const [name, setName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [usage, setUsage] = useState<KeyUsage>('all_purpose');
  const [projectId, setProjectId] = useState('');
  const [saveOnDevice, setSaveOnDevice] = useState(false);
  const [showKeyString, setShowKeyString] = useState(false);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Security modal state
  const [securityWarningOpen, setSecurityWarningOpen] = useState(false);

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      addToast({ type: 'error', message: 'Veuillez saisir une clé API valide.' });
      return;
    }

    keyManager.addKey({
      name: name.trim() || 'Clé Gemini',
      key: apiKeyInput.trim(),
      usage,
      projectId: projectId.trim() || undefined,
      isSavedOnDevice: saveOnDevice,
    });

    addToast({
      type: 'success',
      title: 'Clé ajoutée',
      message: `La clé "${name.trim() || 'Clé Gemini'}" a été enregistrée.`,
    });

    setName('');
    setApiKeyInput('');
    setProjectId('');
    setSaveOnDevice(false);
  };

  const handleTestKey = async (id: string) => {
    setTestingKeyId(id);
    const result = await keyManager.testKey(id);
    setTestingKeyId(null);

    addToast({
      type: result.success ? 'success' : 'error',
      title: result.success ? 'Test réussi' : 'Échec du test',
      message: result.message,
    });
  };

  const handleDeleteKey = (keyConfig: ApiKeyConfig) => {
    const ok = window.confirm(
      `Êtes-vous sûr de vouloir supprimer la clé "${keyConfig.name}" ?`
    );
    if (ok) {
      keyManager.removeKey(keyConfig.id);
      addToast({
        type: 'info',
        message: `Clé "${keyConfig.name}" supprimée.`,
      });
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Gestion des clés API Google AI Studio
          </h1>
        </div>
        <p className="text-xs text-slate-400">
          Configurez vos clés Gemini pour séparer vos tâches, gérer vos quotas et contrôler vos accès.
        </p>
      </div>

      {/* Security Architecture & Transparency Callout */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-400">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-bold text-sm text-slate-200">
            Architecture de sécurité & modèle de confiance
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Cette application fonctionne comme un <strong>site statique sans serveur personnel</strong> (compatible GitHub Pages).
          Vos requêtes Gemini partent directement depuis votre navigateur vers les serveurs officiels de Google AI Studio via HTTPS.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 pt-1">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">Stockage par défaut en mémoire</span>
            Par défaut, vos clés sont conservées uniquement dans la mémoire vive (RAM) de votre session et s'effacent à la fermeture de l'onglet.
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-1">Stockage local facultatif</span>
            L'option « Enregistrer sur cet appareil » place la clé dans le localStorage de votre navigateur. N'utilisez cette option que sur votre machine personnelle.
          </div>
        </div>
      </div>

      {/* Active Key Assignments */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-400" />
          Sélection manuelle des clés par usage
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Text Analysis Key Selector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Analyse & Rédaction de scripts
              </span>
              {activeTextKey ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                  Configurée
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">
                  Manquante
                </span>
              )}
            </div>
            <select
              aria-label="Sélectionner la clé pour l'analyse et rédaction"
              value={activeTextKey?.id || ''}
              onChange={(e) => keyManager.setActiveTextKey(e.target.value || null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">-- Choisir une clé pour l'analyse --</option>
              {keys
                .filter((k) => k.usage === 'analysis_and_writing' || k.usage === 'all_purpose')
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({KeyManager.maskKey(k.key)})
                  </option>
                ))}
            </select>
          </div>

          {/* Audio Key Selector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                Génération Audio (TTS)
              </span>
              {activeAudioKey ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                  Configurée
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">
                  Manquante
                </span>
              )}
            </div>
            <select
              aria-label="Sélectionner la clé pour la génération audio"
              value={activeAudioKey?.id || ''}
              onChange={(e) => keyManager.setActiveAudioKey(e.target.value || null)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="">-- Choisir une clé pour l'audio --</option>
              {keys
                .filter((k) => k.usage === 'audio_generation' || k.usage === 'all_purpose')
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({KeyManager.maskKey(k.key)})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Add New Key Form */}
      <form onSubmit={handleAddKey} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-400" />
          Ajouter une clé Google AI Studio
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nom personnalisé *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Gemini — Analyse & Scripts"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catégorie d'usage *
            </label>
            <select
              aria-label="Sélectionner la catégorie d'usage de la clé"
              value={usage}
              onChange={(e) => setUsage(e.target.value as KeyUsage)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            >
              <option value="all_purpose">Polyvalente (Texte et Audio)</option>
              <option value="analysis_and_writing">Analyse et rédaction uniquement</option>
              <option value="audio_generation">Génération audio (TTS) uniquement</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Clé API Gemini (AIzaSy...) *
            </label>
            <div className="relative">
              <input
                type={showKeyString ? 'text' : 'password'}
                required
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKeyString(!showKeyString)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKeyString ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Identifiant de projet GCP (facultatif)
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Ex : my-gemini-project-1234"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Save on device toggle */}
        <div className="flex items-center justify-between pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={saveOnDevice}
              onChange={(e) => {
                if (e.target.checked) {
                  setSecurityWarningOpen(true);
                } else {
                  setSaveOnDevice(false);
                }
              }}
              className="rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-0"
            />
            <span>Enregistrer cette clé sur cet appareil (localStorage)</span>
          </label>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter la clé</span>
          </button>
        </div>
      </form>

      {/* Security Warning Modal when user checks save on device */}
      {securityWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-white">Avertissement de sécurité local</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              En cochant cette option, la clé API sera stockée en texte clair dans le <code>localStorage</code> de votre navigateur web.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Toute personne ayant accès à votre session sur cette machine ou une extension malveillante exécutée dans ce navigateur pourrait y accéder. Ne cochez cette option que s'il s'agit d'un ordinateur personnel de confiance.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSaveOnDevice(false);
                  setSecurityWarningOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setSaveOnDevice(true);
                  setSecurityWarningOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg"
              >
                J'ai compris, enregistrer localement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configured Keys List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Clés configurées ({keys.length})
          </h3>
          {keys.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Supprimer toutes les clés API de la session et de l’appareil ?')) {
                  keyManager.clearAllKeys();
                  addToast({ type: 'info', message: 'Toutes les clés ont été effacées.' });
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              Tout effacer
            </button>
          )}
        </div>

        {keys.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            Aucune clé API configurée. Ajoutez votre première clé Google AI Studio ci-dessus.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => {
              const isRevealed = revealedKeyIds[k.id];
              const isTesting = testingKeyId === k.id;

              return (
                <div
                  key={k.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate">{k.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {k.usage === 'all_purpose'
                          ? 'Polyvalente'
                          : k.usage === 'analysis_and_writing'
                          ? 'Texte & Scripts'
                          : 'Audio TTS'}
                      </span>
                      {k.isSavedOnDevice ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400">
                          Appareil
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          Session RAM
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span>{isRevealed ? k.key : KeyManager.maskKey(k.key)}</span>
                      <button
                        onClick={() => toggleReveal(k.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                        title={isRevealed ? 'Masquer la clé' : 'Afficher la clé'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {k.status === 'valid' && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Clé validée et connectée</span>
                      </div>
                    )}
                    {k.status === 'invalid' && (
                      <div className="text-[11px] text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{k.errorMessage || 'Échec du test de connexion'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTestKey(k.id)}
                      disabled={isTesting}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Test...</span>
                        </>
                      ) : (
                        <span>Tester la clé</span>
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteKey(k)}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Supprimer la clé"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
