import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  generateIdeaInventory, 
  generateOralScript, 
  verifyScriptCoverage, 
  refineScriptWithMissingItems 
} from '../services/gemini';
import { IdeaItem, CoverageReport } from '../types';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  FileCheck, 
  Wand2, 
  RefreshCw, 
  Eye, 
  Edit3, 
  FileText, 
  Check, 
  Volume2,
  AlertTriangle,
  Lightbulb,
  BookOpen
} from 'lucide-react';

export const SummaryStudioView: React.FC = () => {
  const { 
    currentProject, 
    selectedSectionId, 
    setSelectedSectionId, 
    updateCurrentSection, 
    activeTextKey, 
    requireConsentForAi, 
    setActiveView, 
    addToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'script' | 'inventory' | 'coverage' | 'source'>('script');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [scriptDraft, setScriptDraft] = useState<string>('');
  const [isEditingManually, setIsEditingManually] = useState(false);

  if (!currentProject || !currentProject.sections || currentProject.sections.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 text-sm mb-4">Aucun projet actif ou aucune section disponible.</p>
        <button
          onClick={() => setActiveView('new-book')}
          className="px-4 py-2 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
        >
          Importer un livre PDF
        </button>
      </div>
    );
  }

  const sections = currentProject.sections;
  const currentSection = sections.find((s) => s.id === selectedSectionId) || sections[0];
  const currentIndex = sections.findIndex((s) => s.id === currentSection.id);

  // Sync draft script with current section when switching section
  React.useEffect(() => {
    setScriptDraft(currentSection.oralScript || '');
    setIsEditingManually(false);
  }, [currentSection.id, currentSection.oralScript]);

  const estimatedMinutes = Math.max(
    1,
    Math.round(
      (scriptDraft.split(/\s+/).filter(Boolean).length / (currentProject.speakingSpeedWordsPerMinute || 140))
    )
  );

  const wordCount = scriptDraft.split(/\s+/).filter(Boolean).length;

  const checkApiKey = (): string | null => {
    if (!activeTextKey?.key) {
      addToast({
        type: 'warning',
        title: 'Clé API requise',
        message: 'Veuillez configurer une clé API Gemini pour l’analyse dans la page "Clés API".',
      });
      setActiveView('api-keys');
      return null;
    }
    return activeTextKey.key;
  };

  // --- Step A: Generate Idea Inventory ---
  const handleGenerateInventory = async () => {
    const key = checkApiKey();
    if (!key) return;

    requireConsentForAi(async () => {
      setIsProcessing(true);
      setProcessingStatus('Étape A : Inventaire des idées maîtresses...');
      try {
        const inventory = await generateIdeaInventory(
          key,
          currentSection.title,
          currentSection.rawText,
          currentProject.textModelPreference || 'gemini-3.8-flash'
        );

        await updateCurrentSection(currentSection.id, {
          ideaInventory: inventory,
          status: 'analyse_en_cours',
        });

        addToast({
          type: 'success',
          title: 'Inventaire généré',
          message: `${inventory.length} concepts et raisonnements identifiés avec succès.`,
        });
        setActiveTab('inventory');
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Erreur Inventaire (Étape A)',
          message: err.userMessage || err.message,
        });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    });
  };

  // --- Step B: Generate Oral Script ---
  const handleGenerateScript = async () => {
    const key = checkApiKey();
    if (!key) return;

    requireConsentForAi(async () => {
      setIsProcessing(true);
      try {
        let inventory = currentSection.ideaInventory;

        // If inventory doesn't exist yet, generate it first!
        if (!inventory || inventory.length === 0) {
          setProcessingStatus('Étape A : Analyse préalable des idées maîtresses...');
          inventory = await generateIdeaInventory(
            key,
            currentSection.title,
            currentSection.rawText,
            currentProject.textModelPreference || 'gemini-3.8-flash'
          );
          await updateCurrentSection(currentSection.id, { ideaInventory: inventory });
        }

        setProcessingStatus('Étape B : Rédaction du script oral pédagogique...');
        const script = await generateOralScript(
          key,
          currentSection.title,
          currentSection.rawText,
          inventory,
          currentProject.textModelPreference || 'gemini-3.8-flash'
        );

        setScriptDraft(script);

        await updateCurrentSection(currentSection.id, {
          oralScript: script,
          estimatedListeningMinutes: estimatedMinutes,
          status: 'a_verifier',
          humanValidated: false, // Reset validation when new script is generated
        });

        addToast({
          type: 'success',
          title: 'Script oral rédigé',
          message: 'Le script pédagogique a été généré. Vous pouvez maintenant lancer la vérification de couverture.',
        });
        setActiveTab('script');
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Erreur Rédaction (Étape B)',
          message: err.userMessage || err.message,
        });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    });
  };

  // --- Step C: Coverage Verification ---
  const handleVerifyCoverage = async () => {
    const key = checkApiKey();
    if (!key) return;

    const script = scriptDraft.trim();
    if (!script) {
      addToast({
        type: 'warning',
        message: 'Veuillez d’abord générer ou saisir un script oral avant de vérifier la couverture.',
      });
      return;
    }

    requireConsentForAi(async () => {
      setIsProcessing(true);
      setProcessingStatus('Étape C : Audit de fidélité et couverture des idées...');
      try {
        let inventory = currentSection.ideaInventory;
        if (!inventory || inventory.length === 0) {
          inventory = await generateIdeaInventory(
            key,
            currentSection.title,
            currentSection.rawText,
            currentProject.textModelPreference || 'gemini-3.8-flash'
          );
          await updateCurrentSection(currentSection.id, { ideaInventory: inventory });
        }

        const report = await verifyScriptCoverage(
          key,
          currentSection.title,
          script,
          inventory,
          currentProject.textModelPreference || 'gemini-3.8-flash'
        );

        await updateCurrentSection(currentSection.id, {
          oralScript: script,
          coverageReport: report,
          status: 'a_verifier',
        });

        addToast({
          type: report.isPassing ? 'success' : 'warning',
          title: `Couverture à ${report.overallScorePercent}%`,
          message: report.isPassing
            ? 'Toutes les idées majeures sont couvertes !'
            : `${report.missingCount} idée(s) omise(s). Vous pouvez les corriger en 1 clic.`,
        });
        setActiveTab('coverage');
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Erreur Vérification (Étape C)',
          message: err.userMessage || err.message,
        });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    });
  };

  // --- Step C Refinement: Add Missing Ideas ---
  const handleRefineMissing = async () => {
    const key = checkApiKey();
    if (!key) return;

    const report = currentSection.coverageReport;
    const inventory = currentSection.ideaInventory;
    if (!report || !inventory) return;

    const missingItemIds = report.items
      .filter((i) => i.status === 'missing' || i.status === 'partial')
      .map((i) => i.itemId);

    const missingItems = inventory.filter((i) => missingItemIds.includes(i.id));

    if (missingItems.length === 0) {
      addToast({ type: 'info', message: 'Aucune idée manquante à corriger.' });
      return;
    }

    requireConsentForAi(async () => {
      setIsProcessing(true);
      setProcessingStatus('Intégration ciblée des points oubliés...');
      try {
        const refinedScript = await refineScriptWithMissingItems(
          key,
          scriptDraft,
          missingItems,
          currentProject.textModelPreference || 'gemini-3.8-flash'
        );

        setScriptDraft(refinedScript);

        // Auto re-check coverage
        setProcessingStatus('Mise à jour du rapport de couverture...');
        const newReport = await verifyScriptCoverage(
          key,
          currentSection.title,
          refinedScript,
          inventory,
          currentProject.textModelPreference || 'gemini-3.8-flash'
        );

        await updateCurrentSection(currentSection.id, {
          oralScript: refinedScript,
          coverageReport: newReport,
          humanValidated: false,
        });

        addToast({
          type: 'success',
          title: 'Script enrichi',
          message: `Nouveau score de couverture : ${newReport.overallScorePercent}%.`,
        });
        setActiveTab('script');
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Erreur lors de la correction',
          message: err.userMessage || err.message,
        });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    });
  };

  // --- Step D: Human Validation ---
  const handleSaveManualEdit = async () => {
    await updateCurrentSection(currentSection.id, {
      oralScript: scriptDraft,
      humanValidated: false, // User modified, needs confirmation
    });
    setIsEditingManually(false);
    addToast({
      type: 'info',
      message: 'Modifications textuelles enregistrées localement.',
    });
  };

  const handleValidateScript = async () => {
    if (!scriptDraft.trim()) {
      addToast({
        type: 'error',
        message: 'Impossible de valider un script vide.',
      });
      return;
    }

    await updateCurrentSection(currentSection.id, {
      oralScript: scriptDraft,
      humanValidated: true,
      humanValidationTimestamp: new Date().toISOString(),
      status: currentSection.audioBlobId ? 'termine' : 'valide',
    });

    addToast({
      type: 'success',
      title: 'Script validé avec succès !',
      message: 'Cette section est maintenant prête pour la génération audio.',
    });
  };

  const handleNextSection = () => {
    if (currentIndex < sections.length - 1) {
      setSelectedSectionId(sections[currentIndex + 1].id);
    }
  };

  const handlePrevSection = () => {
    if (currentIndex > 0) {
      setSelectedSectionId(sections[currentIndex - 1].id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Top Section Navigator & Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Section Selector & Pager */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={handlePrevSection}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700 transition-colors"
            title="Section précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5">
              <span className="font-mono text-amber-400 font-bold">
                Section {currentIndex + 1} / {sections.length}
              </span>
              <span>•</span>
              <span>Pages {currentSection.pageStart} à {currentSection.pageEnd}</span>
              <span>•</span>
              <span>{currentSection.charCount.toLocaleString('fr-FR')} caractères source</span>
            </div>
            <select
              aria-label="Sélectionner une section"
              value={currentSection.id}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 truncate"
            >
              {sections.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  #{idx + 1} — {s.title} {s.humanValidated ? '✓ (Validé)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextSection}
            disabled={currentIndex === sections.length - 1}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-700 transition-colors"
            title="Section suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Validation & Audio Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleValidateScript}
            disabled={!scriptDraft.trim()}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${
              currentSection.humanValidated
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{currentSection.humanValidated ? 'Validé ✓ (Revalider)' : 'Valider ce script'}</span>
          </button>

          {currentSection.humanValidated && (
            <button
              onClick={() => setActiveView('audio')}
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Volume2 className="w-4 h-4" />
              <span>Générer l'audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Pipeline Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Step A Button */}
        <button
          onClick={handleGenerateInventory}
          disabled={isProcessing}
          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Étape A
            </span>
            {currentSection.ideaInventory ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {currentSection.ideaInventory.length} idées
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">À faire</span>
            )}
          </div>
          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
            Inventaire des idées
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dégage les thèses, arguments et concepts clés
          </p>
        </button>

        {/* Step B Button */}
        <button
          onClick={handleGenerateScript}
          disabled={isProcessing}
          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Étape B
            </span>
            {currentSection.oralScript ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Rédigé
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">À faire</span>
            )}
          </div>
          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
            Script oral pédagogique
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Rédige l'explication audio structurée
          </p>
        </button>

        {/* Step C Button */}
        <button
          onClick={handleVerifyCoverage}
          disabled={isProcessing}
          className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-left transition-all group disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Étape C
            </span>
            {currentSection.coverageReport ? (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold flex items-center gap-1 ${
                currentSection.coverageReport.isPassing
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                {currentSection.coverageReport.overallScorePercent}%
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">À faire</span>
            )}
          </div>
          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
            Audit de couverture
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Vérifie la préservation des idées maîtresses
          </p>
        </button>
      </div>

      {/* Processing Loader Indicator */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center gap-3 text-xs text-amber-200 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
          <span className="font-semibold">{processingStatus}</span>
        </div>
      )}

      {/* Studio Workspace Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'script'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Script oral</span>
            {wordCount > 0 && (
              <span className="text-[10px] font-normal text-slate-400">
                ({wordCount} mots • ~{estimatedMinutes} min)
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'inventory'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Inventaire des idées ({currentSection.ideaInventory?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('coverage')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'coverage'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              Couverture {currentSection.coverageReport ? `(${currentSection.coverageReport.overallScorePercent}%)` : ''}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'source'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Texte source extrait</span>
          </button>
        </div>

        {/* Tab Content: Script Editor */}
        {activeTab === 'script' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Durée audio estimée : ~{estimatedMinutes} min
                </span>
                <span>•</span>
                <span>Vitesse cible : {currentProject.speakingSpeedWordsPerMinute || 140} mots/min</span>
              </div>

              {isEditingManually ? (
                <button
                  onClick={handleSaveManualEdit}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Enregistrer les modifications
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingManually(true)}
                  className="text-slate-400 hover:text-amber-300 text-xs flex items-center gap-1 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Modifier le script
                </button>
              )}
            </div>

            {scriptDraft ? (
              <textarea
                value={scriptDraft}
                onChange={(e) => {
                  setScriptDraft(e.target.value);
                  setIsEditingManually(true);
                }}
                rows={16}
                placeholder="Rédigez ou collez votre script oral ici..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-sans text-slate-200 leading-relaxed focus:outline-none focus:border-amber-400 scrollbar-thin resize-y"
              />
            ) : (
              <div className="py-16 text-center space-y-3">
                <Wand2 className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Aucun script oral rédigé pour cette section. Cliquez sur le bouton ci-dessous pour lancer la génération assistée par Gemini.
                </p>
                <button
                  onClick={handleGenerateScript}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer le script oral
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Idea Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Concepts, thèses et raisonnements identifiés
              </h4>
              <button
                onClick={handleGenerateInventory}
                disabled={isProcessing}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Régénérer l'inventaire
              </button>
            </div>

            {currentSection.ideaInventory && currentSection.ideaInventory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentSection.ideaInventory.map((item) => {
                  let badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  if (item.category === 'these_centrale') {
                    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                  } else if (item.category === 'concept_definition') {
                    badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                  } else if (item.category === 'exemple_concret') {
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                          {item.category.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">{item.id}</span>
                      </div>
                      <h5 className="font-bold text-white text-xs">{item.title}</h5>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{item.description}</p>
                      {item.sourceContext && (
                        <p className="text-[10px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded">
                          « {item.sourceContext} »
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                <p>Aucun inventaire généré pour cette section.</p>
                <button
                  onClick={handleGenerateInventory}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
                >
                  Lancer l'inventaire des idées (Étape A)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Coverage Check Report */}
        {activeTab === 'coverage' && (
          <div className="p-6 space-y-5">
            {currentSection.coverageReport ? (
              <div className="space-y-4">
                {/* Score Banner */}
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  currentSection.coverageReport.isPassing
                    ? 'bg-emerald-950/30 border-emerald-500/30'
                    : 'bg-amber-950/30 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg border ${
                      currentSection.coverageReport.isPassing
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {currentSection.coverageReport.overallScorePercent}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {currentSection.coverageReport.isPassing
                          ? 'Audit de couverture réussi !'
                          : 'Attention : certaines idées importantes sont manquantes.'}
                      </h4>
                      <p className="text-xs text-slate-300">
                        {currentSection.coverageReport.coveredCount} couvertes • {currentSection.coverageReport.partialCount} partielles • {currentSection.coverageReport.missingCount} oubliées
                      </p>
                    </div>
                  </div>

                  {!currentSection.coverageReport.isPassing && (
                    <button
                      onClick={handleRefineMissing}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Intégrer les idées manquantes en 1 clic</span>
                    </button>
                  )}
                </div>

                {/* Items Audit List */}
                <div className="space-y-2">
                  {currentSection.coverageReport.items.map((item) => {
                    const originalIdea = currentSection.ideaInventory?.find((i) => i.id === item.itemId);
                    let badge = <span className="text-emerald-400 font-bold">✓ Couvert</span>;
                    if (item.status === 'partial') {
                      badge = <span className="text-amber-400 font-bold">~ Partiel</span>;
                    } else if (item.status === 'missing') {
                      badge = <span className="text-rose-400 font-bold">✗ Oublié</span>;
                    } else if (item.status === 'manual_review') {
                      badge = <span className="text-sky-400 font-bold">? À vérifier</span>;
                    }

                    return (
                      <div
                        key={item.itemId}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400">{item.itemId}</span>
                            <span className="font-bold text-white text-xs">
                              {originalIdea?.title || item.itemId}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{item.explanation}</p>
                          {item.matchedQuote && (
                            <p className="text-[10px] text-emerald-400/90 italic bg-emerald-950/20 border border-emerald-900/30 p-1.5 rounded">
                              « {item.matchedQuote} »
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">{badge}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                <p>Aucun audit de couverture n'a encore été lancé pour cette section.</p>
                <button
                  onClick={handleVerifyCoverage}
                  disabled={!scriptDraft.trim()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs"
                >
                  Lancer l'audit de couverture (Étape C)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Raw Source Text */}
        {activeTab === 'source' && (
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Texte original du livre (pages {currentSection.pageStart} à {currentSection.pageEnd})</span>
              <span>{currentSection.charCount.toLocaleString('fr-FR')} caractères</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {currentSection.rawText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
