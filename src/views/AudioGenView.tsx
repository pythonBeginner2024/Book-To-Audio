import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { generateSpeechAudio } from '../services/gemini';
import { dbService } from '../services/db';
import { BookSection } from '../types';
import { 
  Volume2, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Download, 
  Sparkles,
  Settings,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { formatDuration } from '../services/zip';

export const AudioGenView: React.FC = () => {
  const {
    currentProject,
    saveProject,
    updateCurrentSection,
    activeAudioKey,
    requireConsentForAi,
    setActiveView,
    playSectionAudio,
    addToast,
  } = useApp();

  const [selectedVoice, setSelectedVoice] = useState(currentProject?.targetVoice || 'Kore');
  const [selectedModel, setSelectedModel] = useState(currentProject?.audioModelPreference || 'gemini-3.8-flash-lite-tts');
  const [speechStyle, setSpeechStyle] = useState('Pédagogique, clair, posé et chaleureux en français');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [currentGeneratingSectionId, setCurrentGeneratingSectionId] = useState<string | null>(null);
  const [cancelRequested, setCancelRequested] = useState(false);

  if (!currentProject) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm mb-4">Aucun projet sélectionné.</p>
        <button
          onClick={() => setActiveView('new-book')}
          className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
        >
          Importer un livre PDF
        </button>
      </div>
    );
  }

  const sections = currentProject.sections || [];
  const validatedSections = sections.filter((s) => s.humanValidated && s.oralScript);
  const pendingValidationCount = sections.filter((s) => !s.humanValidated).length;
  const readyAudiosCount = sections.filter((s) => s.audioBlobId).length;

  const voices = [
    { id: 'Kore', label: 'Kore (Recommandé)', desc: 'Voix claire, posée, neutre et pédagogique' },
    { id: 'Puck', label: 'Puck', desc: 'Voix énergique, vive et chaleureuse' },
    { id: 'Charon', label: 'Charon', desc: 'Voix grave, posée et académique' },
    { id: 'Fenrir', label: 'Fenrir', desc: 'Voix profonde et calme' },
    { id: 'Zephyr', label: 'Zephyr', desc: 'Voix fluide, articulée et moderne' },
    { id: 'Aoede', label: 'Aoede', desc: 'Voix douce, narrative et mélodieuse' },
  ];

  const checkAudioKey = (): string | null => {
    if (!activeAudioKey?.key) {
      addToast({
        type: 'warning',
        title: 'Clé API Audio requise',
        message: 'Veuillez configurer une clé API pour la génération audio dans les Paramètres API.',
      });
      setActiveView('api-keys');
      return null;
    }
    return activeAudioKey.key;
  };

  // Generate audio for a single section
  const handleGenerateSingle = async (section: BookSection) => {
    const key = checkAudioKey();
    if (!key) return;

    if (!section.oralScript) {
      addToast({
        type: 'error',
        message: 'Le script de cette section est vide.',
      });
      return;
    }

    const scriptText = section.oralScript;

    requireConsentForAi(async () => {
      setCurrentGeneratingSectionId(section.id);
      try {
        await updateCurrentSection(section.id, { status: 'audio_en_cours' });

        const result = await generateSpeechAudio(key, scriptText, {
          model: selectedModel,
          voiceName: selectedVoice,
          speechStyle,
        });

        // Store blob in IndexedDB
        const blobId = `audio_${section.id}_${Date.now()}`;
        await dbService.saveAudioBlob(blobId, result.audioBlob);

        await updateCurrentSection(section.id, {
          audioBlobId: blobId,
          audioDurationSeconds: result.durationSeconds,
          audioMimeType: 'audio/wav',
          audioVoice: selectedVoice,
          audioCreatedAt: new Date().toISOString(),
          status: 'termine',
        });

        addToast({
          type: 'success',
          title: 'Audio généré avec succès !',
          message: `${section.title} (${formatDuration(result.durationSeconds)}, format WAV 24kHz).`,
        });
      } catch (err: any) {
        await updateCurrentSection(section.id, {
          status: 'echec',
          lastError: err.userMessage || err.message,
        });
        addToast({
          type: 'error',
          title: 'Échec génération audio',
          message: err.userMessage || err.message,
        });
      } finally {
        setCurrentGeneratingSectionId(null);
      }
    });
  };

  // Batch generation for all validated sections that don't have audio yet
  const handleBatchGenerate = async () => {
    const key = checkAudioKey();
    if (!key) return;

    const queue = validatedSections.filter((s) => !s.audioBlobId && s.selectedForBatch);
    if (queue.length === 0) {
      addToast({
        type: 'info',
        message: 'Toutes les sections sélectionnées possèdent déjà un fichier audio.',
      });
      return;
    }

    requireConsentForAi(async () => {
      setIsGeneratingBatch(true);
      setCancelRequested(false);

      for (let i = 0; i < queue.length; i++) {
        if (cancelRequested) {
          addToast({ type: 'info', message: 'Génération par lot interrompue.' });
          break;
        }

        const section = queue[i];
        setCurrentGeneratingSectionId(section.id);

        try {
          await updateCurrentSection(section.id, { status: 'audio_en_cours' });
          const result = await generateSpeechAudio(key, section.oralScript!, {
            model: selectedModel,
            voiceName: selectedVoice,
            speechStyle,
          });

          const blobId = `audio_${section.id}_${Date.now()}`;
          await dbService.saveAudioBlob(blobId, result.audioBlob);

          await updateCurrentSection(section.id, {
            audioBlobId: blobId,
            audioDurationSeconds: result.durationSeconds,
            audioMimeType: 'audio/wav',
            audioVoice: selectedVoice,
            audioCreatedAt: new Date().toISOString(),
            status: 'termine',
          });
        } catch (err: any) {
          await updateCurrentSection(section.id, {
            status: 'echec',
            lastError: err.userMessage || err.message,
          });
          // Stop batch on quota or auth failure
          if (err.httpStatus === 429 || err.httpStatus === 400 || err.httpStatus === 403) {
            addToast({
              type: 'error',
              title: 'Interruption du lot',
              message: err.userMessage || err.message,
            });
            break;
          }
        }
      }

      setIsGeneratingBatch(false);
      setCurrentGeneratingSectionId(null);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Génération audio (Text-to-Speech)
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            {readyAudiosCount} sur {sections.length} audios générés • Format WAV PCM 24kHz mono officiel Gemini
          </p>
        </div>

        <div className="flex items-center gap-3">
          {readyAudiosCount > 0 && (
            <button
              onClick={() => setActiveView('player')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-2 border border-slate-700"
            >
              <span>Accéder au lecteur & export ZIP</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {isGeneratingBatch ? (
            <button
              onClick={() => setCancelRequested(true)}
              className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-colors shadow-lg shadow-rose-500/20"
            >
              Arrêter la file
            </button>
          ) : (
            <button
              onClick={handleBatchGenerate}
              disabled={validatedSections.length === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>Générer les audios en attente</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice & Settings Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          Configuration de la voix & du modèle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Voice selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Voix Gemini officielle *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {voices.map((v) => {
                const isSelected = selectedVoice === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{v.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{v.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model & Style prompt */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Modèle audio Gemini *
              </label>
              <select
                aria-label="Sélectionner le modèle audio"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="gemini-3.8-flash-lite-tts">
                  gemini-3.8-flash-lite-tts (Recommandé — Rapide & optimisé)
                </option>
                <option value="gemini-3.8-flash-tts">
                  gemini-3.8-flash-tts (Expressif / Voice Design)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Consigne de style oral (speechMetadata)
              </label>
              <input
                type="text"
                value={speechStyle}
                onChange={(e) => setSpeechStyle(e.target.value)}
                placeholder="Ex : Pédagogique, clair, posé et chaleureux en français"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Validation alert if some sections are not validated yet */}
      {pendingValidationCount > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <FileCheck className="w-4 h-4 text-amber-400" />
            <span>
              {pendingValidationCount} section{pendingValidationCount > 1 ? 's' : ''} n'ont pas encore été validée{pendingValidationCount > 1 ? 's' : ''} dans le Studio.
            </span>
          </div>
          <button
            onClick={() => setActiveView('studio')}
            className="text-amber-400 hover:text-amber-300 font-semibold"
          >
            Aller valider les scripts →
          </button>
        </div>
      )}

      {/* Sections Queue */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          File de traitement par section
        </h3>

        {sections.map((section, idx) => {
          const isGeneratingThis = currentGeneratingSectionId === section.id;
          const hasAudio = !!section.audioBlobId;

          return (
            <div
              key={section.id}
              className={`p-4 rounded-xl border transition-all ${
                isGeneratingThis
                  ? 'bg-amber-950/20 border-amber-500/40 animate-pulse'
                  : hasAudio
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-slate-950 border-slate-900'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Title & info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-xs text-slate-400 font-bold shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {section.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Pages {section.pageStart} à {section.pageEnd}</span>
                      <span>•</span>
                      <span>
                        {section.oralScript
                          ? `${section.oralScript.split(/\s+/).filter(Boolean).length} mots`
                          : 'Pas de script'}
                      </span>
                      {section.humanValidated && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">Validé ✓</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & duration */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasAudio && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                      {formatDuration(section.audioDurationSeconds || 0)} (WAV)
                    </span>
                  )}

                  {section.status === 'echec' && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20" title={section.lastError}>
                      Échec
                    </span>
                  )}

                  {/* Actions */}
                  {hasAudio ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => playSectionAudio(section)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Écouter</span>
                      </button>

                      <button
                        onClick={() => handleGenerateSingle(section)}
                        disabled={isGeneratingThis}
                        title="Régénérer l'audio"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateSingle(section)}
                      disabled={isGeneratingThis || !section.humanValidated}
                      className={`px-3.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 ${
                        !section.humanValidated
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/10'
                      }`}
                    >
                      {isGeneratingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Génération...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Générer l'audio</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {section.lastError && (
                <div className="mt-2 text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                  {section.lastError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
