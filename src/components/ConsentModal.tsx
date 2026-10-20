import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, ExternalLink, Check, X } from 'lucide-react';

export const ConsentModal: React.FC = () => {
  const { consentModalOpen, handleConfirmConsent, handleCancelConsent } = useApp();

  if (!consentModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-left">
        <div className="flex items-center gap-3 mb-4 text-amber-400">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">Autorisation d'envoi externe (Gemini)</h3>
            <p className="text-xs text-amber-300/80">Transparence & Confidentialité des données</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-300 leading-relaxed mb-6">
          <p>
            Vous vous apprêtez à envoyer des extraits de texte de ce livre vers l'API <strong>Google Gemini</strong> pour analyse, rédaction ou génération audio.
          </p>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2 text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span><strong>Traitement local :</strong> L'importation du PDF, l'extraction du texte brut, la segmentation et le stockage restent 100% locaux dans votre navigateur.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">→</span>
              <span><strong>Traitement distant :</strong> Seuls les passages de la section sélectionnée sont transmis à l'API Google via votre propre clé API Google AI Studio.</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Le contenu transmis est soumis aux conditions générales d'utilisation et règles de confidentialité de Google AI Studio. Aucun mot de passe ni clé n'est partagé à des tiers.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <button
            onClick={handleCancelConsent}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Annuler
          </button>
          <button
            onClick={handleConfirmConsent}
            className="px-5 py-2 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirmer et continuer
          </button>
        </div>
      </div>
    </div>
  );
};
