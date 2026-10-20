/**
 * ZIP Archive & Export Service for BookToAudio
 * Generates local downloadable ZIP archives containing audio files, scripts, and index.txt.
 */

import JSZip from 'jszip';
import { BookProject } from '../types';
import { dbService } from './db';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export async function createBookAudioZip(
  project: BookProject,
  options: {
    includeScripts?: boolean;
    onProgress?: (percent: number, currentItem: string) => void;
  } = {}
): Promise<Blob> {
  const zip = new JSZip();
  const folderName = slugify(project.title || 'livre-audio');
  const bookFolder = zip.folder(folderName) || zip;

  const validAudioSections = project.sections.filter(
    (s) => s.audioBlobId && (s.status === 'termine' || s.status === 'audio_en_cours')
  );

  let indexText = `BOOKTOAUDIO — ARCHIVE DU LIVRE AUDIO\n`;
  indexText += `Titre : ${project.title}\n`;
  if (project.author) indexText += `Auteur : ${project.author}\n`;
  indexText += `Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}\n`;
  indexText += `Nombre de sections audio disponibles : ${validAudioSections.length} / ${project.sections.length}\n`;
  indexText += `Voix utilisée : ${project.targetVoice || 'Kore'}\n`;
  indexText += `\n==================================================\n`;
  indexText += `TABLE DES MATIÈRES & DURÉES :\n`;
  indexText += `==================================================\n\n`;

  let totalDurationSecs = 0;
  const scriptsFolder = options.includeScripts ? bookFolder.folder('scripts') : null;

  for (let i = 0; i < project.sections.length; i++) {
    const section = project.sections[i];
    const orderStr = String(i + 1).padStart(2, '0');
    const safeTitle = slugify(section.title) || `section-${orderStr}`;
    const filename = `${orderStr}-${safeTitle}.wav`;

    if (options.onProgress) {
      const pct = Math.round((i / project.sections.length) * 80);
      options.onProgress(pct, `Préparation de ${filename}`);
    }

    if (section.audioBlobId) {
      const blob = await dbService.getAudioBlob(section.audioBlobId);
      if (blob) {
        bookFolder.file(filename, blob);
        const duration = section.audioDurationSeconds || 0;
        totalDurationSecs += duration;
        indexText += `${orderStr}. ${section.title}\n`;
        indexText += `    Fichier : ${filename}\n`;
        indexText += `    Durée   : ${formatDuration(duration)} (${duration}s)\n`;
        indexText += `    Pages   : ${section.pageStart} à ${section.pageEnd}\n\n`;
      }
    } else {
      indexText += `${orderStr}. [NON GÉNÉRÉ] ${section.title} (Pages ${section.pageStart} à ${section.pageEnd})\n\n`;
    }

    if (options.includeScripts && scriptsFolder && section.oralScript) {
      const scriptFilename = `${orderStr}-${safeTitle}.txt`;
      let scriptContent = `TITRE : ${section.title}\n`;
      scriptContent += `PAGES : ${section.pageStart} à ${section.pageEnd}\n`;
      scriptContent += `=========================================\n\n`;
      scriptContent += section.oralScript;
      scriptsFolder.file(scriptFilename, scriptContent);
    }
  }

  indexText += `\n==================================================\n`;
  indexText += `DURÉE TOTALE : ${formatDuration(totalDurationSecs)}\n`;
  indexText += `Application : BookToAudio (Génération audio pédagogique)\n`;

  bookFolder.file('index.txt', indexText);

  if (options.onProgress) {
    options.onProgress(85, 'Compression du fichier ZIP...');
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (options.onProgress) {
        options.onProgress(85 + Math.round(metadata.percent * 0.15), 'Finalisation...');
      }
    }
  );

  return zipBlob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}
