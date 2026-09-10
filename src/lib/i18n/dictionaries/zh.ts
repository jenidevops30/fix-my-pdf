/**
 * Simplified Chinese (简体中文) UI dictionary for FixMyPDF.
 * Implements `Dict` from ./en — every key present, same {placeholders}.
 */
import type { Dict } from "./en";

export const zh: Dict = {
  /* --------------------------------- header --------------------------------- */
  nav_tagline: "精准 PDF 手术",
  nav_trust: "100% 浏览器内 WebAssembly • 零服务器上传",
  nav_how: "工作原理",
  nav_faq: "常见问题",
  nav_pricing: "价格",
  nav_language: "语言",

  /* ---------------------------------- hero ---------------------------------- */
  hero_badge: "门户规则，确定性分诊",
  hero_title_1: "你的 PDF 有问题。",
  hero_title_2: "我们来修。",
  hero_sub:
    "不用复杂的工具箱。告诉我们严格的上传限制或你需要的页码，我们的浏览器引擎会安全地缩放并裁剪文件——任何内容都不会被上传。",
  hero_choose_aria: "选择修复方式",
  mode_fit: "压到限制内（目标上限）",
  mode_keep: "保留指定页",
  mode_requirements: "“网站说...”",
  mode_blank: "删除空白页",
  mode_remove: "删除指定页",
  mode_find: "按词语查找页面",

  /* ------------------------------- upload zone ------------------------------ */
  upload_aria: "上传 PDF — 拖放到此处，或按 Enter 浏览",
  upload_title: "把 PDF 拖到这里",
  upload_sub: "或点击浏览 —— 文件永远不会离开你的设备",
  upload_badge_1: "100% 浏览器内处理",
  upload_badge_2: "无需账号",
  upload_badge_3: "无水印",
  upload_sample: "试试示例文档",
  upload_sample_error: "示例文档加载失败。",
  upload_sample_error_desc: "请检查网络连接，或直接拖入你自己的 PDF。",

  /* -------------------------------- file bar -------------------------------- */
  file_pages: "{n} 页",
  file_current_size: "当前大小：",
  file_encrypted: "有密码保护",
  file_switch: "换一个文件",

  /* ------------------------------ result panel ------------------------------ */
  result_panel_label: "校验与下载",
  result_engine: "校验引擎",
  result_idle_title: "尚未处理任何内容",
  result_working_title: "引擎运行中",
  result_awaiting: "等待指令",
  result_working: "处理中…",
  result_passed: "全部限制通过",
  result_closest: "已找到最接近方案",
  result_cut: "裁剪完成",
  result_error_badge: "错误",
  result_error_title: "出了点问题",
  result_idle_lead:
    "在左侧告诉引擎要做什么。每次修复都会先按你的确切要求校验，再提供下载。",
  result_original: "原始文件",
  result_too_large: "（太大）",
  result_fixed: "修复后的文件",
  result_best_effort:
    "在不损害可读性的前提下无法降到限制以内。已附上最小且安全的版本。",
  result_trimmed: "已裁剪为 {total} 页中的前 {kept} 页（仅保留步骤）。",
  result_pages_out: "新文件中的页数",
  result_try_again: "重试",
  result_download: "下载 {name}",
  result_download_started: "下载已开始",
  result_download_note: "无水印 • 在浏览器内存中私密处理",
  result_auto_download: "完成后自动下载",
  result_shortcuts_hint: "Enter — 执行修复 · Esc — 重置面板",
  result_progress_aria: "进度：{n}%",

  /* ----------------------------- idle promises ------------------------------ */
  idle_fit_1: "先剥离元数据 —— 文字仍可选中",
  idle_fit_2: "确定性的五级栅格降档",
  idle_fit_3: "在第一个达标档位即停止",
  idle_keep_1: "可视化网格，实时页面缩略图",
  idle_keep_2: "直接输入如 3, 7, 12, 19-23",
  idle_keep_3: "逐页无损复制文档结构",
  idle_requirements_1: "粘贴的规则本地解析 —— 不用 AI",
  idle_requirements_2: "以最严格的大小与页数限制为准",
  idle_requirements_3: "先裁到页数上限，再压缩",
  idle_blank_1: "逐页进行墨迹密度扫描",
  idle_blank_2: "保守、正常、宽松三档",
  idle_blank_3: "未经你确认不会删除任何内容",
  idle_remove_1: "支持 1-3, 8, 14-17 这样的区间",
  idle_remove_2: "空白页、奇数页、偶数页一键快剪",
  idle_remove_3: "实时预览保留结果",
  idle_find_1: "搜索每一页的文字层",
  idle_find_2: "每处命中都显示上下文片段",
  idle_find_3: "一键提取所有命中页",

  /* -------------------------------- fit mode -------------------------------- */
  fit_step: "第 1 步 • 字节目标",
  fit_question: "上传大小限制是多少？",
  fit_preset_1: "政府 / Visa",
  fit_preset_2: "Workday / HR",
  fit_preset_3: "大学",
  fit_common: "★ 常用",
  fit_exact_label: "或输入精确上限",
  fit_mb_aria: "最大大小（MB）",
  fit_strip_meta: "剥离隐藏的追踪元数据与相机 EXIF",
  fit_grayscale: "转为灰度（扫描的 B&W 文档压缩效果惊人）",
  fit_cta: "压到 {mb} MB 以内",
  fit_save_target: "保存目标",
  fit_saved_toast: "已将 {mb} MB 保存到此设备",

  /* ---------------------------- requirements mode ---------------------------- */
  req_step: "第 1 步 • 粘贴规则",
  req_question: "网站是怎么说的？",
  req_sub: "粘贴上传要求。我们在本地读取解析 —— 不用 AI，纯规则匹配。",
  req_placeholder: "例如：上传文件必须为 PDF，大小不超过 2 MB，不超过 10 页。",
  req_text_aria: "要求文本",
  req_informational: "仅供参考",
  req_no_limit:
    "尚未识别到大小或页数限制 —— 请提到类似 “2 MB 以内” 或 “最多 10 页” 的表述。",
  req_strip_meta: "剥离隐藏的追踪元数据",
  req_cta: "把文件压到位",

  /* -------------------------------- keep mode -------------------------------- */
  keep_step: "第 1 步 • 挑选页面",
  keep_question: "你需要哪些页？",
  keep_analyzing: "正在分析页面…",
  keep_analyzing_aria: "正在分析页面",
  keep_select_aria: "选择第 {n} 页",
  keep_page_alt: "第 {n} 页",
  keep_selected: "已选：",
  keep_none: "无",
  keep_all: "全选",
  keep_clear: "清空",
  keep_odd: "奇数页",
  keep_even: "偶数页",
  keep_every: "每 {n} 页取一页",
  keep_spec_aria: "页码",
  keep_spec_placeholder: "例如：3, 7, 12, 19-23",
  keep_cta: "提取 {n} 页",

  /* -------------------------------- blank mode ------------------------------- */
  blank_step: "第 1 步 • 扫描空白",
  blank_question: "要删除空白页吗？",
  blank_threshold:
    "当一页不到 {pct}% 的像素带有墨迹时，即视为空白页。",
  blank_scanning: "正在扫描页面…",
  blank_scanning_aria: "正在扫描页面",
  blank_found: "发现空白页",
  blank_pages: "{n} 页",
  blank_detected_note: "检测到的页面只有在你点击按钮后才会被删除。",
  blank_none: "未检测到空白页 —— 你的文档很干净。",
  blank_cta: "删除 {n} 张空白页",

  /* -------------------------------- remove mode ------------------------------ */
  remove_step: "第 1 步 • 标记裁剪",
  remove_question: "要删掉哪些页？",
  remove_label: "要删除的页",
  remove_aria: "要删除的页",
  remove_placeholder: "例如：1-3, 8, 14-17",
  remove_quick: "快捷操作：",
  remove_qa_blanks: "删除空白页",
  remove_qa_blanks_title: "填入墨迹扫描发现的空白页",
  remove_qa_blanks_pending: "页面扫描完成后可用",
  remove_qa_odd: "删除奇数页",
  remove_qa_even: "删除偶数页",
  remove_qa_every: "每隔 {n} 页",
  remove_remaining: "将保留 {total} 页中的 {remaining} 页",
  remove_min_one: "PDF 至少要有一页 —— 总得留下点什么。",
  remove_cta: "删除 {n} 页",
  remove_no_blanks: "未发现空白页",
  remove_no_blanks_desc: "在正常灵敏度下没有看起来空白的页面。",
  remove_invalid_list: "页码列表无效。",

  /* --------------------------------- find mode ------------------------------- */
  find_step: "第 1 步 • 搜索文本",
  find_question: "查找包含某词语的页面",
  find_placeholder: "例如：Policy Schedule",
  find_aria: "搜索文本",
  find_search: "搜索",
  find_search_aria: "执行搜索",
  find_searching: "正在搜索页面…",
  find_searching_aria: "搜索中",
  find_failed: "搜索失败。",
  find_found_on: "在 {pages} 页中找到 · {matches} 处匹配",
  find_hits: "{n} 处命中",
  find_scanned:
    "这看起来是扫描件 —— 没有可搜索的文字层。试试“删除空白页”或“压到限制内”。",
  find_no_hits: "没有页面包含“{query}”。换个更短的词试试。",
  find_cta: "提取找到的 {n} 页",

  /* ----------------------------- secondary cards ----------------------------- */
  sec_heading: "其他精准方案",
  sec_sub: "直接选择你需要的修复 —— 不用在设置里绕圈。",
  sec_keep_title: "“我只要其中几页”",
  sec_keep_body: "用可视化选页器提取签名页或报税表格。",
  sec_keep_cta: "打开选页器 →",
  sec_keep_preview_label: "已选页面：",
  sec_req_title: "“网站说...”",
  sec_req_body: "粘贴门户要求；我们在本地识别大小与页数限制。",
  sec_req_cta: "粘贴规则 →",
  sec_blank_title: "切除空白页",
  sec_blank_body: "用墨迹密度分析找出扫描仪走纸产生的空页。",
  sec_blank_cta: "扫描空白页 →",
  sec_blank_found: "发现 6 张空白页",
  sec_blank_cut: "第 4, 9, 11, 18, 22, 30 页将被切除",

  /* ------------------------------- how it works ------------------------------ */
  how_heading: "工作原理",
  how_1_title: "打开文件",
  how_1_body: "文件只在你自己的浏览器中打开。不会向任何地方发送一个字节。",
  how_2_title: "描述修复需求",
  how_2_body: "一个大小限制、要保留的页码，或粘贴的门户规则。",
  how_3_title: "下载",
  how_3_body: "每个结果在交付前都会按要求进行校验。",

  /* ------------------------------ privacy ribbon ----------------------------- */
  priv_title: "文档只留在你的浏览器里",
  priv_body:
    "文件在浏览器内的沙箱引擎（WebAssembly）中处理。不会向任何服务器上传一个字节。",
  priv_delay_strong: "0 ms",
  priv_delay_label: "云端延迟",
  priv_logged_strong: "0 字节",
  priv_logged_label: "被记录",
  priv_requests_strong_zero: "0 个外部",
  priv_requests_strong_n: "{n} 个外部",
  priv_requests_idle: "尚未修复",
  priv_requests_label: "修复期间的跨域请求",
  priv_requests_tooltip:
    "引擎工作期间观察到的跨域网络请求实时计数。你的文件从不离开这个标签页 —— 全部处理都在本地内存中完成。",

  /* ---------------------------------- footer --------------------------------- */
  foot_ready: "FixMyPDF 浏览器引擎 • 就绪",
  foot_tagline: "客户端文档分诊 • 无需账号",
  foot_engine: "由 pdf-lib + pdf.js 驱动 —— 完全在你的浏览器中运行",
  foot_fixed_on_device: "在此设备上已修复 {n} 个 PDF",
  foot_fixed_on_device_one: "在此设备上已修复 {n} 个 PDF",
  foot_privacy: "隐私政策",
  foot_terms: "服务条款",

  /* ----------------------------------- faq ----------------------------------- */
  faq_heading: "疑问，逐一解答",
  faq_sub: "在信任一款 PDF 工具之前，人们想问的一切，这里都有简短回答。",
  faq_1_q: "我的文件真的从不被上传？",
  faq_1_a:
    "真的。引擎是运行在这个标签页里的 WebAssembly —— 你的文件被读入内存、修复后立刻交还。修复时可以看隐私横幅上的实时请求计数器：外部请求数始终为零。页面加载后你甚至可以断网继续用。",
  faq_2_q: "为什么免费？",
  faq_2_a:
    "因为修复发生在你的设备上，我们不用为服务器、存储和带宽付费。以后可能会为重度批量任务推出付费 Pro 档 —— 但核心修复永远免费。",
  faq_3_q: "压缩后文字还能选中吗？",
  faq_3_a:
    "通常可以。引擎总是先尝试元数据通道，文字的每一个字节都原样保留。只有当文件仍超限时，才会把页面重新渲染为清晰图像 —— PDF 看起来一样，只是文字变成了图像的一部分。",
  faq_4_q: "能把我的 PDF 压到多小？",
  faq_4_a:
    "取决于内容。扫描件通常能缩小 60–90%。如果在不毁掉可读性的情况下无法达标，引擎会停在最安全的尺寸并如实告诉你，而不是丢给你一团糊图。",
  faq_5_q: "这和在线转换器有什么不同？",
  faq_5_a:
    "基于上传的工具会先把你的文件复制到它们的服务器 —— 等待、大小配额、留存策略。FixMyPDF 这些都没有：不排队、不注册，也没有可能泄露或留存你文档的服务器。",
  faq_6_q: "手机上能用吗？",
  faq_6_a:
    "可以 —— 任何现代手机浏览器都能运行。特别大的文件（数百 MB）在桌面端更流畅，只是因为手机内存更少。",
  faq_7_q: "你们用 Cookie 或追踪器吗？",
  faq_7_a:
    "没有统计、没有广告像素、没有指纹采集。应用只在你设备上本地保存三样东西：主题、语言，以及你修复了多少个文件。",
  faq_8_q: "“网站说……”能看懂哪些规则？",
  faq_8_a:
    "把门户的要求原样粘贴即可。它能可靠地识别 “2 MB 以内” 这类大小限制、“最多 10 页” 这类页数上限、PDF 或 JPG 这类文件格式，以及 600×600 这类像素尺寸。",

  /* --------------------------------- pricing --------------------------------- */
  price_heading: "简单定价",
  price_sub: "核心承诺 —— 你的 PDF、在你设备上修好 —— 永久免费。",
  price_free_name: "免费",
  price_free_price: "$0",
  price_free_period: "永久",
  price_free_f1: "全部六种修复",
  price_free_f2: "本地使用无限制",
  price_free_f3: "无账号、无水印",
  price_free_f4: "可安装 —— 支持离线",
  price_free_cta: "开始修复 —— 免费",
  price_pro_name: "Pro",
  price_pro_soon: "即将推出",
  price_pro_price: "$4",
  price_pro_period: "一次性付费 —— 非订阅",
  price_pro_f1: "多文件批量队列",
  price_pro_f2: "200 MB+ 大文件优先处理",
  price_pro_f3: "批量结果打包 ZIP",
  price_pro_f4: "支持背后的开发者",
  price_pro_cta: "上线时通知我",
  price_pro_note: "上线日一次性付款。在那之前，一切免费。",

  /* ---------------------------------- legal ---------------------------------- */
  legal_privacy_title: "隐私政策",
  legal_terms_title: "服务条款",
  legal_lang_note: "法律文本仅提供英文版。",
  legal_close: "关闭",
  legal_last_updated: "最后更新",

  /* ------------------------------ app-level misc ----------------------------- */
  ctx_fit: "压到限制内 · ≤ {size}",
  ctx_requirements: "门户要求",
  toast_not_pdf: "这不是 PDF 文件",
  toast_not_pdf_desc: "FixMyPDF 只处理 .pdf 文件 —— 请选择正确的文件。",
  toast_big: "检测到大文件",
  toast_big_desc: "超过 200 MB 的文件在浏览器中处理可能较慢 —— 请稍等片刻。",
  toast_read_fail: "无法把该文件读取为 PDF。",
  toast_analyze_fail: "无法分析该文档。",
  toast_fit_fail: "压缩文件时出了点问题。",
  toast_req_fail: "无法满足这些要求。",
  toast_extract_fail: "无法提取这些页面。",
  toast_remove_fail: "无法删除这些页面。",
  error_boundary_title: "车间里出了点故障",
  error_boundary_body:
    "一个意外错误导致页面这部分崩溃。你的文件从未被上传 —— 重新加载即可重来。",
  error_boundary_reload: "重新加载 FixMyPDF",
};
