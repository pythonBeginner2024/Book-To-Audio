import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Volume2, 
  X,
  Gauge
} from 'lucide-react';
import { formatDuration } from '../services/zip';

export const GlobalAudioBar: React.FC = () => {
  const { 
    playback, 
    pauseAudio, 
    resumeAudio, 
    seekAudio, 
    setPlaybackRate,
    currentProject 
  } = useApp();

  if (!playback.sectionId || !playback.audioBlobUrl) {
    return null;
  }

  const rates = [0.8, 1.0, 1.25, 1.5, 2.0];

  const handleDownloadCurrent = () => {
    if (!playback.audioBlobUrl) return;
    const a = document.createElement('a');
    a.href = playback.audioBlobUrl;
    a.download = `${playback.sectionTitle || 'section-audio'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const jump = (delta: number) => {
    const newTime = Math.max(0, Math.min(playback.duration, playback.currentTime + delta));
    seekAudio(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-amber-500/30 shadow-2xl px-4 py-3 text-slate-100">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 w-full md:w-1/4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate">
              {playback.sectionTitle}
            </h4>
            <p className="text-[11px] text-amber-300/80 truncate">
              {currentProject?.title || 'Livre audio'}
            </p>
          </div>
        </div>

        {/* Center Controls & Progress Bar */}
        <div className="flex-1 w-full max-w-2xl flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => jump(-10)}
              title="Reculer de 10 secondes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={playback.isPlaying ? pauseAudio : resumeAudio}
              className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
            >
              {playback.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => jump(10)}
              title="Avancer de 10 secondes"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber slider */}
          <div className="w-full flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span>{formatDuration(Math.floor(playback.currentTime))}</span>
            <input
              type="range"
              min={0}
              max={playback.duration || 100}
              step={0.1}
              value={playback.currentTime}
              onChange={(e) => seekAudio(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            <span>{formatDuration(Math.floor(playback.duration))}</span>
          </div>
        </div>

        {/* Right: Speed & Download */}
        <div className="flex items-center justify-end gap-2 w-full md:w-1/4">
          {/* Speed selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {rates.map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                  playback.playbackRate === rate
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Download button */}
          <button
            onClick={handleDownloadCurrent}
            title="Télécharger ce fichier WAV"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
