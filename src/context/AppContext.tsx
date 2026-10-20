/**
 * Application Context and State Management for BookToAudio
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BookProject, BookSection, ApiKeyConfig } from '../types';
import { dbService } from '../services/db';
import { keyManager } from '../services/keyManager';

export type ActiveView = 
  | 'dashboard'
  | 'new-book'
  | 'library'
  | 'sections'
  | 'studio'
  | 'audio'
  | 'player'
  | 'api-keys'
  | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  durationMs?: number;
}

interface AudioPlaybackState {
  sectionId: string | null;
  sectionTitle: string | null;
  audioBlobUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
}

interface AppContextValue {
  // Navigation
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  
  // Projects
  projects: BookProject[];
  currentProject: BookProject | null;
  isLoadingProjects: boolean;
  setCurrentProjectById: (id: string | null) => Promise<void>;
  saveProject: (project: BookProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  updateCurrentSection: (sectionId: string, updates: Partial<BookSection>) => Promise<void>;
  
  // Studio navigation
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;

  // Keys
  keys: ApiKeyConfig[];
  activeTextKey: ApiKeyConfig | null;
  activeAudioKey: ApiKeyConfig | null;
  
  // Global Audio Player
  playback: AudioPlaybackState;
  playSectionAudio: (section: BookSection) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  seekAudio: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  
  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // External Consent Modal
  requireConsentForAi: (onConfirmed: () => void) => void;
  consentModalOpen: boolean;
  handleConfirmConsent: () => void;
  handleCancelConsent: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [currentProject, setCurrentProject] = useState<BookProject | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);

  // Keys state synced with keyManager
  const [keys, setKeys] = useState<ApiKeyConfig[]>(keyManager.getKeys());
  const [activeTextKey, setActiveTextKey] = useState<ApiKeyConfig | null>(keyManager.getActiveTextKey());
  const [activeAudioKey, setActiveAudioKey] = useState<ApiKeyConfig | null>(keyManager.getActiveAudioKey());

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Consent modal state
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [pendingConsentAction, setPendingConsentAction] = useState<(() => void) | null>(null);

  // Audio Playback
  const [playback, setPlayback] = useState<AudioPlaybackState>({
    sectionId: null,
    sectionTitle: null,
    audioBlobUrl: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
  });

  // Audio element reference for playback
  const [audioEl] = useState(() => {
    const el = new Audio();
    el.preload = 'auto';
    return el;
  });

  // Load all projects on mount
  const refreshProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const all = await dbService.getAllProjects();
      setProjects(all);
      // Auto-select latest project if none selected
      if (!currentProject && all.length > 0) {
        setCurrentProject(all[0]);
        if (all[0].sections.length > 0) {
          setSelectedSectionId(all[0].sections[0].id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load projects from DB:', e);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentProject]);

  useEffect(() => {
    refreshProjects();
  }, []);

  // Sync keys from keyManager
  useEffect(() => {
    const updateKeysState = () => {
      setKeys(keyManager.getKeys());
      setActiveTextKey(keyManager.getActiveTextKey());
      setActiveAudioKey(keyManager.getActiveAudioKey());
    };
    return keyManager.subscribe(updateKeysState);
  }, []);

  // Audio element listeners
  useEffect(() => {
    const onTimeUpdate = () => {
      setPlayback((prev) => ({
        ...prev,
        currentTime: audioEl.currentTime,
        duration: audioEl.duration || prev.duration,
      }));
    };

    const onEnded = () => {
      setPlayback((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
    };

    const onError = () => {
      setPlayback((prev) => ({ ...prev, isPlaying: false }));
    };

    audioEl.addEventListener('timeupdate', onTimeUpdate);
    audioEl.addEventListener('ended', onEnded);
    audioEl.addEventListener('error', onError);

    return () => {
      audioEl.removeEventListener('timeupdate', onTimeUpdate);
      audioEl.removeEventListener('ended', onEnded);
      audioEl.removeEventListener('error', onError);
    };
  }, [audioEl]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.durationMs || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setCurrentProjectById = useCallback(async (id: string | null) => {
    if (!id) {
      setCurrentProject(null);
      setSelectedSectionId(null);
      return;
    }
    const found = await dbService.getProject(id);
    if (found) {
      setCurrentProject(found);
      if (found.sections.length > 0) {
        setSelectedSectionId(found.sections[0].id);
      }
    }
  }, []);

  const saveProject = useCallback(async (proj: BookProject) => {
    await dbService.saveProject(proj);
    setCurrentProject(proj);
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === proj.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = proj;
        return copy;
      }
      return [proj, ...prev];
    });
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    await dbService.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (currentProject?.id === id) {
      setCurrentProject(null);
      setSelectedSectionId(null);
      setActiveView('dashboard');
    }
    addToast({
      type: 'info',
      title: 'Projet supprimé',
      message: 'Le livre et ses fichiers audios ont été retirés de la base locale.',
    });
  }, [currentProject, addToast]);

  const updateCurrentSection = useCallback(async (sectionId: string, updates: Partial<BookSection>) => {
    if (!currentProject) return;
    const updatedSections = currentProject.sections.map((s) => {
      if (s.id === sectionId) {
        return { ...s, ...updates };
      }
      return s;
    });

    const updatedProject: BookProject = {
      ...currentProject,
      sections: updatedSections,
      updatedAt: new Date().toISOString(),
    };

    await saveProject(updatedProject);
  }, [currentProject, saveProject]);

  // Audio Playback methods
  const playSectionAudio = useCallback(async (section: BookSection) => {
    if (!section.audioBlobId) {
      addToast({
        type: 'warning',
        message: "Aucun fichier audio disponible pour cette section.",
      });
      return;
    }

    try {
      const blob = await dbService.getAudioBlob(section.audioBlobId);
      if (!blob) {
        throw new Error("Fichier audio introuvable dans le stockage local.");
      }

      if (playback.audioBlobUrl) {
        URL.revokeObjectURL(playback.audioBlobUrl);
      }

      const url = URL.createObjectURL(blob);
      audioEl.src = url;
      audioEl.playbackRate = playback.playbackRate;
      await audioEl.play();

      setPlayback({
        sectionId: section.id,
        sectionTitle: section.title,
        audioBlobUrl: url,
        isPlaying: true,
        currentTime: 0,
        duration: section.audioDurationSeconds || 0,
        playbackRate: playback.playbackRate,
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Erreur de lecture audio',
        message: err.message || 'Impossible de lire le fichier.',
      });
    }
  }, [playback, audioEl, addToast]);

  const pauseAudio = useCallback(() => {
    audioEl.pause();
    setPlayback((prev) => ({ ...prev, isPlaying: false }));
  }, [audioEl]);

  const resumeAudio = useCallback(() => {
    audioEl.play();
    setPlayback((prev) => ({ ...prev, isPlaying: true }));
  }, [audioEl]);

  const seekAudio = useCallback((seconds: number) => {
    audioEl.currentTime = seconds;
    setPlayback((prev) => ({ ...prev, currentTime: seconds }));
  }, [audioEl]);

  const setPlaybackRate = useCallback((rate: number) => {
    audioEl.playbackRate = rate;
    setPlayback((prev) => ({ ...prev, playbackRate: rate }));
  }, [audioEl]);

  // Consent check for sending data to Gemini API
  const requireConsentForAi = useCallback((onConfirmed: () => void) => {
    if (currentProject?.consentGivenForExternalAi) {
      onConfirmed();
      return;
    }
    setPendingConsentAction(() => onConfirmed);
    setConsentModalOpen(true);
  }, [currentProject]);

  const handleConfirmConsent = useCallback(async () => {
    if (currentProject) {
      const updated = { ...currentProject, consentGivenForExternalAi: true };
      await saveProject(updated);
    }
    setConsentModalOpen(false);
    if (pendingConsentAction) {
      pendingConsentAction();
      setPendingConsentAction(null);
    }
  }, [currentProject, saveProject, pendingConsentAction]);

  const handleCancelConsent = useCallback(() => {
    setConsentModalOpen(false);
    setPendingConsentAction(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        projects,
        currentProject,
        isLoadingProjects,
        setCurrentProjectById,
        saveProject,
        deleteProject,
        updateCurrentSection,
        selectedSectionId,
        setSelectedSectionId,
        keys,
        activeTextKey,
        activeAudioKey,
        playback,
        playSectionAudio,
        pauseAudio,
        resumeAudio,
        seekAudio,
        setPlaybackRate,
        toasts,
        addToast,
        removeToast,
        requireConsentForAi,
        consentModalOpen,
        handleConfirmConsent,
        handleCancelConsent,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
