/**
 * French (Français) UI dictionary for FixMyPDF.
 * Implements `Dict` from ./en — every key present, same {placeholders}.
 */
import type { Dict } from "./en";

export const fr: Dict = {
  /* --------------------------------- header --------------------------------- */
  nav_tagline: "Chirurgie PDF ciblée",
  nav_trust: "100 % WebAssembly dans le navigateur • Aucun envoi vers un serveur",
  nav_how: "Comment ça marche",
  nav_faq: "FAQ",
  nav_pricing: "Tarifs",
  nav_language: "Langue",

  /* ---------------------------------- hero ---------------------------------- */
  hero_badge: "Triage déterministe des portails",
  hero_title_1: "Votre PDF a un problème.",
  hero_title_2: "On s’en occupe.",
  hero_sub:
    "Pas de boîte à outils compliquée. Indiquez-nous la limite d’envoi stricte ou les pages dont vous avez besoin, et notre moteur dans le navigateur le redimensionne et le rogne en toute sécurité — rien n’est jamais envoyé.",
  hero_choose_aria: "Choisir une réparation",
  mode_fit: "Faire tenir (limite cible)",
  mode_keep: "Garder des pages précises",
  mode_requirements: "“Le site web dit...”",
  mode_blank: "Supprimer les pages vides",
  mode_remove: "Supprimer des pages",
  mode_find: "Trouver les pages avec un mot",

  /* ------------------------------- upload zone ------------------------------ */
  upload_aria: "Envoyez un PDF — déposez-le ici ou appuyez sur Entrée pour parcourir",
  upload_title: "Déposez votre PDF ici",
  upload_sub: "ou cliquez pour parcourir — il ne quitte jamais votre appareil",
  upload_badge_1: "100 % dans le navigateur",
  upload_badge_2: "Sans compte",
  upload_badge_3: "Sans filigrane",
  upload_sample: "Essayer un document d’exemple",
  upload_sample_error: "Impossible de charger le document d’exemple.",
  upload_sample_error_desc: "Vérifiez votre connexion, ou déposez plutôt l’un de vos propres PDF.",

  /* -------------------------------- file bar -------------------------------- */
  file_pages: "{n} pages",
  file_current_size: "Taille actuelle :",
  file_encrypted: "protégé par mot de passe",
  file_switch: "Changer de fichier",

  /* ------------------------------ result panel ------------------------------ */
  result_panel_label: "Vérification et téléchargement",
  result_engine: "Moteur de vérification",
  result_idle_title: "Rien de traité pour l’instant",
  result_working_title: "Moteur en marche",
  result_awaiting: "En attente d’instructions",
  result_working: "Traitement…",
  result_passed: "Toutes les limites respectées",
  result_closest: "Meilleure correspondance trouvée",
  result_cut: "Découpe terminée",
  result_error_badge: "Erreur",
  result_error_title: "Un problème est survenu",
  result_idle_lead:
    "Dites au moteur quoi faire à gauche. Chaque réparation est vérifiée selon votre exigence exacte avant le téléchargement.",
  result_original: "Fichier d’origine",
  result_too_large: "(Trop volumineux)",
  result_fixed: "Résultat corrigé",
  result_best_effort:
    "Impossible de passer sous la limite sans nuire à la lisibilité. La version sûre la plus petite est jointe.",
  result_trimmed: "Réduit aux {kept} premières pages sur {total} (étape de conservation seule).",
  result_pages_out: "pages dans le nouveau fichier",
  result_try_again: "Réessayer",
  result_download: "Télécharger {name}",
  result_download_started: "Téléchargement lancé",
  result_download_note: "Aucun filigrane • Traitement privé dans la mémoire du navigateur",
  result_auto_download: "Téléchargement auto à la fin",
  result_shortcuts_hint: "Entrée — lancer la réparation · Échap — réinitialiser le panneau",
  result_progress_aria: "Progression : {n} %",

  /* ----------------------------- idle promises ------------------------------ */
  idle_fit_1: "Métadonnées retirées d’abord — le texte reste sélectionnable",
  idle_fit_2: "Échelle de rastérisation déterministe en cinq étapes",
  idle_fit_3: "S’arrête au premier passage qui tient",
  idle_keep_1: "Grille visuelle avec vignettes de pages en direct",
  idle_keep_2: "Saisissez des listes comme 3, 7, 12, 19-23",
  idle_keep_3: "Structure copiée sans perte, page par page",
  idle_requirements_1: "Règles collées analysées en local — sans IA",
  idle_requirements_2: "La limite de taille et de pages la plus stricte gagne",
  idle_requirements_3: "D’abord rogner au plafond de pages, puis compresser",
  idle_blank_1: "Analyse de la densité d’encre de chaque page",
  idle_blank_2: "Niveaux prudent, normal et tolérant",
  idle_blank_3: "Rien n’est retiré sans votre confirmation",
  idle_remove_1: "Plages comme 1-3, 8, 14-17 acceptées",
  idle_remove_2: "Coupes rapides : vides, impaires et paires",
  idle_remove_3: "Aperçu en direct de ce qui reste",
  idle_find_1: "Cherche dans la couche de texte de chaque page",
  idle_find_2: "Un extrait affiché pour chaque correspondance",
  idle_find_3: "Extraire toutes les correspondances en un clic",

  /* -------------------------------- fit mode -------------------------------- */
  fit_step: "Étape 1 • Cible en octets",
  fit_question: "Quelle est la limite de taille d’envoi ?",
  fit_preset_1: "Gouv / Visa",
  fit_preset_2: "Workday / RH",
  fit_preset_3: "Université",
  fit_common: "★ Courant",
  fit_exact_label: "Ou saisissez une limite exacte",
  fit_mb_aria: "Taille maximale en mégaoctets",
  fit_strip_meta: "Retirer les métadonnées de suivi cachées et l’EXIF de l’appareil photo",
  fit_grayscale: "Convertir en niveaux de gris (les documents B&W scannés se compressent de façon spectaculaire)",
  fit_cta: "Faire tenir en moins de {mb} MB",

  /* ---------------------------- requirements mode ---------------------------- */
  req_step: "Étape 1 • Collez les règles",
  req_question: "Que dit le site web ?",
  req_sub: "Collez les instructions d’envoi. Nous les lisons en local — sans IA, juste de l’analyse syntaxique.",
  req_placeholder: "p. ex. Le fichier envoyé doit être un PDF, taille maximale 2 MB, 10 pages maximum.",
  req_text_aria: "Texte des exigences",
  req_informational: "informatif",
  req_no_limit:
    "Aucune limite de taille ou de pages détectée pour l’instant — mentionnez quelque chose comme “moins de 2 MB” ou “10 pages max”.",
  req_strip_meta: "Retirer les métadonnées de suivi cachées",
  req_cta: "Faire tenir mon fichier",

  /* -------------------------------- keep mode -------------------------------- */
  keep_step: "Étape 1 • Choisissez vos pages",
  keep_question: "De quelles pages avez-vous besoin ?",
  keep_analyzing: "Analyse des pages…",
  keep_analyzing_aria: "Analyse des pages",
  keep_select_aria: "Sélectionner la page {n}",
  keep_page_alt: "Page {n}",
  keep_selected: "Sélection :",
  keep_none: "aucune",
  keep_all: "Tout sélectionner",
  keep_clear: "Effacer",
  keep_odd: "Pages impaires",
  keep_even: "Pages paires",
  keep_every: "Une page sur {n}",
  keep_spec_aria: "Numéros de pages",
  keep_spec_placeholder: "p. ex. 3, 7, 12, 19-23",
  keep_cta: "Extraire {n} pages",

  /* -------------------------------- blank mode ------------------------------- */
  blank_step: "Étape 1 • Chasse aux pages vides",
  blank_question: "Supprimer les pages vides ?",
  blank_threshold:
    "Une page compte comme vide quand moins de {pct} % de ses pixels portent de l’encre.",
  blank_scanning: "Analyse des pages…",
  blank_scanning_aria: "Analyse des pages",
  blank_found: "Pages vides trouvées",
  blank_pages: "{n} pages",
  blank_detected_note: "Les pages détectées ne sont retirées que lorsque vous appuyez sur le bouton.",
  blank_none: "Aucune page vide détectée — votre document est propre.",
  blank_cta: "Supprimer {n} pages vides",

  /* -------------------------------- remove mode ------------------------------ */
  remove_step: "Étape 1 • Marquez les coupes",
  remove_question: "Quelles pages doivent partir ?",
  remove_label: "Pages à supprimer",
  remove_aria: "Pages à supprimer",
  remove_placeholder: "p. ex. 1-3, 8, 14-17",
  remove_quick: "Actions rapides :",
  remove_qa_blanks: "Supprimer les pages vides",
  remove_qa_blanks_title: "Remplit avec les pages vides trouvées par l’analyse d’encre",
  remove_qa_blanks_pending: "Disponible une fois l’analyse des pages terminée",
  remove_qa_odd: "Supprimer les pages impaires",
  remove_qa_even: "Supprimer les pages paires",
  remove_qa_every: "Une sur {n}",
  remove_remaining: "{remaining} pages sur {total} resteront",
  remove_min_one: "Un PDF a besoin d’au moins une page — laissez quelque chose.",
  remove_cta: "Supprimer {n} pages",
  remove_no_blanks: "Aucune page vide trouvée",
  remove_no_blanks_desc: "Rien ne semblait vide avec la sensibilité normale.",
  remove_invalid_list: "Liste de pages invalide.",

  /* --------------------------------- find mode ------------------------------- */
  find_step: "Étape 1 • Cherchez du texte",
  find_question: "Trouver les pages contenant un mot",
  find_placeholder: "p. ex. Policy Schedule",
  find_aria: "Texte à chercher",
  find_search: "Rechercher",
  find_search_aria: "Lancer la recherche",
  find_searching: "Recherche dans les pages…",
  find_searching_aria: "Recherche",
  find_failed: "La recherche a échoué.",
  find_found_on: "Trouvé sur {pages} pages · {matches} correspondances",
  find_hits: "{n} correspondances",
  find_scanned:
    "Cela ressemble à un document scanné — sans couche de texte exploitable. Essayez plutôt Supprimer les pages vides ou Faire tenir.",
  find_no_hits: "Aucune page ne contient “{query}”. Essayez un mot plus court.",
  find_cta: "Extraire les {n} pages trouvées",

  /* ----------------------------- secondary cards ----------------------------- */
  sec_heading: "Autres solutions chirurgicales",
  sec_sub: "Choisissez la réparation exacte qu’il vous faut — sans labyrinthe de réglages.",
  sec_keep_title: "“Il ne me faut que certaines pages”",
  sec_keep_body: "Extrayez les pages de signature ou les tableaux d’impôts avec un sélecteur visuel de pages.",
  sec_keep_cta: "Ouvrir le sélecteur de pages →",
  sec_keep_preview_label: "Pages sélectionnées :",
  sec_req_title: "“Le site web dit...”",
  sec_req_body: "Collez les instructions du portail ; nous détectons localement les limites de taille et de pages.",
  sec_req_cta: "Coller les règles →",
  sec_blank_title: "Extripation des pages vides",
  sec_blank_body: "Détectez les pages vides du chargeur du scanner par analyse de densité d’encre.",
  sec_blank_cta: "Chercher les pages vides →",
  sec_blank_found: "6 pages vides trouvées",
  sec_blank_cut: "Les pages 4, 9, 11, 18, 22, 30 seront coupées",

  /* ------------------------------- how it works ------------------------------ */
  how_heading: "Comment ça marche",
  how_1_title: "Charger",
  how_1_body: "Votre fichier s’ouvre dans votre propre navigateur. Pas un octet n’est envoyé nulle part.",
  how_2_title: "Décrivez la réparation",
  how_2_body: "Une limite de taille, les pages à garder ou les règles collées du portail.",
  how_3_title: "Téléchargez",
  how_3_body: "Chaque résultat est vérifié selon l’exigence avant de vous être remis.",

  /* ------------------------------ privacy ribbon ----------------------------- */
  priv_title: "Vos documents restent dans votre navigateur",
  priv_body:
    "Les fichiers sont traités dans un moteur isolé dans le navigateur (WebAssembly). Pas un octet n’est envoyé vers un serveur.",
  priv_delay_strong: "0 ms",
  priv_delay_label: "latence cloud",
  priv_logged_strong: "0 octet",
  priv_logged_label: "enregistré",
  priv_requests_strong_zero: "0 externe",
  priv_requests_strong_n: "{n} externes",
  priv_requests_idle: "aucune réparation pour l’instant",
  priv_requests_label: "requêtes cross-origin pendant la réparation",
  priv_requests_tooltip:
    "Compteur en direct des requêtes réseau cross-origin observées pendant le travail du moteur. Votre fichier ne quitte jamais cet onglet — tout le traitement reste en mémoire locale.",

  /* ---------------------------------- footer --------------------------------- */
  foot_ready: "Moteur navigateur FixMyPDF • Prêt",
  foot_tagline: "Triage de documents côté client • Aucun compte requis",
  foot_engine: "Propulsé par pdf-lib + pdf.js — fonctionne entièrement dans votre navigateur",
  foot_fixed_on_device: "{n} PDF corrigés sur cet appareil",
  foot_fixed_on_device_one: "{n} PDF corrigé sur cet appareil",
  foot_privacy: "Politique de confidentialité",
  foot_terms: "Conditions d’utilisation",

  /* ----------------------------------- faq ----------------------------------- */
  faq_heading: "Des questions, des réponses",
  faq_sub: "La version courte de tout ce que les gens demandent avant de faire confiance à un outil PDF.",
  faq_1_q: "Mon fichier n’est vraiment jamais envoyé ?",
  faq_1_a:
    "Si, vraiment. Le moteur est du WebAssembly exécuté dans cet onglet — votre fichier est lu en mémoire, corrigé, puis rendu aussitôt. Observez le compteur de requêtes en direct du bandeau de confidentialité pendant une réparation : il reste à zéro requête externe. Vous pouvez même passer hors ligne après le chargement de la page et continuer à travailler.",
  faq_2_q: "Pourquoi est-ce gratuit ?",
  faq_2_a:
    "Comme la correction a lieu sur votre appareil, nous ne payons ni serveurs, ni stockage, ni bande passante. Une offre Pro payante pourrait arriver plus tard pour les gros traitements par lots — mais les réparations de base restent gratuites.",
  faq_3_q: "Mon texte restera-t-il sélectionnable après compression ?",
  faq_3_a:
    "En général oui. Le moteur essaie toujours d’abord la passe métadonnées, qui préserve chaque octet de texte. Ce n’est que si le fichier dépasse encore la limite qu’il re-rend les pages en images nettes — le PDF se voit identique, mais le texte devient partie intégrante de l’image.",
  faq_4_q: "Jusqu’à quelle taille pouvez-vous réduire mon PDF ?",
  faq_4_a:
    "Cela dépend du contenu. Les documents scannés rétrécissent couramment de 60–90 %. Si l’objectif est impossible sans détruire la lisibilité, le moteur s’arrête à la taille la plus sûre et vous le dit honnêtement au lieu de livrer une bouillie floue.",
  faq_5_q: "En quoi est-ce différent des convertisseurs en ligne ?",
  faq_5_a:
    "Les outils par envoi copient d’abord votre fichier sur leurs serveurs — attente, quotas de taille, politiques de conservation. FixMyPDF n’a rien de tout cela : pas de file d’attente, pas de compte, pas de serveur qui pourrait fuiter ou garder votre document.",
  faq_6_q: "Cela marche-t-il sur mon téléphone ?",
  faq_6_a:
    "Oui — cela fonctionne dans tout navigateur mobile moderne. Les fichiers très volumineux (des centaines de Mo) sont plus fluides sur ordinateur, simplement parce que les téléphones ont moins de mémoire.",
  faq_7_q: "Utilisez-vous des cookies ou des traqueurs ?",
  faq_7_a:
    "Pas d’analytique, pas de pixels publicitaires, pas de fingerprinting. L’application ne garde que trois choses en local sur votre appareil : votre thème, votre langue et le nombre de fichiers corrigés.",
  faq_8_q: "Quelles règles “Le site web dit…” comprend-il ?",
  faq_8_a:
    "Collez les instructions du portail telles quelles. Il repère de façon fiable les limites de taille comme “moins de 2 MB”, les plafonds de pages comme “10 pages maximum”, les formats de fichier comme PDF ou JPG, et les dimensions en pixels comme 600×600.",

  /* --------------------------------- pricing --------------------------------- */
  price_heading: "Tarifs simples",
  price_sub: "La promesse centrale — votre PDF, corrigé, sur votre appareil — est gratuite pour toujours.",
  price_free_name: "Gratuit",
  price_free_price: "$0",
  price_free_period: "pour toujours",
  price_free_f1: "Les six réparations",
  price_free_f2: "Utilisation locale illimitée",
  price_free_f3: "Sans compte, sans filigrane",
  price_free_f4: "Installable — fonctionne hors ligne",
  price_free_cta: "Lancez-vous — c’est gratuit",
  price_pro_name: "Pro",
  price_pro_soon: "Bientôt disponible",
  price_pro_price: "$4",
  price_pro_period: "paiement unique — pas un abonnement",
  price_pro_f1: "File d’attente par lots pour de nombreux fichiers",
  price_pro_f2: "Traitement prioritaire pour les monstres de 200 MB+",
  price_pro_f3: "Bundles ZIP pour les résultats par lots",
  price_pro_f4: "Soutient les humains derrière le projet",
  price_pro_cta: "Prévenez-moi au lancement",
  price_pro_note: "Paiement unique le jour du lancement. D’ici là, tout est gratuit.",

  /* ---------------------------------- legal ---------------------------------- */
  legal_privacy_title: "Politique de confidentialité",
  legal_terms_title: "Conditions d’utilisation",
  legal_lang_note: "Le texte légal est fourni en anglais.",
  legal_close: "Fermer",
  legal_last_updated: "Dernière mise à jour",

  /* ------------------------------ app-level misc ----------------------------- */
  ctx_fit: "Faire tenir · ≤ {size}",
  ctx_requirements: "Exigences du portail",
  toast_not_pdf: "Ce n’est pas un PDF",
  toast_not_pdf_desc: "FixMyPDF ne gère que les fichiers .pdf — choisissez le bon.",
  toast_big: "Gros fichier détecté",
  toast_big_desc: "Les fichiers de plus de 200 MB peuvent prendre un certain temps à traiter dans le navigateur — un peu de patience.",
  toast_read_fail: "Impossible de lire ce fichier comme un PDF.",
  toast_analyze_fail: "Impossible d’analyser ce document.",
  toast_fit_fail: "Un problème est survenu lors de la réduction du fichier.",
  toast_req_fail: "Impossible de satisfaire ces exigences.",
  toast_extract_fail: "Impossible d’extraire ces pages.",
  toast_remove_fail: "Impossible de supprimer ces pages.",
  error_boundary_title: "Quelque chose a cassé dans l’atelier",
  error_boundary_body:
    "Une erreur inattendue a fait planter cette partie de la page. Votre fichier n’a jamais été envoyé — recharger vous rend une page propre.",
  error_boundary_reload: "Recharger FixMyPDF",
};
