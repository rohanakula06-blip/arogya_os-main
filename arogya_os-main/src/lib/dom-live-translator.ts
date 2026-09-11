import {
  TELUGU_EXACT_STRINGS,
  TELUGU_PHRASES,
  TELUGU_WORDS,
} from "./translations/telugu";

type Language = "en" | "te";

interface TextState {
  original: string;
  translated: string;
}

const nodeStateMap = new WeakMap<Node, TextState>();
const placeholderStateMap = new WeakMap<HTMLInputElement | HTMLTextAreaElement, TextState>();
const attrStateMap = new WeakMap<Element, Record<string, TextState>>();
const textTranslationCache = new Map<string, string>();

let activeObserver: MutationObserver | null = null;
let currentLanguage: Language = "en";
let isTranslating = false;
let rafId: number | null = null;
let navigationListenersAttached = false;

/** Check if an element should be skipped from translation */
function shouldSkipNode(node: Node): boolean {
  if (!node || !node.parentElement) return true;
  const parent = node.parentElement;
  const tagName = parent.tagName.toLowerCase();

  if (
    tagName === "script" ||
    tagName === "style" ||
    tagName === "code" ||
    tagName === "pre" ||
    tagName === "svg" ||
    tagName === "path" ||
    parent.classList.contains("no-translate") ||
    parent.getAttribute("translate") === "no"
  ) {
    return true;
  }

  return false;
}

/** Morphological word translation fallback */
function translateWordToken(word: string): string {
  const lower = word.toLowerCase();

  // 1. Direct dictionary match
  if (TELUGU_WORDS[lower]) {
    return TELUGU_WORDS[lower];
  }
  if (TELUGU_EXACT_STRINGS[word]) {
    return TELUGU_EXACT_STRINGS[word];
  }

  // 2. Plural stem check (e.g. "reports" -> "report" + "లు")
  if (lower.endsWith("s") && lower.length > 3) {
    const stem = lower.slice(0, -1);
    if (TELUGU_WORDS[stem]) {
      return TELUGU_WORDS[stem] + (TELUGU_WORDS[stem].endsWith("లు") ? "" : "లు");
    }
  }
  if (lower.endsWith("es") && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (TELUGU_WORDS[stem]) {
      return TELUGU_WORDS[stem] + (TELUGU_WORDS[stem].endsWith("లు") ? "" : "లు");
    }
  }

  // 3. Past tense stem check (e.g. "uploaded" -> "అప్‌లోడ్ చేయబడింది")
  if (lower.endsWith("ed") && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (TELUGU_WORDS[stem]) {
      return TELUGU_WORDS[stem] + " చేయబడింది";
    }
    const stemE = lower.slice(0, -1);
    if (TELUGU_WORDS[stemE]) {
      return TELUGU_WORDS[stemE] + " చేయబడింది";
    }
  }

  // 4. Progressive stem check (e.g. "analyzing" -> "విశ్లేషిస్తోంది")
  if (lower.endsWith("ing") && lower.length > 4) {
    const stem = lower.slice(0, -3);
    if (TELUGU_WORDS[stem]) {
      return TELUGU_WORDS[stem] + " జరుగుతోంది";
    }
  }

  // 5. Adverb stem check (e.g. "regularly" -> "క్రమంగా")
  if (lower.endsWith("ly") && lower.length > 4) {
    const stem = lower.slice(0, -2);
    if (TELUGU_WORDS[stem]) {
      return TELUGU_WORDS[stem] + "గా";
    }
  }

  return word;
}

/** Translate a single English text string into Telugu with memoization and morphological engine */
export function translateTextToTelugu(text: string): string {
  if (!text || !text.trim()) return text;

  // Check cache first for instant performance
  if (textTranslationCache.has(text)) {
    return textTranslationCache.get(text)!;
  }

  const trimmed = text.trim();

  // Tier 1: Exact whole string dictionary match
  if (TELUGU_EXACT_STRINGS[trimmed]) {
    const res = text.replace(trimmed, TELUGU_EXACT_STRINGS[trimmed]);
    textTranslationCache.set(text, res);
    return res;
  }

  // Tier 2: Case-insensitive whole string match
  const lowerKey = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(TELUGU_EXACT_STRINGS)) {
    if (key.toLowerCase() === lowerKey) {
      const res = text.replace(trimmed, val);
      textTranslationCache.set(text, res);
      return res;
    }
  }

  // Tier 3: Multi-word phrase regex replacements
  let transformed = text;
  for (const [pattern, replacement] of TELUGU_PHRASES) {
    transformed = transformed.replace(pattern, replacement);
  }

  // Tier 4: Universal Word-by-Word Morphological Tokenizer
  transformed = transformed.replace(/\b([A-Za-z]+(?:'[A-Za-z]+)?)\b/g, (match) => {
    return translateWordToken(match);
  });

  textTranslationCache.set(text, transformed);
  return transformed;
}

/** Translate a single text node safely without infinite loops */
function translateTextNode(node: Text): void {
  if (shouldSkipNode(node)) return;

  const currentVal = node.nodeValue;
  if (!currentVal || !currentVal.trim()) return;

  if (nodeStateMap.has(node)) {
    const state = nodeStateMap.get(node)!;
    if (currentVal === state.translated) {
      return;
    }
    if (currentVal === state.original) {
      node.nodeValue = state.translated;
      return;
    }
  }

  // New text node
  const original = currentVal;
  const translated = translateTextToTelugu(original);
  nodeStateMap.set(node, { original, translated });

  if (translated !== currentVal) {
    node.nodeValue = translated;
  }
}

/** Restore a text node back to English */
function restoreTextNode(node: Text): void {
  if (nodeStateMap.has(node)) {
    const state = nodeStateMap.get(node)!;
    if (node.nodeValue !== state.original) {
      node.nodeValue = state.original;
    }
  }
}

/** Translate input and textarea placeholders */
function translateInputPlaceholders(el: HTMLInputElement | HTMLTextAreaElement): void {
  const currentVal = el.placeholder;
  if (!currentVal || !currentVal.trim()) return;

  if (placeholderStateMap.has(el)) {
    const state = placeholderStateMap.get(el)!;
    if (currentVal === state.translated) {
      return;
    }
    if (currentVal === state.original) {
      el.placeholder = state.translated;
      return;
    }
  }

  const original = currentVal;
  const translated = translateTextToTelugu(original);
  placeholderStateMap.set(el, { original, translated });

  if (translated !== currentVal) {
    el.placeholder = translated;
  }
}

/** Restore input placeholders back to English */
function restoreInputPlaceholders(el: HTMLInputElement | HTMLTextAreaElement): void {
  if (placeholderStateMap.has(el)) {
    const state = placeholderStateMap.get(el)!;
    if (el.placeholder !== state.original) {
      el.placeholder = state.original;
    }
  }
}

/** Translate attributes (aria-label, title, alt) */
function translateElementAttributes(el: HTMLElement): void {
  const attrs = ["aria-label", "title", "alt"];
  for (const attr of attrs) {
    const val = el.getAttribute(attr);
    if (val && val.trim()) {
      let stateRecord = attrStateMap.get(el);
      if (!stateRecord) {
        stateRecord = {};
        attrStateMap.set(el, stateRecord);
      }
      if (!stateRecord[attr]) {
        stateRecord[attr] = {
          original: val,
          translated: translateTextToTelugu(val),
        };
      }
      const st = stateRecord[attr];
      if (val !== st.translated) {
        el.setAttribute(attr, st.translated);
      }
    }
  }
}

/** Restore attributes back to English */
function restoreElementAttributes(el: HTMLElement): void {
  const stateRecord = attrStateMap.get(el);
  if (stateRecord) {
    for (const [attr, st] of Object.entries(stateRecord)) {
      if (el.getAttribute(attr) !== st.original) {
        el.setAttribute(attr, st.original);
      }
    }
  }
}

/** Recursively traverse and translate all child nodes */
function walkAndTranslate(root: Node): void {
  if (shouldSkipNode(root)) return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
  } else if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as HTMLElement;

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      translateInputPlaceholders(el);
    }
    translateElementAttributes(el);

    const children = Array.from(root.childNodes);
    for (const child of children) {
      walkAndTranslate(child);
    }
  }
}

/** Recursively traverse and restore all child nodes back to English */
function walkAndRestore(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    restoreTextNode(root as Text);
  } else if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as HTMLElement;

    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      restoreInputPlaceholders(el);
    }
    restoreElementAttributes(el);

    const children = Array.from(root.childNodes);
    for (const child of children) {
      walkAndRestore(child);
    }
  }
}

/** Setup automatic navigation and history listeners so new routes/features translate automatically */
function setupGlobalNavigationListeners(): void {
  if (navigationListenersAttached || typeof window === "undefined") return;
  navigationListenersAttached = true;

  const triggerLiveReTranslation = () => {
    if (currentLanguage === "te") {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        isTranslating = true;
        try {
          walkAndTranslate(document.body);
        } finally {
          isTranslating = false;
        }
      });
    }
  };

  window.addEventListener("popstate", triggerLiveReTranslation);
  window.addEventListener("hashchange", triggerLiveReTranslation);
}

/** Start the live dynamic translation engine for the target language */
export function applyLiveLanguage(lang: Language): void {
  currentLanguage = lang;

  if (typeof document === "undefined") return;

  setupGlobalNavigationListeners();

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  if (lang === "te") {
    // 1. Initial pass across the document
    isTranslating = true;
    try {
      walkAndTranslate(document.body);
    } finally {
      isTranslating = false;
    }

    // 2. Continuous real-time listener for any new elements / new pages / new features
    activeObserver = new MutationObserver((mutations) => {
      if (isTranslating || currentLanguage !== "te") return;

      const addedNodes: Node[] = [];
      for (const m of mutations) {
        if (m.type === "childList") {
          for (let i = 0; i < m.addedNodes.length; i++) {
            addedNodes.push(m.addedNodes[i]);
          }
        }
      }

      if (addedNodes.length === 0) return;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        if (currentLanguage !== "te") return;
        isTranslating = true;
        try {
          for (const node of addedNodes) {
            walkAndTranslate(node);
          }
        } finally {
          isTranslating = false;
          rafId = null;
        }
      });
    });

    activeObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    // Restore all content back to exact original English
    isTranslating = true;
    try {
      walkAndRestore(document.body);
    } finally {
      isTranslating = false;
    }
  }
}

/** Get the currently active language */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}
