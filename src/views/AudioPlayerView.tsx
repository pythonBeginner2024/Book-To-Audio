import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../services/db';
import { 
  createBookAudioZip, 
  downloadBlob, 
  downloadText, 
  formatDuration 
} from '../services/zip';
import { 
  Play, 
  Pause, 
  Download, 
  FolderArchive, 
  FileText, 
  Headphones, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { BookSection } from '../types';

export const AudioPlayerView: React.FC = () => {
  const { 
    currentProject, 
    playback, 
    playSectionAudio, 
    pauseAudio, 
    resumeAudio, 
    setActiveView,
    addToast 
  } = useApp();

  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });
  const [includeScriptsInZip, setIncludeScriptsInZip] = useState(true);

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
  const readyAudios = sections.filter((s) => s.audioBlobId);
  const totalDurationSeconds = readyAudios.reduce((acc, s) => acc + (s.audioDurationSeconds || 0), 0);

  const handleDownloadSingleAudio = async (section: BookSection) => {
    if (!section.audioBlobId) return;
    try {
      const blob = await dbService.getAudioBlob(section.audioBlobId);
      if (!blob) throw new Error("Fichier introuvable.");

      const filename = `${String(section.orderIndex).padStart(2, '0')}-${section.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.wav`;
      downloadBlob(blob, filename);
      addToast({ type: 'success', message: `Téléchargement de ${filename}` });
    } catch (err: any) {
      addToast({ type: 'error', message: err.message });
    }
  };

  const handleDownloadSingleScript = (section: BookSection) => {
    if (!section.oralScript) return;
    const filename = `${String(section.orderIndex).padStart(2, '0')}-${section.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.txt`;
    downloadText(section.oralScript, filename);
    addToast({ type: 'info', message: `Téléchargement du script ${filename}` });
  };

  const handleDownloadAllZip = async () => {
    if (readyAudios.length === 0) {
      addToast({
        type: 'warning',
        message: "Aucun fichier audio disponible pour générer l'archive ZIP.",
      });
      return;
    }

    setIsCreatingZip(true);
    setZipProgress({ percent: 0, status: 'Préparation des fichiers...' });

    try {
      const zipBlob = await createBookAudioZip(currentProject, {
        includeScripts: includeScriptsInZip,
        onProgress: (percent, status) => {
          setZipProgress({ percent, status });
        },
      });

      const zipName = `${currentProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-audio.zip`;
      downloadBlob(zipBlob, zipName);

      addToast({
        type: 'success',
        title: 'Archive ZIP créée !',
        message: `L'archive ${zipName} a été téléchargée avec succès.`,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: "Échec de création du ZIP",
        message: err.message || 'Impossible de créer le fichier ZIP.',
      });
    } finally {
      setIsCreatingZip(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header Overview */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Headphones className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Lecteur & Téléchargements
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            {currentProject.title} {currentProject.author ? `• Par ${currentProject.author}` : ''}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-300 mt-3">
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Durée totale : {formatDuration(totalDurationSeconds)}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {readyAudios.length} / {sections.length} audios prêts
            </span>
            <span>•</span>
            <span className="font-mono text-slate-400">
              Format : WAV PCM 24kHz
            </span>
          </div>
        </div>

        {/* Big ZIP Download CTA */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScriptsInZip}
                onChange={(e) => setIncludeScriptsInZip(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-0"
              />
              <span>Inclure les scripts (.txt)</span>
            </label>
          </div>

          <button
            onClick={handleDownloadAllZip}
            disabled={isCreatingZip || readyAudios.length === 0}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {isCreatingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compression ({zipProgress.percent}%)...</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-4 h-4" />
                <span>Télécharger tout en ZIP ({readyAudios.length} audios)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ZIP progress message */}
      {isCreatingZip && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300 space-y-2">
          <div className="flex justify-between font-mono">
            <span>{zipProgress.status}</span>
            <span>{zipProgress.percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${zipProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Playlist tracks */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Pistes audio du livre
        </h3>

        {sections.map((section, idx) => {
          const hasAudio = !!section.audioBlobId;
          const isCurrentPlaying = playback.sectionId === section.id && playback.isPlaying;
          const isCurrentSelected = playback.sectionId === section.id;

          return (
            <div
              key={section.id}
              className={`p-4 rounded-xl border transition-all ${
                isCurrentSelected
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : hasAudio
                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Play button & Track Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {hasAudio ? (
                    <button
                      onClick={() => {
                        if (isCurrentPlaying) {
                          pauseAudio();
                        } else if (isCurrentSelected) {
                          resumeAudio();
                        } else {
                          playSectionAudio(section);
                        }
                      }}
                      className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0 transition-transform active:scale-95"
                    >
                      {isCurrentPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-mono shrink-0">
                      #{idx + 1}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {String(idx + 1).padStart(2, '0')}. {section.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Pages {section.pageStart} à {section.pageEnd}</span>
                      <span>•</span>
                      <span>Voix : {section.audioVoice || 'Kore'}</span>
                      {hasAudio && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-amber-400 font-semibold">
                            {formatDuration(section.audioDurationSeconds || 0)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {section.oralScript && (
                    <button
                      onClick={() => handleDownloadSingleScript(section)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1.5"
                      title="Télécharger le script en .txt"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Script .txt</span>
                    </button>
                  )}

                  {hasAudio ? (
                    <button
                      onClick={() => handleDownloadSingleAudio(section)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      title="Télécharger ce fichier WAV"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>WAV</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveView('audio')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Générer</span>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
