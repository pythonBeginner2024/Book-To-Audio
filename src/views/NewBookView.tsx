import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { extractPdfText, PdfExtractionResult } from '../services/pdf';
import { autoSegmentBook } from '../services/segmenter';
import { BookProject } from '../types';
import { 
  UploadCloud, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Loader2, 
  BookOpen, 
  FileQuestion,
  Eye
} from 'lucide-react';

export const NewBookView: React.FC = () => {
  const { saveProject, setActiveView, addToast } = useApp();

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; percent: number }>({
    current: 0,
    total: 0,
    percent: 0,
  });
  const [extractionResult, setExtractionResult] = useState<PdfExtractionResult | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      addToast({
        type: 'error',
        title: 'Format non supporté',
        message: 'Veuillez sélectionner un fichier au format PDF (.pdf).',
      });
      return;
    }

    setFile(selectedFile);
    // Derive initial clean title from filename
    const cleanName = selectedFile.name
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    setBookTitle(cleanName);

    setIsExtracting(true);
    setProgress({ current: 0, total: 0, percent: 0 });
    setExtractionResult(null);

    try {
      const result = await extractPdfText(selectedFile, (current, total) => {
        setProgress({
          current,
          total,
          percent: Math.round((current / total) * 100),
        });
      });

      setExtractionResult(result);
      if (result.extractedPages.length > 0) {
        setSelectedPreviewPage(1);
      }

      if (result.isScannedOrInsufficient) {
        addToast({
          type: 'warning',
          title: 'Texte insuffisant détecté',
          message: 'Ce PDF semble contenir principalement des images sans couche de texte sélectionnable.',
          durationMs: 8000,
        });
      } else {
        addToast({
          type: 'success',
          title: 'Extraction réussie',
          message: `${result.totalPages} pages traitées localement (${result.totalChars.toLocaleString('fr-FR')} caractères).`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: "Échec de l'extraction",
        message: err.message || 'Impossible de lire le fichier PDF.',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!extractionResult || !file) return;

    if (extractionResult.isScannedOrInsufficient) {
      const confirmContinue = window.confirm(
        "Ce PDF contient très peu de texte extractible. La génération de résumés risque d'être incomplète ou vide. Souhaitez-vous quand même continuer ?"
      );
      if (!confirmContinue) return;
    }

    const sections = autoSegmentBook(extractionResult.extractedPages);

    const newProject: BookProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: bookTitle.trim() || extractionResult.filename,
      author: bookAuthor.trim() || undefined,
      filename: extractionResult.filename,
      fileSizeBytes: extractionResult.fileSizeBytes,
      totalPages: extractionResult.totalPages,
      extractedPages: extractionResult.extractedPages,
      sections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consentGivenForExternalAi: false,
      targetVoice: 'Kore',
      speakingSpeedWordsPerMinute: 140,
      textModelPreference: 'gemini-3.8-flash',
      audioModelPreference: 'gemini-3.8-flash-lite-tts',
    };

    await saveProject(newProject);

    addToast({
      type: 'success',
      title: 'Livre importé !',
      message: `${sections.length} sections détectées. Vous pouvez maintenant ajuster le plan.`,
    });

    setActiveView('sections');
  };

  const currentPreview = extractionResult?.extractedPages.find(
    (p) => p.pageNumber === selectedPreviewPage
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Importer un livre PDF</h1>
        <p className="text-xs text-slate-400 mt-1">
          L'extraction s'effectue intégralement dans votre navigateur sans serveur distant.
        </p>
      </div>

      {/* Upload Zone */}
      {!extractionResult && !isExtracting && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            Glissez-déposez votre livre PDF ici
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
            Ou cliquez pour parcourir les fichiers de votre ordinateur. Les livres au format PDF texte natif sont recommandés.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 font-medium">
            <span>Traitement 100% local</span>
            <span>•</span>
            <span>Sécurisé</span>
            <span>•</span>
            <span>Pas d'envoi distant</span>
          </div>
        </div>
      )}

      {/* Extraction in progress */}
      {isExtracting && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Extraction du texte en cours...
            </h3>
            <p className="text-xs text-slate-400">
              Analyse locale des pages via PDF.js ({progress.current} / {progress.total} pages traitées)
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{file?.name}</span>
              <span>{progress.percent}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Result & Configuration */}
      {extractionResult && (
        <div className="space-y-6">
          {/* Status banner */}
          {extractionResult.isScannedOrInsufficient ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-bold text-rose-200">Avertissement : Texte extractible très limité</h4>
                <p className="text-slate-300 leading-relaxed">
                  {extractionResult.warningMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <h4 className="font-bold text-emerald-200">Extraction réussie</h4>
                <p className="text-slate-300">
                  {extractionResult.totalPages} pages extraites avec succès ({extractionResult.totalChars.toLocaleString('fr-FR')} caractères détectés).
                </p>
              </div>
            </div>
          )}

          {/* Book Metadata Form */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Informations du livre
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Titre du livre *
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Ex : Sapiens, Pensées pour moi-même..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Auteur (facultatif)
                </label>
                <input
                  type="text"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  placeholder="Ex : Yuval Noah Harari..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Fichier : {extractionResult.filename}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {extractionResult.totalPages} pages
              </span>
              <span>•</span>
              <span>
                Taille : {(extractionResult.fileSizeBytes / (1024 * 1024)).toFixed(1)} Mo
              </span>
            </div>
          </div>

          {/* Extracted Pages Inspector & Preview */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                Vérification du texte extrait par page
              </h3>
              <span className="text-xs text-slate-400">
                Page {selectedPreviewPage || 1} sur {extractionResult.totalPages}
              </span>
            </div>

            {/* Page selection pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-thin">
              {extractionResult.extractedPages.map((p) => {
                const isSelected = selectedPreviewPage === p.pageNumber;
                return (
                  <button
                    key={p.pageNumber}
                    onClick={() => setSelectedPreviewPage(p.pageNumber)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : p.hasInsufficientText
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                    title={p.hasInsufficientText ? 'Texte faible sur cette page' : `${p.charCount} caractères`}
                  >
                    p.{p.pageNumber}
                  </button>
                );
              })}
            </div>

            {/* Text excerpt view */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-h-60 overflow-y-auto font-serif text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {currentPreview ? (
                currentPreview.text.trim().length > 0 ? (
                  currentPreview.text
                ) : (
                  <span className="italic text-slate-400">Page vide ou non textuelle.</span>
                )
              ) : (
                <span className="italic text-slate-400">Sélectionnez une page pour prévisualiser.</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => {
                setExtractionResult(null);
                setFile(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Changer de fichier
            </button>

            <button
              onClick={handleCreateProject}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <span>Valider et configurer le plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
