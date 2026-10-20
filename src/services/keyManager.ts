/**
 * Secure Client-Side API Key Management Service
 * Follows strict safety principles:
 * - Session-in-memory by default
 * - Explicit opt-in for localStorage with prominent security warning
 * - Never logged or exported
 * - Separate keys for text analysis and audio generation
 */

import { ApiKeyConfig, KeyUsage } from '../types';
import { testApiKey } from './gemini';

const STORAGE_KEYS_CONFIG = 'booktoaudio_saved_keys_v1';

export class KeyManager {
  private keys: ApiKeyConfig[] = [];
  private activeTextKeyId: string | null = null;
  private activeAudioKeyId: string | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadSavedKeys();
  }

  private loadSavedKeys(): void {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEYS_CONFIG);
      if (savedRaw) {
        const parsed: ApiKeyConfig[] = JSON.parse(savedRaw);
        // Only keep keys that user explicitly chose to save on device
        this.keys = parsed.filter((k) => k.isSavedOnDevice);
        this.autoSelectActiveKeys();
      }
    } catch (e) {
      console.warn('Erreur lecture clés locales:', e);
    }
  }

  private persistSavedKeys(): void {
    try {
      const keysToPersist = this.keys.filter((k) => k.isSavedOnDevice);
      localStorage.setItem(STORAGE_KEYS_CONFIG, JSON.stringify(keysToPersist));
    } catch (e) {
      console.warn('Erreur sauvegarde clés:', e);
    }
  }

  private autoSelectActiveKeys(): void {
    if (!this.activeTextKeyId) {
      const textKey = this.keys.find(
        (k) => k.usage === 'analysis_and_writing' || k.usage === 'all_purpose'
      );
      if (textKey) this.activeTextKeyId = textKey.id;
    }

    if (!this.activeAudioKeyId) {
      const audioKey = this.keys.find(
        (k) => k.usage === 'audio_generation' || k.usage === 'all_purpose'
      );
      if (audioKey) this.activeAudioKeyId = audioKey.id;
    }
  }

  public getKeys(): ApiKeyConfig[] {
    return [...this.keys];
  }

  public addKey(config: {
    name: string;
    key: string;
    usage: KeyUsage;
    projectId?: string;
    isSavedOnDevice: boolean;
  }): ApiKeyConfig {
    const trimmedKey = config.key.trim();
    const newKey: ApiKeyConfig = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: config.name.trim() || 'Clé Gemini',
      key: trimmedKey,
      usage: config.usage,
      projectId: config.projectId?.trim() || undefined,
      isSavedOnDevice: config.isSavedOnDevice,
      status: 'untested',
    };

    this.keys.push(newKey);
    this.autoSelectActiveKeys();

    if (newKey.isSavedOnDevice) {
      this.persistSavedKeys();
    }

    this.notify();
    return newKey;
  }

  public updateKey(id: string, updates: Partial<ApiKeyConfig>): void {
    this.keys = this.keys.map((k) => {
      if (k.id === id) {
        return { ...k, ...updates };
      }
      return k;
    });

    this.persistSavedKeys();
    this.notify();
  }

  public removeKey(id: string): void {
    this.keys = this.keys.filter((k) => k.id !== id);
    if (this.activeTextKeyId === id) this.activeTextKeyId = null;
    if (this.activeAudioKeyId === id) this.activeAudioKeyId = null;
    this.autoSelectActiveKeys();
    this.persistSavedKeys();
    this.notify();
  }

  public setActiveTextKey(id: string | null): void {
    this.activeTextKeyId = id;
    this.notify();
  }

  public setActiveAudioKey(id: string | null): void {
    this.activeAudioKeyId = id;
    this.notify();
  }

  public getActiveTextKey(): ApiKeyConfig | null {
    if (this.activeTextKeyId) {
      return this.keys.find((k) => k.id === this.activeTextKeyId) || null;
    }
    return (
      this.keys.find((k) => k.usage === 'analysis_and_writing' || k.usage === 'all_purpose') || null
    );
  }

  public getActiveAudioKey(): ApiKeyConfig | null {
    if (this.activeAudioKeyId) {
      return this.keys.find((k) => k.id === this.activeAudioKeyId) || null;
    }
    return (
      this.keys.find((k) => k.usage === 'audio_generation' || k.usage === 'all_purpose') || null
    );
  }

  public async testKey(id: string): Promise<{ success: boolean; message: string }> {
    const keyConfig = this.keys.find((k) => k.id === id);
    if (!keyConfig) return { success: false, message: 'Clé non trouvée' };

    const result = await testApiKey(keyConfig.key);
    this.updateKey(id, {
      status: result.success ? 'valid' : 'invalid',
      lastTestedAt: new Date().toISOString(),
      errorMessage: result.success ? undefined : result.message,
    });

    return result;
  }

  public clearAllKeys(): void {
    this.keys = [];
    this.activeTextKeyId = null;
    this.activeAudioKeyId = null;
    localStorage.removeItem(STORAGE_KEYS_CONFIG);
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  public static maskKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    const start = key.slice(0, 6);
    const end = key.slice(-4);
    return `${start}...${end}`;
  }
}

export const keyManager = new KeyManager();
