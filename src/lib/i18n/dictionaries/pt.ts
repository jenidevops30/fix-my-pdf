/**
 * Portuguese — Brazilian (Português do Brasil) UI dictionary for FixMyPDF.
 * Implements `Dict` from ./en — every key present, same {placeholders}.
 */
import type { Dict } from "./en";

export const pt: Dict = {
  /* --------------------------------- header --------------------------------- */
  nav_tagline: "Cirurgia de PDF precisa",
  nav_trust: "100% WebAssembly no navegador • Zero uploads para servidores",
  nav_how: "Como funciona",
  nav_faq: "Perguntas frequentes",
  nav_pricing: "Preços",
  nav_language: "Idioma",

  /* ---------------------------------- hero ---------------------------------- */
  hero_badge: "Triagem determinística de portais",
  hero_title_1: "Seu PDF está errado.",
  hero_title_2: "A gente conserta.",
  hero_sub:
    "Sem caixas de ferramentas complicadas. Diga o limite rígido de upload ou as páginas de que você precisa, e nosso motor no navegador redimensiona e corta com segurança — nada é enviado para lugar nenhum.",
  hero_choose_aria: "Escolher um reparo",
  mode_fit: "Fazer Caber (Limite-Alvo)",
  mode_keep: "Manter Páginas Específicas",
  mode_requirements: "“O site diz...”",
  mode_blank: "Remover Páginas em Branco",
  mode_remove: "Remover Páginas",
  mode_find: "Encontrar Páginas com uma Palavra",

  /* ------------------------------- upload zone ------------------------------ */
  upload_aria: "Envie um PDF — solte aqui ou pressione Enter para procurar",
  upload_title: "Solte seu PDF aqui",
  upload_sub: "ou clique para procurar — ele nunca sai do seu dispositivo",
  upload_badge_1: "100% no navegador",
  upload_badge_2: "Sem conta",
  upload_badge_3: "Sem marca d’água",
  upload_sample: "Testar um documento de exemplo",
  upload_sample_error: "Não foi possível carregar o documento de exemplo.",
  upload_sample_error_desc: "Verifique sua conexão ou solte um dos seus próprios PDFs.",

  /* -------------------------------- file bar -------------------------------- */
  file_pages: "{n} páginas",
  file_current_size: "Tamanho atual:",
  file_encrypted: "protegido por senha",
  file_switch: "Trocar arquivo",

  /* ------------------------------ result panel ------------------------------ */
  result_panel_label: "Verificação e download",
  result_engine: "Motor de Verificação",
  result_idle_title: "Nada processado ainda",
  result_working_title: "Motor em execução",
  result_awaiting: "Aguardando instruções",
  result_working: "Trabalhando…",
  result_passed: "Dentro de Todos os Limites",
  result_closest: "Melhor Correspondência Encontrada",
  result_cut: "Corte Concluído",
  result_error_badge: "Erro",
  result_error_title: "Algo deu errado",
  result_idle_lead:
    "Diga ao motor o que fazer à esquerda. Cada reparo é verificado contra o seu requisito exato antes do download.",
  result_original: "Arquivo Original",
  result_too_large: "(Grande Demais)",
  result_fixed: "Saída Corrigida",
  result_best_effort:
    "Não conseguimos ficar abaixo do limite sem prejudicar a legibilidade. A menor versão segura está anexada.",
  result_trimmed: "Cortado para as primeiras {kept} de {total} páginas (etapa de manter apenas).",
  result_pages_out: "páginas no novo arquivo",
  result_try_again: "Tentar novamente",
  result_download: "Baixar {name}",
  result_download_started: "Download iniciado",
  result_download_note: "Sem marca d’água • Processado em privado na memória do navegador",
  result_auto_download: "Download automático ao terminar",
  result_shortcuts_hint: "Enter — executar o reparo · Esc — reiniciar o painel",
  result_progress_aria: "Progresso: {n}%",

  /* ----------------------------- idle promises ------------------------------ */
  idle_fit_1: "Metadados removidos primeiro — o texto continua selecionável",
  idle_fit_2: "Escada de rasterização determinística de cinco passos",
  idle_fit_3: "Para no primeiro passo que cabe",
  idle_keep_1: "Grade visual com miniaturas de páginas ao vivo",
  idle_keep_2: "Digite listas como 3, 7, 12, 19-23",
  idle_keep_3: "Estrutura copiada sem perdas, página por página",
  idle_requirements_1: "Regras coladas analisadas localmente — sem IA",
  idle_requirements_2: "O limite de tamanho e de páginas mais rigoroso vence",
  idle_requirements_3: "Corta no teto de páginas e depois comprime",
  idle_blank_1: "Varredura de densidade de tinta em cada página",
  idle_blank_2: "Níveis conservador, normal e tolerante",
  idle_blank_3: "Nada é removido até você confirmar",
  idle_remove_1: "Intervalos como 1-3, 8, 14-17 são aceitos",
  idle_remove_2: "Cortes rápidos para páginas em branco, ímpares e pares",
  idle_remove_3: "Prévia ao vivo do que sobra",
  idle_find_1: "Busca na camada de texto de cada página",
  idle_find_2: "Mostra um trecho para cada ocorrência",
  idle_find_3: "Extraia todas as ocorrências em um clique",

  /* -------------------------------- fit mode -------------------------------- */
  fit_step: "Passo 1 • Meta em Bytes",
  fit_question: "Qual é o limite de tamanho para upload?",
  fit_preset_1: "Governo / Visa",
  fit_preset_2: "Workday / RH",
  fit_preset_3: "Universidade",
  fit_common: "★ Comum",
  fit_exact_label: "Ou digite um limite exato",
  fit_mb_aria: "Tamanho máximo em megabytes",
  fit_strip_meta: "Remover metadados ocultos de rastreamento e EXIF da câmera",
  fit_grayscale: "Converter para escala de cinza (documentos B&W escaneados comprimem drasticamente)",
  fit_cta: "Fazer Caber Abaixo de {mb} MB",

  /* ---------------------------- requirements mode ---------------------------- */
  req_step: "Passo 1 • Cole as Regras",
  req_question: "O que o site diz?",
  req_sub: "Cole as instruções de upload. Lemos tudo localmente — sem IA, só análise de texto.",
  req_placeholder: "ex.: O arquivo enviado deve ser um PDF, tamanho máximo 2 MB, no máximo 10 páginas.",
  req_text_aria: "Texto dos requisitos",
  req_informational: "informativo",
  req_no_limit:
    "Nenhum limite de tamanho ou de páginas detectado ainda — mencione algo como “abaixo de 2 MB” ou “máximo 10 páginas”.",
  req_strip_meta: "Remover metadados ocultos de rastreamento",
  req_cta: "Ajustar Meu Arquivo",

  /* -------------------------------- keep mode -------------------------------- */
  keep_step: "Passo 1 • Escolha Suas Páginas",
  keep_question: "Quais páginas você precisa?",
  keep_analyzing: "Analisando páginas…",
  keep_analyzing_aria: "Analisando páginas",
  keep_select_aria: "Selecionar página {n}",
  keep_page_alt: "Página {n}",
  keep_selected: "Selecionadas:",
  keep_none: "nenhuma",
  keep_all: "Selecionar todas",
  keep_clear: "Limpar",
  keep_odd: "Páginas ímpares",
  keep_even: "Páginas pares",
  keep_every: "A cada {n}ª página",
  keep_spec_aria: "Números de página",
  keep_spec_placeholder: "ex.: 3, 7, 12, 19-23",
  keep_cta: "Extrair {n} Páginas",

  /* -------------------------------- blank mode ------------------------------- */
  blank_step: "Passo 1 • Escanear Vazias",
  blank_question: "Remover páginas em branco?",
  blank_threshold:
    "Uma página conta como em branco quando menos de {pct}% dos pixels dela têm tinta.",
  blank_scanning: "Escaneando páginas…",
  blank_scanning_aria: "Escaneando páginas",
  blank_found: "Páginas em branco encontradas",
  blank_pages: "{n} páginas",
  blank_detected_note: "As páginas detectadas só são removidas quando você aperta o botão.",
  blank_none: "Nenhuma página em branco detectada — seu documento está limpo.",
  blank_cta: "Remover {n} Páginas em Branco",

  /* -------------------------------- remove mode ------------------------------ */
  remove_step: "Passo 1 • Marque os Cortes",
  remove_question: "Quais páginas devem sair?",
  remove_label: "Páginas a remover",
  remove_aria: "Páginas a remover",
  remove_placeholder: "ex.: 1-3, 8, 14-17",
  remove_quick: "Ações rápidas:",
  remove_qa_blanks: "Remover páginas em branco",
  remove_qa_blanks_title: "Preenche com as páginas em branco achadas na varredura de tinta",
  remove_qa_blanks_pending: "Disponível quando a varredura de páginas terminar",
  remove_qa_odd: "Remover páginas ímpares",
  remove_qa_even: "Remover páginas pares",
  remove_qa_every: "A cada {n}ª",
  remove_remaining: "{remaining} de {total} páginas vão permanecer",
  remove_min_one: "Um PDF precisa de pelo menos uma página — deixe algo para trás.",
  remove_cta: "Remover {n} Páginas",
  remove_no_blanks: "Nenhuma página em branco encontrada",
  remove_no_blanks_desc: "Nada pareceu vazio na sensibilidade normal.",
  remove_invalid_list: "Lista de páginas inválida.",

  /* --------------------------------- find mode ------------------------------- */
  find_step: "Passo 1 • Buscar Texto",
  find_question: "Encontrar páginas que contêm uma palavra",
  find_placeholder: "ex.: Policy Schedule",
  find_aria: "Texto da busca",
  find_search: "Buscar",
  find_search_aria: "Executar busca",
  find_searching: "Buscando páginas…",
  find_searching_aria: "Buscando",
  find_failed: "A busca falhou.",
  find_found_on: "Encontrado em {pages} páginas · {matches} ocorrências",
  find_hits: "{n} ocorrências",
  find_scanned:
    "Isto parece um documento escaneado — não tem camada de texto pesquisável. Tente Remover Páginas em Branco ou Fazer Caber.",
  find_no_hits: "Nenhuma página contém “{query}”. Tente uma palavra mais curta.",
  find_cta: "Extrair as {n} Páginas Encontradas",

  /* ----------------------------- secondary cards ----------------------------- */
  sec_heading: "Outras Soluções Cirúrgicas",
  sec_sub: "Escolha o reparo exato de que você precisa — sem labirinto de ajustes.",
  sec_keep_title: "“Preciso apenas de algumas páginas”",
  sec_keep_body: "Extraia páginas de assinatura ou tabelas de imposto com um seletor visual de páginas.",
  sec_keep_cta: "Abrir Seletor de Páginas →",
  sec_keep_preview_label: "Páginas selecionadas:",
  sec_req_title: "“O site diz...”",
  sec_req_body: "Cole as instruções do portal; detectamos limites de tamanho e de páginas localmente.",
  sec_req_cta: "Colar as Regras →",
  sec_blank_title: "Extripar Páginas em Branco",
  sec_blank_body: "Detecte páginas vazias do alimentador do scanner com análise de densidade de tinta.",
  sec_blank_cta: "Escanear Páginas em Branco →",
  sec_blank_found: "6 páginas em branco encontradas",
  sec_blank_cut: "As páginas 4, 9, 11, 18, 22, 30 serão cortadas",

  /* ------------------------------- how it works ------------------------------ */
  how_heading: "Como funciona",
  how_1_title: "Carregar",
  how_1_body: "Seu arquivo é aberto no seu próprio navegador. Zero bytes são enviados para qualquer lugar.",
  how_2_title: "Descreva o reparo",
  how_2_body: "Um limite de tamanho, as páginas que você mantém ou as regras coladas do portal.",
  how_3_title: "Baixar",
  how_3_body: "Cada resultado é verificado contra o requisito antes de chegar até você.",

  /* ------------------------------ privacy ribbon ----------------------------- */
  priv_title: "Seus documentos ficam no seu navegador",
  priv_body:
    "Os arquivos são processados em um motor isolado dentro do navegador (WebAssembly). Zero bytes são enviados a qualquer servidor.",
  priv_delay_strong: "0 ms",
  priv_delay_label: "de atraso de nuvem",
  priv_logged_strong: "0 bytes",
  priv_logged_label: "registrados",
  priv_requests_strong_zero: "0 externas",
  priv_requests_strong_n: "{n} externas",
  priv_requests_idle: "nenhum reparo ainda",
  priv_requests_label: "requisições cross-origin durante o reparo",
  priv_requests_tooltip:
    "Contagem ao vivo de requisições de rede cross-origin observadas enquanto o motor trabalhou. Seu arquivo nunca sai desta aba — todo o processamento fica na memória local.",

  /* ---------------------------------- footer --------------------------------- */
  foot_ready: "Motor de Navegador FixMyPDF • Pronto",
  foot_tagline: "Triagem de documentos no cliente • Sem necessidade de conta",
  foot_engine: "Movido por pdf-lib + pdf.js — roda inteiramente no seu navegador",
  foot_fixed_on_device: "{n} PDFs consertados neste dispositivo",
  foot_fixed_on_device_one: "{n} PDF consertado neste dispositivo",
  foot_privacy: "Política de Privacidade",
  foot_terms: "Termos de Serviço",

  /* ----------------------------------- faq ----------------------------------- */
  faq_heading: "Perguntas, respondidas",
  faq_sub: "A versão curta de tudo que as pessoas perguntam antes de confiar em uma ferramenta de PDF.",
  faq_1_q: "Meu arquivo realmente nunca é enviado?",
  faq_1_a:
    "Sim, de verdade. O motor é WebAssembly rodando dentro desta aba — seu arquivo é lido na memória, consertado e devolvido na hora. Observe o contador de requisições ao vivo na faixa de privacidade durante um reparo: ele fica em zero requisições externas. Você pode até ficar offline depois que a página carregar e continuar trabalhando.",
  faq_2_q: "Por que é grátis?",
  faq_2_a:
    "Como o conserto acontece no seu dispositivo, não pagamos servidores, armazenamento nem banda. Um plano Pro pago pode chegar depois para lotes pesados — mas os reparos principais continuam grátis.",
  faq_3_q: "Meu texto continua selecionável depois da compressão?",
  faq_3_a:
    "Normalmente sim. O motor sempre tenta primeiro a etapa de metadados, que mantém cada byte de texto intacto. Só se o arquivo ainda passar do limite ele renderiza as páginas como imagens nítidas — o PDF fica igual, mas o texto passa a fazer parte da imagem.",
  faq_4_q: "Quão pequeno você consegue deixar meu PDF?",
  faq_4_a:
    "Depende do que tem dentro. Documentos escaneados costumam encolher 60–90%. Se a meta for impossível sem destruir a legibilidade, o motor para no tamanho mais seguro e fala com honestidade, em vez de entregar uma imagem borrada.",
  faq_5_q: "Como isso é diferente dos conversores online?",
  faq_5_a:
    "Ferramentas baseadas em upload copiam seu arquivo para os servidores delas primeiro — esperas, cotas de tamanho, políticas de retenção. O FixMyPDF não tem nada disso: sem fila, sem conta, sem servidor que possa vazar ou guardar seu documento.",
  faq_6_q: "Funciona no meu celular?",
  faq_6_a:
    "Sim — roda em qualquer navegador móvel moderno. Arquivos muito grandes (centenas de MB) vão melhor no desktop simplesmente porque celulares têm menos memória.",
  faq_7_q: "Vocês usam cookies ou rastreadores?",
  faq_7_a:
    "Sem analytics, sem pixels de anúncio, sem fingerprinting. O app guarda exatamente três coisas localmente no seu dispositivo: seu tema, seu idioma e quantos arquivos você consertou.",
  faq_8_q: "Que regras o “O site diz…” entende?",
  faq_8_a:
    "Cole as instruções do portal como estão. Ele identifica com confiabilidade limites de tamanho como “abaixo de 2 MB”, tetos de páginas como “máximo 10 páginas”, formatos de arquivo como PDF ou JPG e dimensões em pixels como 600×600.",

  /* --------------------------------- pricing --------------------------------- */
  price_heading: "Preços simples",
  price_sub: "A promessa central — seu PDF, consertado, no seu dispositivo — é grátis para sempre.",
  price_free_name: "Grátis",
  price_free_price: "$0",
  price_free_period: "para sempre",
  price_free_f1: "Todos os seis reparos",
  price_free_f2: "Uso local ilimitado",
  price_free_f3: "Sem conta, sem marca d’água",
  price_free_f4: "Instalável — funciona offline",
  price_free_cta: "Comece a consertar — é grátis",
  price_pro_name: "Pro",
  price_pro_soon: "Em breve",
  price_pro_price: "$4",
  price_pro_period: "pagamento único — não é assinatura",
  price_pro_f1: "Fila em lote para muitos arquivos",
  price_pro_f2: "Processamento prioritário para monstros de 200 MB+",
  price_pro_f3: "Pacotes ZIP para resultados em lote",
  price_pro_f4: "Apoia as pessoas por trás do projeto",
  price_pro_cta: "Me avise no lançamento",
  price_pro_note: "Pagamento único no dia do lançamento. Até lá, tudo é grátis.",

  /* ---------------------------------- legal ---------------------------------- */
  legal_privacy_title: "Política de Privacidade",
  legal_terms_title: "Termos de Serviço",
  legal_lang_note: "O texto legal é fornecido em inglês.",
  legal_close: "Fechar",
  legal_last_updated: "Última atualização",

  /* ------------------------------ app-level misc ----------------------------- */
  ctx_fit: "Fazer Caber · ≤ {size}",
  ctx_requirements: "Requisitos do Portal",
  toast_not_pdf: "Isso não é um PDF",
  toast_not_pdf_desc: "O FixMyPDF só lida com arquivos .pdf — escolha o certo.",
  toast_big: "Arquivo grande detectado",
  toast_big_desc: "Arquivos acima de 200 MB podem demorar um pouco para processar no navegador — tenha paciência.",
  toast_read_fail: "Não foi possível ler esse arquivo como PDF.",
  toast_analyze_fail: "Não foi possível analisar este documento.",
  toast_fit_fail: "Algo deu errado ao reduzir o arquivo.",
  toast_req_fail: "Não foi possível atender a esses requisitos.",
  toast_extract_fail: "Não foi possível extrair essas páginas.",
  toast_remove_fail: "Não foi possível remover essas páginas.",
  error_boundary_title: "Algo quebrou na oficina",
  error_boundary_body:
    "Um erro inesperado derrubou esta parte da página. Seu arquivo nunca foi enviado — recarregar te dá um recomeço limpo.",
  error_boundary_reload: "Recarregar FixMyPDF",
};
