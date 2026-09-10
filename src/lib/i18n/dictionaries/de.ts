/**
 * German (Deutsch) UI dictionary for FixMyPDF.
 * Implements `Dict` from ./en — every key present, same {placeholders}.
 */
import type { Dict } from "./en";

export const de: Dict = {
  /* --------------------------------- header --------------------------------- */
  nav_tagline: "Gezielte PDF-Chirurgie",
  nav_trust: "100 % WebAssembly im Browser • Keine Server-Uploads",
  nav_how: "So funktioniert es",
  nav_faq: "FAQ",
  nav_pricing: "Preise",
  nav_language: "Sprache",

  /* ---------------------------------- hero ---------------------------------- */
  hero_badge: "Deterministische Portal-Triage",
  hero_title_1: "Ihr PDF ist fehlerhaft.",
  hero_title_2: "Wir reparieren das.",
  hero_sub:
    "Keine überladenen Werkzeugkästen. Nennen Sie uns die harte Upload-Grenze oder die Seiten, die Sie brauchen — unsere Browser-Engine verkleinert und stutzt die Datei sicher. Nichts wird je hochgeladen.",
  hero_choose_aria: "Reparatur wählen",
  mode_fit: "Auf Limit bringen (Zielgrenze)",
  mode_keep: "Bestimmte Seiten behalten",
  mode_requirements: "“Die Website sagt...”",
  mode_blank: "Leere Seiten entfernen",
  mode_remove: "Seiten entfernen",
  mode_find: "Seiten mit einem Wort finden",

  /* ------------------------------- upload zone ------------------------------ */
  upload_aria: "PDF hochladen — hier ablegen oder Enter zum Durchsuchen drücken",
  upload_title: "PDF hier ablegen",
  upload_sub: "oder zum Durchsuchen klicken — sie verlässt niemals Ihr Gerät",
  upload_badge_1: "100 % im Browser",
  upload_badge_2: "Kein Konto",
  upload_badge_3: "Kein Wasserzeichen",
  upload_sample: "Beispieldokument testen",
  upload_sample_error: "Beispieldokument konnte nicht geladen werden.",
  upload_sample_error_desc: "Prüfen Sie Ihre Verbindung oder legen Sie stattdessen eines Ihrer eigenen PDFs ab.",

  /* -------------------------------- file bar -------------------------------- */
  file_pages: "{n} Seiten",
  file_current_size: "Aktuelle Größe:",
  file_encrypted: "passwortgeschützt",
  file_switch: "Datei wechseln",

  /* ------------------------------ result panel ------------------------------ */
  result_panel_label: "Prüfung und Download",
  result_engine: "Prüf-Engine",
  result_idle_title: "Noch nichts verarbeitet",
  result_working_title: "Engine läuft",
  result_awaiting: "Wartet auf Anweisungen",
  result_working: "Arbeitet…",
  result_passed: "Alle Limits bestanden",
  result_closest: "Nächstbeste Übereinstimmung gefunden",
  result_cut: "Zuschnitt abgeschlossen",
  result_error_badge: "Fehler",
  result_error_title: "Etwas ist schiefgelaufen",
  result_idle_lead:
    "Sagen Sie der Engine links, was zu tun ist. Jede Reparatur wird vor dem Download gegen Ihre exakte Anforderung geprüft.",
  result_original: "Originaldatei",
  result_too_large: "(Zu groß)",
  result_fixed: "Korrigiertes Ergebnis",
  result_best_effort:
    "Ohne Lesbarkeitsverlust war das Limit nicht erreichbar. Die kleinste sichere Version liegt bei.",
  result_trimmed: "Auf die ersten {kept} von {total} Seiten gekürzt (Schritt “Nur behalten”).",
  result_pages_out: "Seiten in der neuen Datei",
  result_try_again: "Erneut versuchen",
  result_download: "{name} herunterladen",
  result_download_started: "Download gestartet",
  result_download_note: "Kein Wasserzeichen • Privat im Browser-Speicher verarbeitet",
  result_auto_download: "Automatischer Download nach Abschluss",
  result_shortcuts_hint: "Enter — Reparatur starten · Esc — Panel zurücksetzen",
  result_progress_aria: "Fortschritt: {n} %",

  /* ----------------------------- idle promises ------------------------------ */
  idle_fit_1: "Zuerst Metadaten entfernt — Text bleibt markierbar",
  idle_fit_2: "Deterministische Raster-Treppe in fünf Stufen",
  idle_fit_3: "Stoppt beim ersten Durchlauf, der passt",
  idle_keep_1: "Visuelles Raster mit Live-Seitenvorschauen",
  idle_keep_2: "Angaben wie 3, 7, 12, 19-23 eintippen",
  idle_keep_3: "Struktur verlustfrei Seite für Seite kopiert",
  idle_requirements_1: "Eingefügte Regeln werden lokal geparst — ohne KI",
  idle_requirements_2: "Die strengste Größen- und Seitenbegrenzung zählt",
  idle_requirements_3: "Erst auf den Seitendeckel kürzen, dann komprimieren",
  idle_blank_1: "Tintedichte-Scan jeder einzelnen Seite",
  idle_blank_2: "Stufen konservativ, normal und mild",
  idle_blank_3: "Nichts wird entfernt, bis Sie bestätigen",
  idle_remove_1: "Bereiche wie 1-3, 8, 14-17 unterstützt",
  idle_remove_2: "Schnellschnitte für leere, ungerade und gerade Seiten",
  idle_remove_3: "Live-Vorschau dessen, was bleibt",
  idle_find_1: "Durchsucht die Textebene jeder einzelnen Seite",
  idle_find_2: "Für jeden Treffer wird ein Auszug gezeigt",
  idle_find_3: "Alle Treffer mit einem Klick extrahieren",

  /* -------------------------------- fit mode -------------------------------- */
  fit_step: "Schritt 1 • Byte-Ziel",
  fit_question: "Wie hoch ist das Upload-Größenlimit?",
  fit_preset_1: "Behörde / Visa",
  fit_preset_2: "Workday / HR",
  fit_preset_3: "Universität",
  fit_common: "★ Häufig",
  fit_exact_label: "Oder exaktes Limit eingeben",
  fit_mb_aria: "Maximale Größe in Megabyte",
  fit_strip_meta: "Versteckte Tracking-Metadaten & Kamera-EXIF entfernen",
  fit_grayscale: "In Graustufen umwandeln (gescannte B&W-Dokumente komprimieren dramatisch)",
  fit_cta: "Unter {mb} MB bringen",
  fit_save_target: "Ziel speichern",
  fit_saved_toast: "{mb} MB auf diesem Gerät gespeichert",

  /* ---------------------------- requirements mode ---------------------------- */
  req_step: "Schritt 1 • Regeln einfügen",
  req_question: "Was sagt die Website?",
  req_sub: "Fügen Sie die Upload-Anweisungen ein. Wir lesen sie lokal — keine KI, nur Parsen.",
  req_placeholder: "z. B. Die hochgeladene Datei muss ein PDF sein, maximale Größe 2 MB, maximal 10 Seiten.",
  req_text_aria: "Anforderungstext",
  req_informational: "informativ",
  req_no_limit:
    "Noch keine Größen- oder Seitenbegrenzung erkannt — erwähnen Sie etwas wie “unter 2 MB” oder “maximal 10 Seiten”.",
  req_strip_meta: "Versteckte Tracking-Metadaten entfernen",
  req_cta: "Datei passend machen",

  /* -------------------------------- keep mode -------------------------------- */
  keep_step: "Schritt 1 • Seiten auswählen",
  keep_question: "Welche Seiten brauchen Sie?",
  keep_analyzing: "Seiten werden analysiert…",
  keep_analyzing_aria: "Seiten werden analysiert",
  keep_select_aria: "Seite {n} auswählen",
  keep_page_alt: "Seite {n}",
  keep_selected: "Ausgewählt:",
  keep_none: "keine",
  keep_all: "Alle auswählen",
  keep_clear: "Leeren",
  keep_odd: "Ungerade Seiten",
  keep_even: "Gerade Seiten",
  keep_every: "Jede {n}. Seite",
  keep_spec_aria: "Seitenzahlen",
  keep_spec_placeholder: "z. B. 3, 7, 12, 19-23",
  keep_cta: "{n} Seiten extrahieren",

  /* -------------------------------- blank mode ------------------------------- */
  blank_step: "Schritt 1 • Leere suchen",
  blank_question: "Leere Seiten entfernen?",
  blank_threshold:
    "Eine Seite gilt als leer, wenn weniger als {pct} % ihrer Pixel Tinte tragen.",
  blank_scanning: "Seiten werden gescannt…",
  blank_scanning_aria: "Seiten werden gescannt",
  blank_found: "Leere Seiten gefunden",
  blank_pages: "{n} Seiten",
  blank_detected_note: "Gefundene Seiten werden erst beim Klick auf den Button entfernt.",
  blank_none: "Keine leeren Seiten gefunden — Ihr Dokument ist sauber.",
  blank_cta: "{n} leere Seiten entfernen",

  /* -------------------------------- remove mode ------------------------------ */
  remove_step: "Schritt 1 • Schnitte markieren",
  remove_question: "Welche Seiten sollen weg?",
  remove_label: "Zu entfernende Seiten",
  remove_aria: "Zu entfernende Seiten",
  remove_placeholder: "z. B. 1-3, 8, 14-17",
  remove_quick: "Schnellaktionen:",
  remove_qa_blanks: "Leere Seiten entfernen",
  remove_qa_blanks_title: "Trägt die leeren Seiten aus dem Tinte-Scan ein",
  remove_qa_blanks_pending: "Verfügbar, sobald der Seitenscan fertig ist",
  remove_qa_odd: "Ungerade Seiten entfernen",
  remove_qa_even: "Gerade Seiten entfernen",
  remove_qa_every: "Jede {n}.",
  remove_remaining: "{remaining} von {total} Seiten bleiben übrig",
  remove_min_one: "Ein PDF braucht mindestens eine Seite — lassen Sie etwas übrig.",
  remove_cta: "{n} Seiten entfernen",
  remove_no_blanks: "Keine leeren Seiten gefunden",
  remove_no_blanks_desc: "Bei normaler Empfindlichkeit wirkte nichts leer.",
  remove_invalid_list: "Ungültige Seitenliste.",

  /* --------------------------------- find mode ------------------------------- */
  find_step: "Schritt 1 • Text suchen",
  find_question: "Seiten finden, die ein Wort enthalten",
  find_placeholder: "z. B. Policy Schedule",
  find_aria: "Suchtext",
  find_search: "Suchen",
  find_search_aria: "Suche starten",
  find_searching: "Seiten werden durchsucht…",
  find_searching_aria: "Suche läuft",
  find_failed: "Suche fehlgeschlagen.",
  find_found_on: "Gefunden auf {pages} Seiten · {matches} Treffer",
  find_hits: "{n} Treffer",
  find_scanned:
    "Das sieht nach einem gescannten Dokument aus — es hat keine durchsuchbare Textebene. Versuchen Sie stattdessen Leere Seiten entfernen oder Auf Limit bringen.",
  find_no_hits: "Keine Seite enthält “{query}”. Probieren Sie ein kürzeres Wort.",
  find_cta: "{n} gefundene Seiten extrahieren",

  /* ----------------------------- secondary cards ----------------------------- */
  sec_heading: "Weitere chirurgische Lösungen",
  sec_sub: "Wählen Sie die exakte Reparatur, die Sie brauchen — kein Einstellungs-Labyrinth.",
  sec_keep_title: "“Ich brauche nur bestimmte Seiten”",
  sec_keep_body: "Unterschriftenseiten oder Steuertabellen extrahieren mit visuellem Seitenwähler.",
  sec_keep_cta: "Seitenwähler öffnen →",
  sec_keep_preview_label: "Ausgewählte Seiten:",
  sec_req_title: "“Die Website sagt...”",
  sec_req_body: "Portal-Anweisungen einfügen; wir erkennen Größen- und Seitenlimits lokal.",
  sec_req_cta: "Regeln einfügen →",
  sec_blank_title: "Leere Seiten herausschneiden",
  sec_blank_body: "Leere Scannereinzugsseiten per Tintedichte-Analyse aufspüren.",
  sec_blank_cta: "Auf Leere scannen →",
  sec_blank_found: "6 leere Seiten gefunden",
  sec_blank_cut: "Seiten 4, 9, 11, 18, 22, 30 werden entfernt",

  /* ------------------------------- how it works ------------------------------ */
  how_heading: "So funktioniert es",
  how_1_title: "Laden",
  how_1_body: "Ihre Datei wird in Ihrem eigenen Browser geöffnet. Kein Byte verlässt Ihr Gerät.",
  how_2_title: "Reparatur beschreiben",
  how_2_body: "Eine Größenbegrenzung, die zu behaltenden Seiten oder die eingefügten Portal-Regeln.",
  how_3_title: "Herunterladen",
  how_3_body: "Jedes Ergebnis wird vor der Übergabe gegen die Anforderung geprüft.",

  /* ------------------------------ privacy ribbon ----------------------------- */
  priv_title: "Ihre Dokumente bleiben in Ihrem Browser",
  priv_body:
    "Dateien werden in einer isolierten Browser-Engine (WebAssembly) verarbeitet. Kein Byte wird auf einen Server hochgeladen.",
  priv_delay_strong: "0 ms",
  priv_delay_label: "Cloud-Verzögerung",
  priv_logged_strong: "0 Byte",
  priv_logged_label: "protokolliert",
  priv_requests_strong_zero: "0 externe",
  priv_requests_strong_n: "{n} externe",
  priv_requests_idle: "noch keine Reparatur",
  priv_requests_label: "Cross-Origin-Anfragen während der Reparatur",
  priv_requests_tooltip:
    "Live-Zähler der Cross-Origin-Netzwerkanfragen, die während der Arbeit der Engine beobachtet wurden. Ihre Datei verlässt diesen Tab nie — die gesamte Verarbeitung bleibt im lokalen Speicher.",

  /* ---------------------------------- footer --------------------------------- */
  foot_ready: "FixMyPDF Browser-Engine • Bereit",
  foot_tagline: "Dokumenten-Triage im Browser • Kein Konto nötig",
  foot_engine: "Angetrieben von pdf-lib + pdf.js — läuft vollständig in Ihrem Browser",
  foot_fixed_on_device: "{n} PDFs auf diesem Gerät repariert",
  foot_fixed_on_device_one: "{n} PDF auf diesem Gerät repariert",
  foot_privacy: "Datenschutz",
  foot_terms: "Nutzungsbedingungen",

  /* ----------------------------------- faq ----------------------------------- */
  faq_heading: "Fragen, beantwortet",
  faq_sub: "Die Kurzfassung von allem, was Leute fragen, bevor sie einem PDF-Tool vertrauen.",
  faq_1_q: "Wird meine Datei wirklich nie hochgeladen?",
  faq_1_a:
    "Ja, wirklich. Die Engine ist WebAssembly in diesem Tab — Ihre Datei wird in den Speicher gelesen, repariert und direkt zurückgegeben. Beobachten Sie den Live-Anfragezähler im Datenschutz-Banner während einer Reparatur: Er bleibt bei null externen Anfragen. Sie können nach dem Laden der Seite sogar offline gehen und weiterarbeiten.",
  faq_2_q: "Warum ist es kostenlos?",
  faq_2_a:
    "Weil die Reparatur auf Ihrem Gerät passiert, zahlen wir keine Server, keinen Speicher und keine Bandbreite. Eine bezahlte Pro-Stufe könnte später für große Sammelaufträge kommen — die Kernreparaturen bleiben kostenlos.",
  faq_3_q: "Bleibt mein Text nach der Komprimierung markierbar?",
  faq_3_a:
    "Meistens ja. Die Engine versucht immer zuerst den Metadaten-Durchgang, der jedes Byte Text unangetastet lässt. Nur wenn die Datei immer noch über dem Limit liegt, werden die Seiten als scharfe Bilder neu gerendert — das PDF sieht gleich aus, aber der Text wird Teil des Bildes.",
  faq_4_q: "Wie klein können Sie mein PDF machen?",
  faq_4_a:
    "Das hängt vom Inhalt ab. Gescannte Dokumente schrumpfen routinemäßig um 60–90 %. Wenn das Ziel ohne Zerstörung der Lesbarkeit unerreichbar ist, stoppt die Engine bei der sichersten Größe und sagt es Ihnen ehrlich — statt etwas Unscharfes auszuliefern.",
  faq_5_q: "Was ist der Unterschied zu Online-Konvertern?",
  faq_5_a:
    "Upload-basierte Tools kopieren Ihre Datei zuerst auf ihre Server — Wartezeiten, Größenkontingente, Aufbewahrungsrichtlinien. FixMyPDF hat nichts davon: keine Warteschlange, kein Konto, kein Server, der Ihr Dokument speichern oder durchsickern lassen könnte.",
  faq_6_q: "Funktioniert das auf meinem Handy?",
  faq_6_a:
    "Ja — es läuft in jedem modernen mobilen Browser. Sehr große Dateien (Hunderte MB) laufen auf dem Desktop flüssiger, einfach weil Handys weniger Speicher haben.",
  faq_7_q: "Verwenden Sie Cookies oder Tracker?",
  faq_7_a:
    "Kein Analytics, keine Werbe-Pixel, kein Fingerprinting. Die App speichert genau drei Dinge lokal auf Ihrem Gerät: Ihr Design, Ihre Sprache und wie viele Dateien Sie repariert haben.",
  faq_8_q: "Welche Regeln versteht “Die Website sagt…”?",
  faq_8_a:
    "Fügen Sie die Portal-Anweisungen eins zu eins ein. Es findet zuverlässig Größenlimits wie “unter 2 MB”, Seitendeckel wie “maximal 10 Seiten”, Dateiformate wie PDF oder JPG und Pixelmaße wie 600×600.",

  /* --------------------------------- pricing --------------------------------- */
  price_heading: "Einfache Preise",
  price_sub: "Das Kernversprechen — Ihr PDF, repariert, auf Ihrem Gerät — bleibt für immer kostenlos.",
  price_free_name: "Kostenlos",
  price_free_price: "$0",
  price_free_period: "für immer",
  price_free_f1: "Alle sechs Reparaturen",
  price_free_f2: "Unbegrenzte lokale Nutzung",
  price_free_f3: "Kein Konto, kein Wasserzeichen",
  price_free_f4: "Installierbar — funktioniert offline",
  price_free_cta: "Jetzt reparieren — kostenlos",
  price_pro_name: "Pro",
  price_pro_soon: "Demnächst",
  price_pro_price: "$4",
  price_pro_period: "einmalig — kein Abo",
  price_pro_f1: "Stapel-Warteschlange für viele Dateien",
  price_pro_f2: "Prioritätsverarbeitung für 200-MB+-Monster",
  price_pro_f3: "ZIP-Bündel für Stapelergebnisse",
  price_pro_f4: "Unterstützt die Menschen dahinter",
  price_pro_cta: "Beim Start benachrichtigen",
  price_pro_note: "Einmalige Zahlung am Starttag. Bis dahin ist alles kostenlos.",

  /* ---------------------------------- legal ---------------------------------- */
  legal_privacy_title: "Datenschutzerklärung",
  legal_terms_title: "Nutzungsbedingungen",
  legal_lang_note: "Der Rechtstext wird auf Englisch bereitgestellt.",
  legal_close: "Schließen",
  legal_last_updated: "Zuletzt aktualisiert",

  /* ------------------------------ app-level misc ----------------------------- */
  ctx_fit: "Auf Limit bringen · ≤ {size}",
  ctx_requirements: "Portal-Anforderungen",
  toast_not_pdf: "Das ist kein PDF",
  toast_not_pdf_desc: "FixMyPDF verarbeitet nur .pdf-Dateien — wählen Sie die richtige.",
  toast_big: "Große Datei erkannt",
  toast_big_desc: "Dateien über 200 MB brauchen im Browser eine Weile — bitte kurz durchhalten.",
  toast_read_fail: "Diese Datei konnte nicht als PDF gelesen werden.",
  toast_analyze_fail: "Dieses Dokument konnte nicht analysiert werden.",
  toast_fit_fail: "Beim Verkleinern der Datei ist etwas schiefgelaufen.",
  toast_req_fail: "Diese Anforderungen konnten nicht erfüllt werden.",
  toast_extract_fail: "Diese Seiten konnten nicht extrahiert werden.",
  toast_remove_fail: "Diese Seiten konnten nicht entfernt werden.",
  error_boundary_title: "In der Werkstatt ist etwas kaputtgegangen",
  error_boundary_body:
    "Ein unerwarteter Fehler hat diesen Teil der Seite abgeschossen. Ihre Datei wurde nie hochgeladen — Neuladen setzt alles zurück.",
  error_boundary_reload: "FixMyPDF neu laden",
};
