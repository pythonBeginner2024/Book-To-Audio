# BookToAudio — Transformation de livres PDF en résumés audio pédagogiques

BookToAudio est une application web gratuite, conçue pour transformer des livres numériques au format PDF en explications audio pédagogiques, section par section, grâce aux modèles d'IA **Google Gemini** et à la synthèse vocale officielle Gemini TTS.

L'application est entièrement conçue pour fonctionner comme un **site statique publiable gratuitement sur GitHub Pages**, sans nécessiter de serveur backend, d'abonnement d'hébergement ou de base de données distante.

---

## Sommaire

1. [Fonctionnalités principales](#fonctionnalités-principales)
2. [Architecture technique et confidentialité](#architecture-technique-et-confidentialité)
3. [Guide de publication pas-à-pas sur GitHub Pages](#guide-de-publication-pas-à-pas-sur-github-pages)
4. [Gestion sécurisée des clés API Google AI Studio](#gestion-sécurisée-des-clés-api-google-ai-studio)
5. [Méthode pédagogique en 4 étapes](#méthode-pédagogique-en-4-étapes)
6. [Formats audio et téléchargement](#formats-audio-et-téléchargement)
7. [Résolution des problèmes et quotas](#résolution-des-problèmes-et-quotas)

---

## 1. Fonctionnalités principales

- **Importation et extraction locale :** Lecture page par page des fichiers PDF grâce à `PDF.js` directement dans le navigateur. Vos livres restent sur votre appareil.
- **Détection des PDF scannés :** Avertissement immédiat si le document ne contient pas de couche de texte sélectionnable (l'OCR lourd n'est pas inclus dans cette version statique).
- **Structuration et découpage :** Reconnaissance automatique des titres, chapitres, sections numérotées, avec possibilité d'éditer, fusionner ou scinder les sections.
- **Méthode pédagogique multi-étapes :**
  - **Étape A :** Inventaire des idées maîtresses (thèses, concepts, arguments, exemples concrets, chiffres, nuances).
  - **Étape B :** Rédaction d'un script oral vivant en français (rythme podcast, transitions naturelles, synthèse « À retenir »).
  - **Étape C :** Audit rigoureux de couverture (score en %, repérage des idées oubliées et correction en 1 clic).
  - **Étape D :** Validation humaine avant toute génération audio.
- **Synthèse vocale Gemini TTS :** Génération de fichiers audio mono 24kHz (format WAV officiel) avec choix des voix (`Kore`, `Puck`, `Charon`, `Fenrir`, `Zephyr`, `Aoede`).
- **Lecteur intégré & Export ZIP :** Écoute directe dans l'application avec vitesse variable (0.8x à 2x), téléchargement de chaque fichier WAV et création d'une archive ZIP ordonnée avec table des matières (`index.txt`) et scripts.
- **Persistance locale IndexedDB :** Reprise automatique du travail après fermeture du navigateur.

---

## 2. Architecture technique et confidentialité

- **Front-end :** React 19, TypeScript, Vite, Tailwind CSS.
- **Moteur PDF :** `pdfjs-dist` (exécution côté client).
- **Stockage :** IndexedDB (`BookToAudioDB`) pour les gros volumes de texte et les fichiers binaires audio WAV.
- **Archives :** `jszip` (compression locale dans le navigateur).
- **Appels IA :** Requêtes HTTPS directes vers l'API REST officielle Google Generative Language (`https://generativelanguage.googleapis.com/v1beta/`).

### Traitement local vs distant
- **100% Local :** L'ouverture du PDF, l'extraction du texte, le découpage, le stockage des projets et des audios, la lecture et la compression ZIP s'exécutent entièrement sur votre machine.
- **Distant :** Seuls les passages de texte de la section en cours de traitement sont transmis aux serveurs de Google AI Studio lorsque vous lancez l'inventaire, le script ou la voix. Une confirmation d'autorisation vous est demandée avant tout envoi externe.

---

## 3. Guide de publication pas-à-pas sur GitHub Pages

### Étape 1 : Récupérer le code source
Depuis votre environnement Google AI Studio :
1. Cliquez sur le menu d'export ou téléchargez l'archive ZIP du projet, ou clonez le dépôt Git associé sur votre ordinateur.

### Étape 2 : Créer un dépôt GitHub public
1. Rendez-vous sur [GitHub](https://github.com/) et connectez-vous.
2. Cliquez sur **New Repository** (Nouveau dépôt).
3. Nommez le dépôt (par exemple `booktoaudio`).
4. Choisissez la visibilité **Public** (nécessaire pour bénéficier gratuitement de GitHub Pages avec GitHub Actions).
5. Ne cochez pas l'initialisation avec un README s'il existe déjà dans les fichiers exportés.
6. Cliquez sur **Create repository**.

### Étape 3 : Importer les fichiers du projet
Sur votre terminal local dans le dossier du projet :
```bash
git init
git add .
git commit -m "Initial commit — BookToAudio"
git branch -M main
git remote add origin https://github.com/<VOTRE-PSEUDO-GITHUB>/booktoaudio.git
git push -u origin main
```

### Étape 4 : Vérifier qu'aucune clé API n'est présente dans les fichiers
Avant ou après le push :
- Vérifiez que le fichier `.env` n'est pas commité (il est déjà exclu dans `.gitignore`).
- Les fichiers `.env.example` et le code source ne contiennent aucune clé API secrète.
- Toutes les clés API sont configurées par l'utilisateur directement depuis l'interface web.

### Étape 5 : Activer GitHub Actions et GitHub Pages
1. Dans votre dépôt GitHub, allez dans l'onglet **Settings** (Paramètres).
2. Dans le menu de gauche, cliquez sur **Pages**.
3. Dans la section **Build and deployment** :
   - Sous **Source**, sélectionnez **GitHub Actions**.
4. Le workflow situé dans `.github/workflows/deploy.yml` est alors automatiquement pris en compte.

### Étape 6 : Lancer et vérifier le déploiement
1. Rendez-vous dans l'onglet **Actions** de votre dépôt GitHub.
2. Vous verrez le workflow `Déploiement GitHub Pages — BookToAudio` se lancer.
3. Attendez environ 1 à 2 minutes jusqu'à ce que les étapes de build et de déploiement affichent une coche verte.

### Étape 7 : Retrouver votre URL publique
1. Retournez dans **Settings > Pages**.
2. L'URL publique de votre application y sera indiquée :
   `https://<VOTRE-PSEUDO-GITHUB>.github.io/booktoaudio/`
3. Ouvrez le lien : votre application BookToAudio est en ligne, opérationnelle et gratuite !

### Étape 8 : Mettre à jour l'application après une modification
Dès que vous effectuez des améliorations sur votre code local :
```bash
git add .
git commit -m "Mise à jour des fonctionnalités"
git push origin main
```
GitHub Actions reconstruira et déploiera la nouvelle version automatiquement en quelques instants.

---

## 4. Gestion sécurisée des clés API Google AI Studio

### Comment configurer vos clés dans l'application
1. Ouvrez l'application dans votre navigateur.
2. Cliquez sur **Clés API** dans la barre de navigation.
3. Remplissez le formulaire avec votre clé obtenue gratuitement sur [Google AI Studio](https://aistudio.google.com/).
4. Choisissez l'usage de la clé :
   - **Analyse et rédaction :** Utilisée pour dégager l'inventaire des idées et rédiger les scripts.
   - **Génération audio :** Utilisée pour la synthèse vocale Gemini TTS.
   - **Polyvalente :** Valable pour les deux tâches.
5. Cliquez sur **Tester la clé** pour vous assurer qu'elle est active et non restreinte.

### Stockage en mémoire vs Stockage sur l'appareil
- **Par défaut (Recommandé) :** Les clés restent uniquement dans la mémoire RAM de la session de votre navigateur et sont automatiquement effacées dès que vous fermez ou rechargez la page.
- **Enregistrer sur cet appareil :** Vous pouvez activer cette option pour conserver la clé dans le `localStorage` de votre navigateur. N'utilisez cette fonction que sur votre propre machine de confiance.

### Suppression et révocation
- Pour supprimer toutes les clés de votre navigateur, cliquez sur **Tout effacer** dans la page « Clés API ».
- Si vous soupçonnez qu'une clé a été compromise, supprimez-la immédiatement depuis l'interface de [Google AI Studio > API Keys](https://aistudio.google.com/app/apikey).

---

## 5. Méthode pédagogique en 4 étapes

Pour chaque section de votre livre, l'application applique une démarche rigoureuse :

1. **Étape A — Inventaire des idées :** Décompose le texte en thèses, concepts fondamentaux, raisonnements logiques, étapes méthodologiques, exemples significatifs et nuances de l'auteur.
2. **Étape B — Script oral pédagogique :** Rédige un script parlé fluide, conçu pour être écouté, comprenant une introduction claire, des transitions, des développements concrets et un récapitulatif « À retenir ».
3. **Étape C — Audit de couverture :** Compare le script avec l'inventaire initial et calcule un pourcentage de fidélité. Si des éléments essentiels sont omis, un bouton permet de les insérer automatiquement.
4. **Étape D — Validation humaine :** L'utilisateur peut retoucher le texte directement dans l'éditeur et valider le script, ce qui débloque la génération audio.

---

## 6. Formats audio et téléchargement

- **Format généré :** Fichier WAV standard (PCM 24 000 Hz, 16-bit mono, entête RIFF 44 octets). Ce format est natif, universellement compatible avec tous les lecteurs du marché et sans perte de qualité.
- **Téléchargement individuel :** Chaque section audio peut être téléchargée au format `.wav`.
- **Archive complète ZIP :** Générée directement dans le navigateur, elle rassemble tous les audios ordonnés (`01-titre.wav`, `02-titre.wav`), un sommaire récapitulatif `index.txt` et, facultativement, les scripts textuels `.txt`.

---

## 7. Résolution des problèmes et quotas

- **Erreur 400 (Clé invalide) :** Vérifiez que la clé commence bien par `AIzaSy...` et a été copiée sans espace superflu.
- **Erreur 403 (Accès refusé) :** Vérifiez que le service Generative Language API est activé sur votre projet Google Cloud.
- **Erreur 429 (Quota atteint) :** Les clés gratuites de Google AI Studio ont une limite de requêtes par minute (RPM) et par jour (RPD). Patientez quelques instants ou ajoutez une seconde clé dans les Paramètres API pour l'audio ou l'analyse.
- **PDF Scanné :** Si votre document PDF provient d'un scan papier sans reconnaissance de caractères (OCR), convertissez-le au préalable avec un outil d'OCR (comme Google Drive ou Adobe Acrobat) avant de l'importer dans BookToAudio.
