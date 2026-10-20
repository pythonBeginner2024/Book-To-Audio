import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookSection } from '../types';
import { splitSection, mergeSections } from '../services/segmenter';
import { 
  FileText, 
  ArrowRight, 
  Split, 
  Merge, 
  Edit2, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  CheckSquare, 
  Square,
  Eye,
  Info
} from 'lucide-react';

export const BookOutlineView: React.FC = () => {
  const { 
    currentProject, 
    saveProject, 
    setActiveView, 
    setSelectedSectionId, 
    addToast 
  } = useApp();

  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [previewSectionId, setPreviewSectionId] = useState<string | null>(null);

  if (!currentProject) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm mb-4">Aucun livre sélectionné.</p>
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

  const handleStartEdit = (section: BookSection) => {
    setEditingTitleId(section.id);
    setEditedTitle(section.title);
  };

  const handleSaveEdit = async (sectionId: string) => {
    if (!editedTitle.trim()) return;
    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, title: editedTitle.trim() };
      }
      return s;
    });

    await saveProject({ ...currentProject, sections: updated });
    setEditingTitleId(null);
  };

  const handleToggleSelect = async (sectionId: string) => {
    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, selectedForBatch: !s.selectedForBatch };
      }
      return s;
    });
    await saveProject({ ...currentProject, sections: updated });
  };

  const handleSelectAll = async (select: boolean) => {
    const updated = sections.map((s) => ({ ...s, selectedForBatch: select }));
    await saveProject({ ...currentProject, sections: updated });
  };

  const handleSplit = async (section: BookSection) => {
    if (section.pageStart >= section.pageEnd) {
      addToast({
        type: 'warning',
        message: 'Impossible de diviser une section qui ne couvre qu’une seule page.',
      });
      return;
    }

    const midPage = Math.floor((section.pageStart + section.pageEnd) / 2);
    const [part1, part2] = splitSection(section, midPage, currentProject.extractedPages);

    const index = sections.findIndex((s) => s.id === section.id);
    const newSections = [...sections];
    newSections.splice(index, 1, part1, part2);

    // Re-index
    newSections.forEach((s, idx) => {
      s.orderIndex = idx + 1;
    });

    await saveProject({ ...currentProject, sections: newSections });
    addToast({
      type: 'success',
      message: `Section scindée en deux (p.${part1.pageStart}-${part1.pageEnd} et p.${part2.pageStart}-${part2.pageEnd}).`,
    });
  };

  const handleMergeNext = async (index: number) => {
    if (index >= sections.length - 1) return;
    const s1 = sections[index];
    const s2 = sections[index + 1];

    const merged = mergeSections(s1, s2);
    const newSections = [...sections];
    newSections.splice(index, 2, merged);

    newSections.forEach((s, idx) => {
      s.orderIndex = idx + 1;
    });

    await saveProject({ ...currentProject, sections: newSections });
    addToast({
      type: 'info',
      message: `Sections fusionnées sous : "${merged.title}".`,
    });
  };

  const handleGoToStudio = (sectionId?: string) => {
    if (sectionId) {
      setSelectedSectionId(sectionId);
    } else if (sections.length > 0) {
      setSelectedSectionId(sections[0].id);
    }
    setActiveView('studio');
  };

  const previewSection = sections.find((s) => s.id === previewSectionId);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📖</span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Plan et découpage du livre
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            {currentProject.title} • {sections.length} sections définies ({currentProject.totalPages} pages au total)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSelectAll(true)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Tout sélectionner
          </button>
          <span>•</span>
          <button
            onClick={() => handleSelectAll(false)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Tout désélectionner
          </button>
          <button
            onClick={() => handleGoToStudio()}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 ml-2"
          >
            <span>Rédiger les résumés</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0" />
        <p>
          Chaque section correspond à un chapitre ou passage thématique qui fera l'objet d'un script explicatif dédié et d'un fichier audio séparé. Vous pouvez modifier les titres, fusionner ou scinder des passages à tout moment.
        </p>
      </div>

      {/* Sections Table / Cards */}
      <div className="space-y-3">
        {sections.map((section, idx) => {
          const isOversized = section.charCount > 25000;
          const isSelected = section.selectedForBatch;

          return (
            <div
              key={section.id}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Checkbox & Order & Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggleSelect(section.id)}
                    className="text-slate-400 hover:text-amber-400 transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <span className="w-6 text-xs font-mono font-bold text-slate-400 shrink-0">
                    #{section.orderIndex}
                  </span>

                  {editingTitleId === section.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="flex-1 bg-slate-950 border border-amber-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(section.id)}
                        className="p-1 rounded bg-amber-400 text-slate-950"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h3
                        onClick={() => handleGoToStudio(section.id)}
                        className="text-xs font-bold text-white hover:text-amber-300 transition-colors cursor-pointer truncate"
                      >
                        {section.title}
                      </h3>
                      <button
                        onClick={() => handleStartEdit(section)}
                        className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                        title="Modifier le titre"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Center / Stats: Pages, Chars, Oversize warning */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                  <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    p.{section.pageStart} à {section.pageEnd}
                  </span>

                  <span className="font-mono">
                    {section.charCount.toLocaleString('fr-FR')} car.
                  </span>

                  {isOversized && (
                    <span
                      className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-[10px]"
                      title="Section volumineuse (> 25k car.). Nous recommandons de la scinder."
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Volumineux
                    </span>
                  )}

                  {/* Status badge */}
                  {section.humanValidated ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      Validé
                    </span>
                  ) : section.oralScript ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                      Script prêt
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                      À traiter
                    </span>
                  )}
                </div>

                {/* Right: Actions (Split, Merge, Preview, Studio) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setPreviewSectionId(previewSectionId === section.id ? null : section.id)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Aperçu du texte source"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleSplit(section)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Scinder cette section en deux"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>

                  {idx < sections.length - 1 && (
                    <button
                      onClick={() => handleMergeNext(idx)}
                      className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Fusionner avec la section suivante"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleGoToStudio(section.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Résumer</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Collapsible raw text excerpt preview */}
              {previewSectionId === section.id && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-serif max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {section.rawText.slice(0, 2000)}
                  {section.rawText.length > 2000 && (
                    <span className="italic text-slate-400">
                      {' '}... ({section.rawText.length - 2000} autres caractères)
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
