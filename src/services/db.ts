/**
 * IndexedDB storage service for BookToAudio
 * Handles projects, extracted text, and binary audio blobs locally.
 */

import { BookProject } from '../types';

const DB_NAME = 'BookToAudioDB';
const DB_VERSION = 1;

const STORE_PROJECTS = 'projects';
const STORE_AUDIO = 'audio_blobs';

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
            const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
            projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }

          if (!db.objectStoreNames.contains(STORE_AUDIO)) {
            db.createObjectStore(STORE_AUDIO); // Key is audioBlobId (string)
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new Error(`Impossible d'ouvrir IndexedDB: ${request.error?.message}`));
        };
      });
    }
    return this.dbPromise;
  }

  // --- Project CRUD ---

  async saveProject(project: BookProject): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const updatedProject = {
        ...project,
        updatedAt: new Date().toISOString()
      };
      const request = store.put(updatedProject);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Erreur lors de la sauvegarde du projet: ${request.error?.message}`));
    });
  }

  async getProject(id: string): Promise<BookProject | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Erreur lors du chargement du projet: ${request.error?.message}`));
    });
  }

  async getAllProjects(): Promise<BookProject[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const projects = (request.result as BookProject[]) || [];
        // Sort descending by updatedAt
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(projects);
      };
      request.onerror = () => reject(new Error(`Erreur lors du listage des projets: ${request.error?.message}`));
    });
  }

  async deleteProject(id: string): Promise<void> {
    const project = await this.getProject(id);
    const db = await this.getDB();

    // Remove associated audio blobs first
    if (project && project.sections) {
      for (const section of project.sections) {
        if (section.audioBlobId) {
          await this.deleteAudioBlob(section.audioBlobId).catch(() => {});
        }
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PROJECTS], 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Erreur lors de la suppression du projet: ${request.error?.message}`));
    });
  }

  // --- Audio Blob Storage ---

  async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_AUDIO], 'readwrite');
      const store = transaction.objectStore(STORE_AUDIO);
      const request = store.put(blob, id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Erreur de stockage du fichier audio: ${request.error?.message}`));
    });
  }

  async getAudioBlob(id: string): Promise<Blob | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_AUDIO], 'readonly');
      const store = transaction.objectStore(STORE_AUDIO);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Erreur de lecture du fichier audio: ${request.error?.message}`));
    });
  }

  async deleteAudioBlob(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_AUDIO], 'readwrite');
      const store = transaction.objectStore(STORE_AUDIO);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Erreur de suppression du fichier audio: ${request.error?.message}`));
    });
  }

  // --- Storage Quota & Stats ---

  async getStorageEstimate(): Promise<{ usageBytes: number; quotaBytes: number; percentUsed: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
        return { usageBytes, quotaBytes, percentUsed };
      } catch (err) {
        console.warn('Storage estimate failed:', err);
      }
    }
    return null;
  }
}

export const dbService = new DatabaseService();
