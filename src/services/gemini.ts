/**
 * Gemini REST Client for Browser & GitHub Pages
 * Handles Text Summaries (Idea Inventory, Oral Script, Coverage Check) & Audio TTS.
 */

import { IdeaItem, CoverageReport, CoverageItemResult } from '../types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiApiError {
  code: number;
  message: string;
  status: string;
  details?: unknown;
}

export class GeminiServiceError extends Error {
  public httpStatus?: number;
  public userMessage: string;

  constructor(message: string, httpStatus?: number, userMessage?: string) {
    super(message);
    this.name = 'GeminiServiceError';
    this.httpStatus = httpStatus;
    this.userMessage = userMessage || message;
  }
}

/**
 * Format error into understandable French feedback
 */
function parseGeminiError(status: number, errorData: any): GeminiServiceError {
  const serverMsg = errorData?.error?.message || 'Erreur inconnue';
  let frenchMsg = `Erreur API Gemini (${status}): ${serverMsg}`;

  if (status === 400) {
    frenchMsg = `Clé API invalide ou requête mal formée. Vérifiez la clé API dans les Paramètres. (${serverMsg})`;
  } else if (status === 403) {
    frenchMsg = `Accès refusé (403). La clé n'a pas les droits nécessaires ou l'API Generative Language n'est pas activée sur ce projet Google Cloud.`;
  } else if (status === 429) {
    frenchMsg = `Quota ou limite de débit atteinte (429). Google AI Studio applique des limites de requêtes par minute ou par jour. Veuillez patienter un instant ou sélectionner une autre clé dans les paramètres.`;
  } else if (status === 500 || status === 503) {
    frenchMsg = `Le serveur Gemini est temporairement surchargé (${status}). Veuillez réessayer dans quelques instants.`;
  }

  return new GeminiServiceError(serverMsg, status, frenchMsg);
}

/**
 * Quick live test of an API key
 */
export async function testApiKey(apiKey: string, model = 'gemini-3.8-flash'): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Réponds par le mot: OK' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw parseGeminiError(res.status, errJson);
    }

    return { success: true, message: 'Clé valide et connectée avec succès !' };
  } catch (err: any) {
    return {
      success: false,
      message: err.userMessage || err.message || 'Impossible de vérifier la clé.',
    };
  }
}

/**
 * Étape A: Inventaire des idées importantes
 */
export async function generateIdeaInventory(
  apiKey: string,
  sectionTitle: string,
  rawText: string,
  model = 'gemini-3.8-flash'
): Promise<IdeaItem[]> {
  const prompt = `
Tu es un analyste pédagogique de haut niveau. Analyse le texte ci-dessous extrait d'un livre (section: "${sectionTitle}") et produis un inventaire exhaustif et rigoureux de toutes les idées importantes qui doivent impérativement être transmises à un auditeur.

Catégories d'idées à repérer :
- these_centrale (thèse ou question directrice)
- concept_definition (concepts clés et définitions exactes)
- argument_raisonnement (démonstrations logiques et raisonnements)
- etape_methode (méthodes, processus, étapes pratiques)
- exemple_concret (exemples significatifs et métaphores de l'auteur)
- chiffre_fait_reference (données factuelles, citations, études citées)
- cause_effet (relations de causalité)
- nuance_objection (réserves, contre-arguments, cas limites, nuances)
- conclusion_implication (conclusions et conséquences)

Règles impératives :
- Produis entre 5 et 12 éléments clés selon la richesse du texte.
- N'invente aucun élément absent du texte.
- Réponds UNIQUEMENT sous forme d'un tableau JSON valide, sans balises markdown superflues si possible, respectant ce format :
[
  {
    "id": "item_1",
    "category": "these_centrale",
    "title": "Titre court de l'idée",
    "description": "Explication précise de l'idée et de sa signification",
    "sourceContext": "Court extrait ou contexte du livre"
  }
]

Texte source :
"""
${rawText.slice(0, 30000)}
"""
`;

  const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw parseGeminiError(res.status, err);
  }

  const data = await res.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawContent) {
    throw new GeminiServiceError('Réponse vide du modèle', res.status, 'Le modèle a retourné une réponse vide.');
  }

  try {
    const parsed = JSON.parse(cleanJsonString(rawContent));
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `item_${idx + 1}`,
        category: item.category || 'argument_raisonnement',
        title: item.title || `Point clé ${idx + 1}`,
        description: item.description || '',
        sourceContext: item.sourceContext || '',
      }));
    }
    throw new Error('Le format JSON attendu est un tableau.');
  } catch (parseErr: any) {
    throw new GeminiServiceError(
      `Erreur de parsing JSON: ${parseErr.message}`,
      undefined,
      'Impossible de décoder la structure des idées retournée par le modèle.'
    );
  }
}

/**
 * Étape B: Rédaction du script oral pédagogique
 */
export async function generateOralScript(
  apiKey: string,
  sectionTitle: string,
  rawText: string,
  ideaInventory: IdeaItem[],
  model = 'gemini-3.8-flash'
): Promise<string> {
  const inventoryList = ideaInventory
    .map((item, idx) => `${idx + 1}. [${item.category}] ${item.title}: ${item.description}`)
    .join('\n');

  const prompt = `
Tu es un narrateur et professeur exceptionnel. Ta mission est de rédiger un script d'explication orale pédagogique en français pour la section : "${sectionTitle}".

L'auditeur écoute cet enregistrement comme un podcast éducatif de très haute qualité. Le style doit être naturel, oral, fluide, vivant et captivant, tout en restant fidèle, rigoureux et précis.

INVENTAIRE DES IDÉES QUI DOIVENT ÊTRE INTÉGRÉES :
${inventoryList}

STRUCTURE ORALE OBLIGATOIRE :
1. Introduction : Présentation captivante du sujet, de l'enjeu et de la question centrale abordée.
2. Développement progressif : Explication didactique des concepts et raisonnements, avec des transitions fluides entre chaque idée.
3. Exemples et applications : Développe les illustrations concrètes pour ancrer la compréhension sans jamais inventer de faux exemples attribués à l'auteur.
4. Nuances et limites : Présente les réserves, objections ou subtilités de l'auteur.
5. Synthèse et conclusion : Résume la portée de la section.
6. « À retenir » : Un récapitulatif clair et percutant des 3 à 5 points essentiels que l'auditeur doit garder en mémoire.

CONSIGNES DE STYLE ORAL :
- Rédige entièrement en français oral soigné et naturel.
- Évite les formules robotiques (« Dans cette section, l'auteur nous explique » répétée 10 fois).
- Fais des phrases rythmées adaptées à la voix (respirations, clarté).
- Ne mets pas de balises audio complexes ni de métadonnées de réalisation. Uniquement le texte destiné à être lu par le système de voix.

Texte source pour référence :
"""
${rawText.slice(0, 30000)}
"""
`;

  const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw parseGeminiError(res.status, err);
  }

  const data = await res.json();
  const script = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!script) {
    throw new GeminiServiceError('Script vide', res.status, 'Le modèle a retourné un script vide.');
  }

  return script.trim();
}

/**
 * Étape C: Vérification de la couverture
 */
export async function verifyScriptCoverage(
  apiKey: string,
  sectionTitle: string,
  oralScript: string,
  ideaInventory: IdeaItem[],
  model = 'gemini-3.8-flash'
): Promise<CoverageReport> {
  const inventoryPrompt = JSON.stringify(
    ideaInventory.map((i) => ({ id: i.id, title: i.title, description: i.description }))
  );

  const prompt = `
Tu es un auditeur de qualité pédagogique. Vérifie minutieusement si le script oral ci-dessous couvre bien tous les éléments de l'inventaire des idées importantes de la section "${sectionTitle}".

INVENTAIRE :
${inventoryPrompt}

SCRIPT ORAL À AUDITER :
"""
${oralScript}
"""

Pour CHAQUE élément de l'inventaire, détermine son statut :
- "covered": L'idée est expliquée fidèlement et clairement dans le script.
- "partial": L'idée est mentionnée mais incomplète ou survolée.
- "missing": L'idée a été complètement omise.
- "manual_review": Présence incertaine ou formulation ambiguë nécessitant vérification humaine.

Règles :
- Réponds UNIQUEMENT en JSON valide :
{
  "items": [
    {
      "itemId": "item_1",
      "status": "covered",
      "explanation": "Pourquoi ce statut a été attribué",
      "matchedQuote": "Court passage du script illustrant la couverture si applicable"
    }
  ]
}
`;

  const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw parseGeminiError(res.status, err);
  }

  const data = await res.json();
  const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new GeminiServiceError('Rapport vide', res.status, 'Aucun rapport généré.');
  }

  try {
    const parsed = JSON.parse(cleanJsonString(rawJson));
    const items: CoverageItemResult[] = parsed.items || [];

    let coveredCount = 0;
    let partialCount = 0;
    let missingCount = 0;
    let manualReviewCount = 0;

    items.forEach((item) => {
      if (item.status === 'covered') coveredCount++;
      else if (item.status === 'partial') partialCount++;
      else if (item.status === 'missing') missingCount++;
      else manualReviewCount++;
    });

    const total = items.length || ideaInventory.length || 1;
    // Weighted score: covered = 100%, partial = 50%
    const score = Math.round(((coveredCount * 1.0 + partialCount * 0.5) / total) * 100);

    return {
      overallScorePercent: score,
      totalItems: total,
      coveredCount,
      partialCount,
      missingCount,
      manualReviewCount,
      items,
      lastCheckedAt: new Date().toISOString(),
      isPassing: missingCount === 0 && score >= 75,
    };
  } catch (err: any) {
    throw new GeminiServiceError(
      'Erreur analyse couverture',
      undefined,
      'Impossible de parser le rapport de couverture: ' + err.message
    );
  }
}

/**
 * Correction ciblée d'un script pour combler les idées manquantes
 */
export async function refineScriptWithMissingItems(
  apiKey: string,
  currentScript: string,
  missingItems: IdeaItem[],
  model = 'gemini-3.8-flash'
): Promise<string> {
  const missingText = missingItems
    .map((i, idx) => `${idx + 1}. ${i.title} : ${i.description}`)
    .join('\n');

  const prompt = `
Tu es un rédacteur pédagogique. Le script oral suivant a été jugé incomplet car il a oublié les éléments essentiels listés ci-dessous.

ÉLÉMENTS MANQUANTS À INTÉGRER :
${missingText}

SCRIPT ACTUEL :
"""
${currentScript}
"""

CONSIGNE :
Réécris le script en conservant les passages déjà réussis, mais en insérant naturellement les idées manquantes aux endroits les plus cohérents avec le fil narratif. Le texte final doit être un script oral complet, fluide et naturel en français. N'inclus aucune balise ni métadonnées, seulement le texte oral final.
`;

  const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw parseGeminiError(res.status, err);
  }

  const data = await res.json();
  const refined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return refined ? refined.trim() : currentScript;
}

/**
 * Génération Audio Text-to-Speech (TTS)
 * Utilise gemini-3.8-flash-lite-tts ou gemini-3.8-flash-tts
 * Retourne un Blob 'audio/wav' complet avec RIFF header à 24kHz mono.
 */
export async function generateSpeechAudio(
  apiKey: string,
  text: string,
  options: {
    model?: string;
    voiceName?: string;
    speechStyle?: string;
  } = {}
): Promise<{ audioBlob: Blob; durationSeconds: number }> {
  const model = options.model || 'gemini-3.8-flash-lite-tts';
  const voice = options.voiceName || 'Kore';
  const style = options.speechStyle || 'Pédagogique, clair, posé et chaleureux en français';

  // Format request for Gemini TTS API
  const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: text,
            speechMetadata: {
              style: style,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice,
          },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw parseGeminiError(res.status, err);
  }

  const data = await res.json();
  const base64Data = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!base64Data) {
    throw new GeminiServiceError(
      'Aucun flux audio retourné',
      res.status,
      "Le modèle n'a pas retourné de données audio. Vérifiez que le modèle sélectionné prend bien en charge la génération audio."
    );
  }

  // Convert base64 to binary ArrayBuffer and Blob
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioBlob = new Blob([bytes.buffer], { type: 'audio/wav' });

  // Calculate duration accurately from the 24kHz mono 16-bit WAV header or standard formula
  // Standard 24000Hz * 1 channel * 2 bytes/sample = 48000 bytes per second
  let durationSeconds = Math.max(1, Math.round((len - 44) / 48000));
  if (durationSeconds <= 0) {
    durationSeconds = Math.round(text.split(/\s+/).length / 2.3); // fallback estimate
  }

  return { audioBlob, durationSeconds };
}

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
  }
  return cleaned.trim();
}
