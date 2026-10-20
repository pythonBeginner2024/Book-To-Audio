/**
 * Core type definitions for BookToAudio
 */

export type KeyUsage = 'analysis_and_writing' | 'audio_generation' | 'all_purpose';

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string; // Stored in memory or optionally encrypted in localStorage
  usage: KeyUsage;
  projectId?: string;
  modelText?: string;
  modelAudio?: string;
  isSavedOnDevice: boolean;
  status: 'untested' | 'valid' | 'invalid';
  lastTestedAt?: string;
  errorMessage?: string;
}

export interface IdeaItem {
  id: string;
  category: 
    | 'these_centrale'
    | 'concept_definition'
    | 'argument_raisonnement'
    | 'etape_methode'
    | 'exemple_concret'
    | 'chiffre_fait_reference'
    | 'cause_effet'
    | 'nuance_objection'
    | 'conclusion_implication';
  title: string;
  description: string;
  sourceContext?: string;
}

export type CoverageStatus = 'covered' | 'partial' | 'missing' | 'manual_review';

export interface CoverageItemResult {
  itemId: string;
  status: CoverageStatus;
  explanation: string;
  matchedQuote?: string;
}

export interface CoverageReport {
  overallScorePercent: number;
  totalItems: number;
  coveredCount: number;
  partialCount: number;
  missingCount: number;
  manualReviewCount: number;
  items: CoverageItemResult[];
  lastCheckedAt: string;
  isPassing: boolean;
}

export type SectionStatus = 
  | 'a_traiter'          // Initial state
  | 'analyse_en_cours'   // Step A / B running
  | 'a_verifier'         // Generated, waiting for review / Step C
  | 'valide'             // Human validated
  | 'audio_en_cours'     // Generating audio
  | 'termine'            // Audio generated and ready
  | 'echec';             // Error during processing

export interface BookSection {
  id: string;
  orderIndex: number;
  title: string;
  pageStart: number;
  pageEnd: number;
  rawText: string;
  charCount: number;
  status: SectionStatus;
  
  // Pedagogical Summary Data
  ideaInventory?: IdeaItem[];
  oralScript?: string;
  estimatedListeningMinutes?: number;
  coverageReport?: CoverageReport;
  humanValidated: boolean;
  humanValidationTimestamp?: string;
  
  // Audio Data
  audioBlobId?: string; // key in IndexedDB audio store
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioVoice?: string;
  audioCreatedAt?: string;
  
  // Error handling
  lastError?: string;
  selectedForBatch: boolean;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  charCount: number;
  hasInsufficientText: boolean;
}

export interface BookProject {
  id: string;
  title: string;
  author?: string;
  filename: string;
  fileSizeBytes: number;
  totalPages: number;
  extractedPages: ExtractedPage[];
  sections: BookSection[];
  createdAt: string;
  updatedAt: string;
  consentGivenForExternalAi: boolean;
  
  // Project settings
  targetVoice: string; // e.g. 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'
  speakingSpeedWordsPerMinute: number;
  textModelPreference: string;
  audioModelPreference: string;
}

export interface AudioGenerationOptions {
  voiceName: string;
  speechStyle?: string;
}

export interface StorageEstimateInfo {
  usageBytes: number;
  quotaBytes: number;
  percentUsed: number;
}
