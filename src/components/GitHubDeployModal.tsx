import React, { useState } from 'react';
import { 
  Github, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  Terminal, 
  Globe, 
  AlertCircle 
} from 'lucide-react';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({ isOpen, onClose }) => {
  const [githubUser, setGithubUser] = useState('');
  const [repoName, setRepoName] = useState('booktoaudio');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const cleanUser = githubUser.trim() || 'votre-nom-utilisateur';
  const cleanRepo = repoName.trim() || 'booktoaudio';

  const repoUrl = `https://github.com/${cleanUser}/${cleanRepo}`;
  const settingsPagesUrl = `${repoUrl}/settings/pages`;
  const actionsUrl = `${repoUrl}/actions`;
  const liveAppUrl = `https://${cleanUser}.github.io/${cleanRepo}/`;

  const commands = [
    'git init',
    'git add .',
    'git commit -m "Déploiement initial BookToAudio"',
    'git branch -M main',
    `git remote add origin https://github.com/${cleanUser}/${cleanRepo}.git`,
    'git push -u origin main',
  ];

  const fullCommandString = commands.join('\n');

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-left my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
              <Github className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Configuration & Déploiement GitHub Pages
              </h2>
              <p className="text-xs text-slate-400">
                Guide interactif étape par étape avec GitHub Actions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic User & Repo configuration */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Personnaliser pour votre compte GitHub
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 font-medium mb-1">
                Votre nom d'utilisateur GitHub
              </label>
              <input
                type="text"
                placeholder="Ex : octocat"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 font-medium mb-1">
                Nom du dépôt GitHub
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 4 Steps */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[11px]">
                  1
                </span>
                Créer le dépôt GitHub Public
              </span>
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Ouvrir github.com/new</span>
                <ExternalLink className="w-3 h-3 text-amber-400" />
              </a>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Créez un nouveau dépôt en visibilité <strong>Public</strong> (nommez-le <code>{cleanRepo}</code>). Ne cochez pas « Add a README file ».
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[11px]">
                  2
                </span>
                Pousser le code source
              </span>
              <button
                onClick={() => handleCopy(fullCommandString, 1)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400" />}
                <span>{copiedIndex === 1 ? 'Copié !' : 'Copier les commandes'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto leading-relaxed">
              {fullCommandString}
            </pre>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[11px]">
                  3
                </span>
                Activer GitHub Actions dans GitHub Pages
              </span>
              {githubUser.trim() ? (
                <a
                  href={settingsPagesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Aller dans Settings &gt; Pages</span>
                  <ExternalLink className="w-3 h-3 text-amber-400" />
                </a>
              ) : null}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Dans votre dépôt sur GitHub : allez dans <strong>Settings &gt; Pages</strong>, puis sous <strong>Build and deployment &gt; Source</strong>, sélectionnez <strong>GitHub Actions</strong>. Le workflow <code>.github/workflows/deploy.yml</code> déjà présent prendra le relais.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-[11px]">
                  4
                </span>
                Suivre le workflow et ouvrir l'URL publique
              </span>
              {githubUser.trim() ? (
                <a
                  href={actionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Suivre sur Actions</span>
                  <ExternalLink className="w-3 h-3 text-sky-400" />
                </a>
              ) : null}
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Une fois le workflow terminé avec succès (environ 1 minute), GitHub affiche votre URL publique. Vous pouvez alors cliquer directement dessus pour ouvrir l'application :
            </p>
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-300 font-mono text-[11px] truncate">
                <Globe className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">{liveAppUrl}</span>
              </div>
              <a
                href={liveAppUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
              >
                <span>Ouvrir l'application</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
