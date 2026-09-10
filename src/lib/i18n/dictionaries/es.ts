/**
 * Spanish (Español) UI dictionary for FixMyPDF.
 * Implements `Dict` from ./en — every key present, same {placeholders}.
 */
import type { Dict } from "./en";

export const es: Dict = {
  /* --------------------------------- header --------------------------------- */
  nav_tagline: "Cirugía de PDF precisa",
  nav_trust: "100% WebAssembly en el navegador • Cero subidas al servidor",
  nav_how: "Cómo funciona",
  nav_faq: "Preguntas frecuentes",
  nav_pricing: "Precios",
  nav_language: "Idioma",

  /* ---------------------------------- hero ---------------------------------- */
  hero_badge: "Tríaje determinista de portales",
  hero_title_1: "Tu PDF está mal.",
  hero_title_2: "Lo arreglamos.",
  hero_sub:
    "Sin cajas de herramientas complicadas. Dinos el límite estricto de subida o las páginas que necesitas, y nuestro motor del navegador lo redimensiona y recorta con seguridad — nada se sube jamás.",
  hero_choose_aria: "Elige una solución",
  mode_fit: "Haz que quepa (límite objetivo)",
  mode_keep: "Conservar páginas concretas",
  mode_requirements: "“El sitio web dice...”",
  mode_blank: "Quitar páginas en blanco",
  mode_remove: "Quitar páginas",
  mode_find: "Buscar páginas con una palabra",

  /* ------------------------------- upload zone ------------------------------ */
  upload_aria: "Sube un PDF — suéltalo aquí o pulsa Enter para explorar",
  upload_title: "Suelta tu PDF aquí",
  upload_sub: "o haz clic para explorar — nunca sale de tu dispositivo",
  upload_badge_1: "100% en el navegador",
  upload_badge_2: "Sin cuenta",
  upload_badge_3: "Sin marca de agua",
  upload_sample: "Prueba un documento de ejemplo",
  upload_sample_error: "No se pudo cargar el documento de ejemplo.",
  upload_sample_error_desc: "Comprueba tu conexión o suelta uno de tus propios PDF.",

  /* -------------------------------- file bar -------------------------------- */
  file_pages: "{n} páginas",
  file_current_size: "Tamaño actual:",
  file_encrypted: "protegido con contraseña",
  file_switch: "Cambiar archivo",

  /* ------------------------------ result panel ------------------------------ */
  result_panel_label: "Verificación y descarga",
  result_engine: "Motor de verificación",
  result_idle_title: "Nada procesado todavía",
  result_working_title: "Motor en marcha",
  result_awaiting: "Esperando instrucciones",
  result_working: "Trabajando…",
  result_passed: "Supera todos los límites",
  result_closest: "Mejor coincidencia encontrada",
  result_cut: "Recorte completado",
  result_error_badge: "Error",
  result_error_title: "Algo salió mal",
  result_idle_lead:
    "Dile al motor qué hacer a la izquierda. Cada arreglo se verifica contra tu requisito exacto antes de la descarga.",
  result_original: "Archivo original",
  result_too_large: "(Demasiado grande)",
  result_fixed: "Resultado corregido",
  result_best_effort:
    "No pudimos bajar del límite sin dañar la legibilidad. Te adjuntamos la versión segura más pequeña.",
  result_trimmed: "Recortado a las primeras {kept} de {total} páginas (paso de solo conservar).",
  result_pages_out: "páginas en el archivo nuevo",
  result_try_again: "Inténtalo de nuevo",
  result_download: "Descargar {name}",
  result_download_started: "Descarga iniciada",
  result_download_note: "Sin marca de agua • Procesado en privado en la memoria del navegador",
  result_auto_download: "Descarga automática al terminar",
  result_shortcuts_hint: "Enter — ejecutar el arreglo · Esc — reiniciar el panel",
  result_progress_aria: "Progreso: {n}%",

  /* ----------------------------- idle promises ------------------------------ */
  idle_fit_1: "Metadatos fuera primero — el texto sigue seleccionable",
  idle_fit_2: "Escalera de rasterizado determinista de cinco pasos",
  idle_fit_3: "Se detiene en el primer pase que cabe",
  idle_keep_1: "Cuadrícula visual con miniaturas de página en vivo",
  idle_keep_2: "Escribe listas como 3, 7, 12, 19-23",
  idle_keep_3: "Estructura copiada sin pérdidas página a página",
  idle_requirements_1: "Las reglas pegadas se analizan localmente — sin IA",
  idle_requirements_2: "Gana el límite de tamaño y de páginas más estricto",
  idle_requirements_3: "Primero recortar al tope de páginas, luego comprimir",
  idle_blank_1: "Escaneo de densidad de tinta en cada página",
  idle_blank_2: "Niveles conservador, normal y permisivo",
  idle_blank_3: "No se quita nada hasta que lo confirmes",
  idle_remove_1: "Se admiten rangos como 1-3, 8, 14-17",
  idle_remove_2: "Cortes rápidos para en blanco, impares y pares",
  idle_remove_3: "Vista previa en vivo de lo que queda",
  idle_find_1: "Busca en la capa de texto de cada página",
  idle_find_2: "Muestra un fragmento por cada coincidencia",
  idle_find_3: "Extrae todas las coincidencias en un clic",

  /* -------------------------------- fit mode -------------------------------- */
  fit_step: "Paso 1 • Objetivo en bytes",
  fit_question: "¿Cuál es el límite de tamaño de subida?",
  fit_preset_1: "Gobierno / Visa",
  fit_preset_2: "Workday / RR. HH.",
  fit_preset_3: "Universidad",
  fit_common: "★ Frecuente",
  fit_exact_label: "O escribe un límite exacto",
  fit_mb_aria: "Tamaño máximo en megabytes",
  fit_strip_meta: "Quitar metadatos de rastreo ocultos y EXIF de cámara",
  fit_grayscale: "Convertir a escala de grises (los documentos escaneados en B&W se comprimen muchísimo)",
  fit_cta: "Haz que quepa en menos de {mb} MB",
  fit_save_target: "Guardar objetivo",
  fit_saved_toast: "{mb} MB guardados en este dispositivo",

  /* ---------------------------- requirements mode ---------------------------- */
  req_step: "Paso 1 • Pega las reglas",
  req_question: "¿Qué dice el sitio web?",
  req_sub: "Pega las instrucciones de subida. Las leemos localmente — sin IA, solo análisis sintáctico.",
  req_placeholder: "p. ej. El archivo subido debe ser un PDF, tamaño máximo 2 MB, máximo 10 páginas.",
  req_text_aria: "Texto de los requisitos",
  req_informational: "informativo",
  req_no_limit:
    "Aún no se detecta ningún límite de tamaño ni de páginas — menciona algo como “menos de 2 MB” o “máximo 10 páginas”.",
  req_strip_meta: "Quitar metadatos de rastreo ocultos",
  req_cta: "Ajusta mi archivo",

  /* -------------------------------- keep mode -------------------------------- */
  keep_step: "Paso 1 • Elige tus páginas",
  keep_question: "¿Qué páginas necesitas?",
  keep_analyzing: "Analizando páginas…",
  keep_analyzing_aria: "Analizando páginas",
  keep_select_aria: "Seleccionar página {n}",
  keep_page_alt: "Página {n}",
  keep_selected: "Seleccionadas:",
  keep_none: "ninguna",
  keep_all: "Seleccionar todas",
  keep_clear: "Limpiar",
  keep_odd: "Páginas impares",
  keep_even: "Páginas pares",
  keep_every: "Cada {n}ª página",
  keep_spec_aria: "Números de página",
  keep_spec_placeholder: "p. ej. 3, 7, 12, 19-23",
  keep_cta: "Extraer {n} páginas",

  /* -------------------------------- blank mode ------------------------------- */
  blank_step: "Paso 1 • Busca las vacías",
  blank_question: "¿Quitar páginas en blanco?",
  blank_threshold:
    "Una página cuenta como en blanco cuando menos del {pct}% de sus píxeles llevan tinta.",
  blank_scanning: "Escaneando páginas…",
  blank_scanning_aria: "Escaneando páginas",
  blank_found: "En blanco encontradas",
  blank_pages: "{n} páginas",
  blank_detected_note: "Las páginas detectadas solo se quitan cuando pulsas el botón.",
  blank_none: "No se detectaron páginas en blanco — tu documento está limpio.",
  blank_cta: "Quitar {n} páginas en blanco",

  /* -------------------------------- remove mode ------------------------------ */
  remove_step: "Paso 1 • Marca los cortes",
  remove_question: "¿Qué páginas deben irse?",
  remove_label: "Páginas a quitar",
  remove_aria: "Páginas a quitar",
  remove_placeholder: "p. ej. 1-3, 8, 14-17",
  remove_quick: "Acciones rápidas:",
  remove_qa_blanks: "Quitar páginas en blanco",
  remove_qa_blanks_title: "Rellena con las páginas en blanco halladas por el escaneo de tinta",
  remove_qa_blanks_pending: "Disponible cuando termine el escaneo de páginas",
  remove_qa_odd: "Quitar páginas impares",
  remove_qa_even: "Quitar páginas pares",
  remove_qa_every: "Cada {n}ª",
  remove_remaining: "Quedarán {remaining} de {total} páginas",
  remove_min_one: "Un PDF necesita al menos una página — deja algo atrás.",
  remove_cta: "Quitar {n} páginas",
  remove_no_blanks: "No se encontraron páginas en blanco",
  remove_no_blanks_desc: "Nada parecía vacío con la sensibilidad normal.",
  remove_invalid_list: "Lista de páginas no válida.",

  /* --------------------------------- find mode ------------------------------- */
  find_step: "Paso 1 • Busca texto",
  find_question: "Encuentra páginas que contengan una palabra",
  find_placeholder: "p. ej. Policy Schedule",
  find_aria: "Texto a buscar",
  find_search: "Buscar",
  find_search_aria: "Ejecutar búsqueda",
  find_searching: "Buscando páginas…",
  find_searching_aria: "Buscando",
  find_failed: "La búsqueda falló.",
  find_found_on: "Encontrado en {pages} páginas · {matches} coincidencias",
  find_hits: "{n} coincidencias",
  find_scanned:
    "Esto parece un documento escaneado — no tiene capa de texto buscable. Prueba Quitar páginas en blanco o Haz que quepa.",
  find_no_hits: "Ninguna página contiene “{query}”. Prueba con una palabra más corta.",
  find_cta: "Extraer las {n} páginas encontradas",

  /* ----------------------------- secondary cards ----------------------------- */
  sec_heading: "Otras soluciones quirúrgicas",
  sec_sub: "Elige el arreglo exacto que necesitas — sin laberinto de ajustes.",
  sec_keep_title: "“Solo necesito ciertas páginas”",
  sec_keep_body: "Extrae páginas de firma o tablas de impuestos con un selector visual de páginas.",
  sec_keep_cta: "Abrir selector de páginas →",
  sec_keep_preview_label: "Páginas seleccionadas:",
  sec_req_title: "“El sitio web dice...”",
  sec_req_body: "Pega las instrucciones del portal; detectamos los límites de tamaño y de páginas localmente.",
  sec_req_cta: "Pegar las reglas →",
  sec_blank_title: "Extirpa páginas en blanco",
  sec_blank_body: "Detecta páginas vacías del alimentador del escáner con análisis de densidad de tinta.",
  sec_blank_cta: "Buscar páginas en blanco →",
  sec_blank_found: "6 páginas en blanco encontradas",
  sec_blank_cut: "Las páginas 4, 9, 11, 18, 22, 30 se recortarán",

  /* ------------------------------- how it works ------------------------------ */
  how_heading: "Cómo funciona",
  how_1_title: "Cargar",
  how_1_body: "Tu archivo se abre en tu propio navegador. Ni un byte se envía a ninguna parte.",
  how_2_title: "Describe el arreglo",
  how_2_body: "Un límite de tamaño, las páginas que conservas o las reglas pegadas del portal.",
  how_3_title: "Descarga",
  how_3_body: "Cada resultado se verifica contra el requisito antes de dártelo.",

  /* ------------------------------ privacy ribbon ----------------------------- */
  priv_title: "Tus documentos se quedan en tu navegador",
  priv_body:
    "Los archivos se procesan en un motor aislado dentro del navegador (WebAssembly). Ni un byte se sube a ningún servidor.",
  priv_delay_strong: "0 ms",
  priv_delay_label: "retraso de nube",
  priv_logged_strong: "0 bytes",
  priv_logged_label: "registrados",
  priv_requests_strong_zero: "0 externas",
  priv_requests_strong_n: "{n} externas",
  priv_requests_idle: "aún sin arreglo",
  priv_requests_label: "peticiones de origen cruzado durante el arreglo",
  priv_requests_tooltip:
    "Recuento en vivo de peticiones de red de origen cruzado observadas mientras el motor trabajaba. Tu archivo nunca sale de esta pestaña — todo el procesamiento ocurre en memoria local.",

  /* ---------------------------------- footer --------------------------------- */
  foot_ready: "Motor de navegador FixMyPDF • Listo",
  foot_tagline: "Tríaje de documentos en el cliente • Sin cuenta necesaria",
  foot_engine: "Impulsado por pdf-lib + pdf.js — funciona íntegramente en tu navegador",
  foot_fixed_on_device: "{n} PDF corregidos en este dispositivo",
  foot_fixed_on_device_one: "{n} PDF corregido en este dispositivo",
  foot_privacy: "Política de privacidad",
  foot_terms: "Términos del servicio",

  /* ----------------------------------- faq ----------------------------------- */
  faq_heading: "Preguntas, respondidas",
  faq_sub: "La versión corta de todo lo que la gente pregunta antes de confiar en una herramienta de PDF.",
  faq_1_q: "¿De verdad mi archivo nunca se sube?",
  faq_1_a:
    "Sí, de verdad. El motor es WebAssembly ejecutándose dentro de esta pestaña — tu archivo se lee en memoria, se corrige y se te devuelve directamente. Observa el contador de peticiones en vivo de la cinta de privacidad durante un arreglo: se queda en cero peticiones externas. Incluso puedes desconectarte cuando la página cargue y seguir trabajando.",
  faq_2_q: "¿Por qué es gratis?",
  faq_2_a:
    "Como la corrección ocurre en tu dispositivo, no pagamos servidores, almacenamiento ni ancho de banda. Puede llegar más adelante un nivel Pro de pago para lotes pesados — pero las correcciones básicas siguen gratis.",
  faq_3_q: "¿Mi texto seguirá siendo seleccionable tras la compresión?",
  faq_3_a:
    "Normalmente sí. El motor siempre prueba primero la pasada de metadatos, que mantiene intacto cada byte de texto. Solo si el archivo sigue por encima del límite vuelve a renderizar las páginas como imágenes nítidas — el PDF se ve igual, pero el texto pasa a formar parte de la imagen.",
  faq_4_q: "¿Qué tan pequeño puedes hacer mi PDF?",
  faq_4_a:
    "Depende de lo que contenga. Los documentos escaneados suelen encoger 60–90%. Si el objetivo es imposible sin destruir la legibilidad, el motor se detiene en el tamaño más seguro y te lo dice con honestidad en lugar de entregarte algo borroso.",
  faq_5_q: "¿En qué se diferencia de los convertidores en línea?",
  faq_5_a:
    "Las herramientas basadas en subidas primero copian tu archivo a sus servidores — esperas, cupos de tamaño, políticas de retención. FixMyPDF no tiene nada de eso: sin colas, sin cuenta, sin servidor que pudiera filtrar o conservar tu documento.",
  faq_6_q: "¿Funciona en mi teléfono?",
  faq_6_a:
    "Sí — funciona en cualquier navegador móvil moderno. Los archivos muy grandes (cientos de MB) van mejor en escritorio simplemente porque los teléfonos tienen menos memoria.",
  faq_7_q: "¿Usan cookies o rastreadores?",
  faq_7_a:
    "Sin analíticas, sin píxeles publicitarios, sin fingerprinting. La aplicación guarda exactamente tres cosas localmente en tu dispositivo: tu tema, tu idioma y cuántos archivos has corregido.",
  faq_8_q: "¿Qué reglas entiende “El sitio web dice…”?",
  faq_8_a:
    "Pega las instrucciones del portal tal cual. Detecta con fiabilidad límites de tamaño como “menos de 2 MB”, topes de páginas como “máximo 10 páginas”, formatos de archivo como PDF o JPG y dimensiones en píxeles como 600×600.",

  /* --------------------------------- pricing --------------------------------- */
  price_heading: "Precios simples",
  price_sub: "La promesa central — tu PDF, corregido, en tu dispositivo — es gratis para siempre.",
  price_free_name: "Gratis",
  price_free_price: "$0",
  price_free_period: "para siempre",
  price_free_f1: "Las seis correcciones",
  price_free_f2: "Uso local ilimitado",
  price_free_f3: "Sin cuenta, sin marca de agua",
  price_free_f4: "Instalable — funciona sin conexión",
  price_free_cta: "Empieza a corregir — es gratis",
  price_pro_name: "Pro",
  price_pro_soon: "Próximamente",
  price_pro_price: "$4",
  price_pro_period: "pago único — no es suscripción",
  price_pro_f1: "Cola por lotes para muchos archivos",
  price_pro_f2: "Procesamiento prioritario para monstruos de 200 MB+",
  price_pro_f3: "Paquetes ZIP para resultados por lotes",
  price_pro_f4: "Apoya a las personas detrás de esto",
  price_pro_cta: "Avísame en el lanzamiento",
  price_pro_note: "Pago único el día del lanzamiento. Hasta entonces, todo es gratis.",

  /* ---------------------------------- legal ---------------------------------- */
  legal_privacy_title: "Política de privacidad",
  legal_terms_title: "Términos del servicio",
  legal_lang_note: "El texto legal se proporciona en inglés.",
  legal_close: "Cerrar",
  legal_last_updated: "Última actualización",

  /* ------------------------------ app-level misc ----------------------------- */
  ctx_fit: "Haz que quepa · ≤ {size}",
  ctx_requirements: "Requisitos del portal",
  toast_not_pdf: "Eso no es un PDF",
  toast_not_pdf_desc: "FixMyPDF solo maneja archivos .pdf — elige el correcto.",
  toast_big: "Archivo grande detectado",
  toast_big_desc: "Los archivos de más de 200 MB pueden tardar un poco en procesarse en el navegador — ten paciencia.",
  toast_read_fail: "No se pudo leer ese archivo como PDF.",
  toast_analyze_fail: "No se pudo analizar este documento.",
  toast_fit_fail: "Algo salió mal al reducir el archivo.",
  toast_req_fail: "No se pudieron cumplir esos requisitos.",
  toast_extract_fail: "No se pudieron extraer esas páginas.",
  toast_remove_fail: "No se pudieron quitar esas páginas.",
  error_boundary_title: "Algo se rompió en el taller",
  error_boundary_body:
    "Un error inesperado bloqueó esta parte de la página. Tu archivo nunca se subió — recargar te da un comienzo limpio.",
  error_boundary_reload: "Recargar FixMyPDF",
};
