const firebaseConfig = {
  apiKey: "AIzaSyBAnPo7WP5SeFoz-hSKWil6v0tWI1oUeCw",
  authDomain: "my-book-d3907.firebaseapp.com",
  projectId: "my-book-d3907",
  messagingSenderId: "376744576799",
  appId: "1:376744576799:web:f913314bbe68364f8b522a"
};

const BOOKME_API_BASE_URL = (() => {
  const configured = (
    window.BOOKME_API_BASE_URL ||
    window.BOOKME_BACKEND_URL ||
    window.__BOOKME_API_BASE__ ||
    window.location.origin
  );
  return String(configured || window.location.origin).replace(/\/$/, "");
})();

function getApiUrl(path = "") {
  const safePath = String(path || "").trim();
  if (!safePath) {
    return BOOKME_API_BASE_URL;
  }

  if (/^https?:\/\//i.test(safePath)) {
    return safePath.replace(/\/$/, "");
  }

  if (safePath.startsWith("/api/")) {
    return `${BOOKME_API_BASE_URL}${safePath}`;
  }

  return `${BOOKME_API_BASE_URL}/${safePath.replace(/^\//, "")}`;
}

const originalFetch = window.fetch.bind(window);
function apiFetch(input, init) {
  if (typeof input === "string") {
    return originalFetch(getApiUrl(input), init);
  }

  if (input instanceof Request && typeof input.url === "string") {
    const requestUrl = input.url;
    if (requestUrl.startsWith(`${window.location.origin}/api/`) || requestUrl.includes("/api/")) {
      const url = new URL(requestUrl);
      const redirectedRequest = new Request(getApiUrl(`${url.pathname}${url.search}`), {
        method: input.method,
        headers: input.headers,
        body: input.body,
        credentials: input.credentials,
        mode: input.mode,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        integrity: input.integrity
      });
      return originalFetch(redirectedRequest, init);
    }
  }

  return originalFetch(input, init);
}

window.fetch = apiFetch;

if (window.firebase && firebase.apps && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const uploadToastStyleId = "bookme-upload-toast-style";
let uploadToastTimer = null;

function ensureUploadToast() {
  let toast = document.getElementById("bookme-upload-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "bookme-upload-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  let styleTag = document.getElementById(uploadToastStyleId);
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = uploadToastStyleId;
    styleTag.textContent = `
      #bookme-upload-toast {
        position: fixed;
        left: 50%;
        bottom: 26px;
        transform: translate(-50%, 18px);
        background: rgba(17, 17, 17, 0.96);
        color: #ffffff;
        border: none;
        border-radius: 25px;
        padding: 12px 18px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.01em;
        text-align: center;
        line-height: 1.35;
        max-width: min(80vw, 320px);
        min-width: 150px;
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease, transform 0.25s ease;
        z-index: 99999;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      #bookme-upload-toast .toast-checkmark {
        width: 18px;
        height: 18px;
        display: inline-block;
        flex-shrink: 0;
      }

      #bookme-upload-toast.show {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    `;
    document.head.appendChild(styleTag);
  }

  return toast;
}

function showUploadToast(message = "Uploaded") {
  const toast = ensureUploadToast();
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toast-checkmark" aria-hidden="true">
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
      <path d="m16 9-5.5 5.5L8 12"/>
    </svg>
    <span>${String(message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
  `;
  toast.classList.add("show");

  if (uploadToastTimer) {
    clearTimeout(uploadToastTimer);
  }

  uploadToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

const originalWindowAlert = window.alert.bind(window);
window.alert = function(message) {
  try {
    showUploadToast(String(message || ""));
  } catch (error) {
    originalWindowAlert(message);
  }
};

if ("serviceWorker" in navigator) {
  const isLocalDevelopmentHost = () => {
    const host = window.location.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host) ||
      host.endsWith(".local")
    );
  };

  if (isLocalDevelopmentHost()) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      Promise.all(registrations.map((registration) => registration.unregister())).catch(() => {});
    }).catch(() => {});

    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    }).catch(() => {});
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js")
        .then((registration) => registration.update())
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    });
  }
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

const hashtagSuggestionStyleId = "bookme-hashtag-suggestion-styles";
const hashtagSuggestionPopoverId = "bookme-hashtag-suggestions";

if (!document.getElementById(hashtagSuggestionStyleId)) {
  const hashtagStyleTag = document.createElement("style");
  hashtagStyleTag.id = hashtagSuggestionStyleId;
  hashtagStyleTag.textContent = `
    .hashtag-highlight {
      color: #202020;
      font-weight: 700;
    }

    .hashtag-suggestion-popover {
      position: fixed;
      z-index: 99999;
      display: none;
      max-height: 220px;
      overflow-y: hidden;
      width: min(260px, calc(100vw - 24px));
      background: rgba(17, 17, 17, 0.96);
      border: 1px solid rgba(245, 201, 74, 0.5);
      border-radius: 14px;
      box-shadow: 0 18px 38px rgba(0, 0, 0, 0.28);
      padding: 8px;
      backdrop-filter: blur(8px);

    }

    .hashtag-suggestion-item {
      width: 100%;
      border: none;
      background: transparent;
      color: #f5f5f5;
      border-radius: 10px;
      padding: 10px 12px;
      text-align: left;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .hashtag-suggestion-item:hover,
    .hashtag-suggestion-item:focus-visible {
      background: rgba(245, 201, 74, 0.12);
      outline: none;
    }

    .hashtag-suggestion-tag {
      color: #f5c94a;
      font-weight: 700;
    }

    .hashtag-suggestion-count {
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
    }
  `;
  document.head.appendChild(hashtagStyleTag);
}

function buildHashtagSuggestionPopover() {
  let popover = document.getElementById(hashtagSuggestionPopoverId);
  if (!popover) {
    popover = document.createElement("div");
    popover.id = hashtagSuggestionPopoverId;
    popover.className = "hashtag-suggestion-popover";
    document.body.appendChild(popover);
  }
  return popover;
}

function hideHashtagSuggestions() {
  const popover = document.getElementById(hashtagSuggestionPopoverId);
  if (popover) {
    popover.style.display = "none";
    popover.innerHTML = "";
  }
}

function getHashtagQuery(textarea) {
  if (!textarea) return null;

  const value = textarea.value || "";
  const cursorPosition = textarea.selectionStart ?? value.length;
  const beforeCursor = value.slice(0, cursorPosition);
  const hashMatch = beforeCursor.match(/(?:^|\s)#([^\s#]*)$/);

  if (!hashMatch) {
    return null;
  }

  const fragment = String(hashMatch[1] || "");
  if (!fragment) {
    return "";
  }

  return fragment.toLowerCase();
}

function insertSuggestedHashtag(textarea, tag) {
  if (!textarea || !tag) return;

  const value = textarea.value || "";
  const cursorPosition = textarea.selectionStart ?? value.length;
  const beforeCursor = value.slice(0, cursorPosition);
  const hashIndex = beforeCursor.lastIndexOf("#");
  const safeTag = String(tag).replace(/^#+/, "").trim();

  if (!safeTag) {
    hideHashtagSuggestions();
    return;
  }

  let nextValue = value;
  if (hashIndex >= 0) {
    nextValue = `${value.slice(0, hashIndex)}#${safeTag} ${value.slice(cursorPosition)}`;
  } else {
    const prefix = beforeCursor && !beforeCursor.endsWith(" ") ? " " : "";
    nextValue = `${value.slice(0, cursorPosition)}${prefix}#${safeTag} ${value.slice(cursorPosition)}`;
  }

  textarea.value = nextValue;
  textarea.focus();
  const finalPosition = textarea.value.length;
  textarea.setSelectionRange(finalPosition, finalPosition);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  hideHashtagSuggestions();
}

async function updateHashtagSuggestions(textarea) {
  const query = getHashtagQuery(textarea);
  const popover = buildHashtagSuggestionPopover();

  if (query === null || query === undefined) {
    hideHashtagSuggestions();
    return;
  }

  try {
    const response = await fetch(`/api/hashtags/suggestions?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Unable to load hashtag suggestions");
    }

    const suggestions = await response.json();
    const items = Array.isArray(suggestions) ? suggestions : [];

    if (!items.length) {
      hideHashtagSuggestions();
      return;
    }

    const rect = textarea.getBoundingClientRect();
    popover.innerHTML = items.map((tag) => `
      <button class="hashtag-suggestion-item" type="button" data-tag="${String(tag).replace(/"/g, "&quot;")}">
        <span class="hashtag-suggestion-tag">#${String(tag).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
        <span class="hashtag-suggestion-count">saved</span>
      </button>
    `).join("");

    popover.style.left = `${Math.min(rect.left + 8, window.innerWidth - 270)}px`;
    popover.style.top = `${rect.bottom + 10}px`;
    popover.style.display = "block";

    popover.querySelectorAll(".hashtag-suggestion-item").forEach((button) => {
      const handleSuggestionSelect = (event) => {
        event.preventDefault();
        event.stopPropagation();
        textarea.focus();
        insertSuggestedHashtag(textarea, button.dataset.tag);
      };

      button.addEventListener("mousedown", handleSuggestionSelect);
      button.addEventListener("click", handleSuggestionSelect);
    });
  } catch (error) {
    hideHashtagSuggestions();
  }
}

function initHashtagSuggestions(textarea) {
  if (!textarea) return;

  textarea.addEventListener("input", () => updateHashtagSuggestions(textarea));
  textarea.addEventListener("keyup", (event) => {
    if (event.key === "Escape") {
      hideHashtagSuggestions();
    }
  });
  textarea.addEventListener("blur", () => {
    setTimeout(hideHashtagSuggestions, 120);
  });
}

const auth = window.firebase ? firebase.auth() : null;
const signOutBtn = document.querySelector(".sign-out-btn");
const sideMenuProfileBtn = document.getElementById("sideMenuProfileBtn");
const sideMenuUserNameBtn = document.getElementById("sideMenuUserNameBtn");
const sideMenuProfileAvatar = document.getElementById("sideMenuProfileAvatar");
const sideMenuUserName = document.getElementById("sideMenuUserName");
const themeToggleBtn = document.getElementById("themeToggleBtn");

const themeStyleTag = document.getElementById("bookme-theme-styles") || (() => {
  const styleTag = document.createElement("style");
  styleTag.id = "bookme-theme-styles";
  styleTag.textContent = `
    :root {
      --app-bg: #ffffff;
      --app-text: #111111;
      --app-muted: #5a5a5a;
      --header-bg: #ffffff;
      --surface: #f5f5f5;
      --surface-strong: #ececec;
      --primary: rgb(177, 151, 252);
      --panel-border: rgba(17, 17, 17, 0.08);
      --shadow: rgba(0, 0, 0, 0.12);
      --brand-yellow: rgb(249, 245, 3);
      --menu-text: #111111;
      --icon-soft: rgb(104, 93, 104);
      --icon-strong: rgb(43, 43, 44);
      --chart-followers: #f4b400;
      --chart-likes: #ef4444;
      --chart-following: #3b82f6;
      --chart-posts: #6a5acd;
      --app-font: "Times New Roman", Times, serif;
    }

    body {
      background-color: var(--app-bg);
      color: var(--app-text);
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .your-data-chart-header,
    .your-data-chart-controls,
    .chart-type-btn {
      font-family: var(--app-font);
    }

    body.dark-mode {
      --app-bg: #0d1117;
      --app-text: #f3f4f6;
      --app-muted: #d1d5db;
      --header-bg: #111827;
      --surface: #161d2a;
      --surface-strong: #1d2433;
      --primary: rgb(177, 151, 252);
      --panel-border: rgba(255, 255, 255, 0.08);
      --shadow: rgba(0, 0, 0, 0.38);
      --brand-yellow: rgb(252, 246, 88);
      --menu-text: #f3f4f6;
      --icon-soft: #d5d7db;
      --icon-strong: #f3f4f6;
    }

    body.dark-mode,
    body.dark-mode .header,
    body.dark-mode .sidemenu,
    body.dark-mode .write-post-sheet,
    body.dark-mode .upload-sheet,
    body.dark-mode .settings-sheet,
    body.dark-mode .report-sheet,
    body.dark-mode .message-sheet,
    body.dark-mode .comment-sheet {
      background-color: var(--app-bg);
      color: var(--app-text);
    }

    body.dark-mode .header {
      background-color: var(--header-bg);
      border-bottom-color: rgba(255, 255, 255, 0.06);
    }

    body.dark-mode .header::after {
      background-color: rgba(255, 255, 255, 0.08);
    }

    body.dark-mode .title-wrap.brand-title-font,
    body.dark-mode #welcomeMessage.brand-title-font {
      color: var(--brand-yellow);
    }

    body.dark-mode .hashtag-highlight {
      color: #f5c94a;
      font-weight: 700;
    }

    body.dark-mode .search-icon,
    body.dark-mode .header-brand-icon,
    body.dark-mode .openbtn,
    body.dark-mode .menu-settings-btn,
    body.dark-mode .auth-btn,
    body.dark-mode .theme-toggle-btn {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
      color: var(--app-text);
    }

 

    body.dark-mode #searchInput,
    body.dark-mode .search-input-btn,
    body.dark-mode .search-back-btn {
      background: rgba(17, 24, 39, 0.9);
      border-color: rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
    }

    body.dark-mode .search-input-btn {
      background: rgba(17, 24, 39, 0.96);
    }

    body.dark-mode .sidemenu a,
    body.dark-mode .sidemenu .menu-settings-btn,
    body.dark-mode .theme-toggle-btn,
    body.dark-mode .menu-legal p,
    body.dark-mode .menu-auth-actions button,
    body.dark-mode .sidemenu-profile button,
    body.dark-mode .sidemenu-main a,
    body.dark-mode .sidemenu-main button {
      color: var(--menu-text);
    }

    body.dark-mode .report-menu-label,
    body.dark-mode .report-menu-item,
    body.dark-mode .post-report-btn,
    body.dark-mode .see-more-like-this,
    body.dark-mode .post-delete-btn,
    body.dark-mode .text-post-delete-btn {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #111111 !important;
    }

    body.dark-mode .sidemenu {
      background-color: var(--header-bg);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: 0 0 18px var(--shadow);
    }

    body.dark-mode .menu-settings-btn,
    body.dark-mode .auth-btn,
    body.dark-mode .report-menu-item,
    body.dark-mode .sidemenu-main a,
    body.dark-mode .theme-toggle-btn {
      background: rgba(255, 255, 255, 0.02);
    }

    body.dark-mode .announcement {
      background-color: #4b3a00;
      color: #fdf5c9;
    }

    body.dark-mode .feed-posts,
    body.dark-mode .post-card,
    body.dark-mode .comment-card,
    body.dark-mode .post-detail-card,
    body.dark-mode .search-result-card,
    body.dark-mode .message-item,
    body.dark-mode .chat-message,
    body.dark-mode .sheet-content,
    body.dark-mode .settings-sheet-content {
      background-color: var(--surface);
      color: var(--app-text);
      border-color: var(--panel-border);
    }

    body.dark-mode #settingsSheet .sheet-header {
      background: #000000 !important;
      border-bottom-color: rgba(255, 255, 255, 0.08) !important;
    }

    body.dark-mode .feed-caption,
    body.dark-mode .feed-caption-text,
    body.dark-mode .text-only-post .feed-caption,
    body.dark-mode .text-only-post .feed-caption-text,
    body.dark-mode .text-only-post p {
      color: #ffffff !important;
    }

    body.dark-mode #settingsSheet .sheet-content h3,
    body.dark-mode #settingsSheet .sheet-content label,
    body.dark-mode #settingsSheet .sheet-content input,
    body.dark-mode #settingsSheet .sheet-content select,
    body.dark-mode #settingsSheet .sheet-content button,
    body.dark-mode #settingsSheet .sheet-content .submit-btn,
    body.dark-mode #settingsSheet .sheet-content .contact-btn,
    body.dark-mode .settings-field-group label,
    body.dark-mode .settings-field-group input,
    body.dark-mode .settings-field-group select,
    body.dark-mode #settingsSheet h3,
    body.dark-mode #settingsSheet label,
    body.dark-mode #settingsSheet input,
    body.dark-mode #settingsSheet select {
      color: #ffffff !important;
    }

    body.dark-mode #settingsSheet .sheet-content input,
    body.dark-mode #settingsSheet .sheet-content select,
    body.dark-mode .settings-field-group input,
    body.dark-mode .settings-field-group select {
      background-color: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
      color: #ffffff !important;
    }

    body.dark-mode .like-btn i,
    body.dark-mode .comment-btn i,
    body.dark-mode .fa-bookmark,
    body.dark-mode .fa-retweet,
    body.dark-mode .like-btn .like-count,
    body.dark-mode .comment-btn .comment-count,
    body.dark-mode .feed-post-card .comment-btn .comment-count,
    body.dark-mode .feed-post-card .like-btn .like-count {
      color:  #ff4d6d; !important;
    }

    body.dark-mode input,
    body.dark-mode textarea,
    body.dark-mode select,
    body.dark-mode button {
      color: var(--app-text);
    }

    body.dark-mode input,
    body.dark-mode textarea,
    body.dark-mode select {
      background-color: var(--surface-strong);
      border-color: var(--panel-border);
    }

    body.dark-mode .upload-sheet {
      background-color: #111827;
      color: #f3f4f6;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    #uploadDescription::placeholder,
    #uploadDescription::-webkit-input-placeholder,
    #uploadDescription::-moz-placeholder,
    #uploadDescription:-ms-input-placeholder {
      color: transparent !important;
      opacity: 0 !important;
    }

    body.dark-mode #uploadDescription {
      background-color: rgba(255, 255, 255, 0.04);
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      color: #ffffff;
    }

    body.dark-mode #uploadDescription::placeholder,
    body.dark-mode #uploadDescription::-webkit-input-placeholder,
    body.dark-mode #uploadDescription::-moz-placeholder,
    body.dark-mode #uploadDescription:-ms-input-placeholder {
      color: transparent !important;
      opacity: 0 !important;
    }

    body.dark-mode .upload-limit-note {
      color: rgba(255, 255, 255, 0.55) !important;
    }

    body.dark-mode .upload-sheet .sheet-content,
    body.dark-mode .upload-sheet .sheet-header {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
    }

    body.dark-mode .recent-search-pill {
      color: #f3f4f6;
    }

    body.dark-mode .recent-search-name {
      color: #ffffff !important;
    }

    body.dark-mode .comments-sheet {
      background-color: #111827;
      border-top-color: rgba(255, 255, 255, 0.08);
      color: #f3f4f6;
    }

    body.dark-mode .comments-sheet .comments-header h3,
    body.dark-mode .comments-sheet .comment-user-meta strong,
    body.dark-mode .comments-sheet .comment-text,
    body.dark-mode .comments-sheet .comment-empty,
    body.dark-mode .comments-sheet .comment-date {
      color: #f3f4f6;
    }

    body.dark-mode .comment-user-line {
      color: #f3f4f6;
    }

    body.dark-mode .comments-sheet .comment-input-wrap {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
    }

    body.dark-mode .comments-sheet .comment-input {
      background: transparent;
      color: #f3f4f6;
    }

    body.dark-mode .comments-sheet .comment-input::placeholder {
      color: #c7d2fe;
    }

    body.dark-mode .comments-sheet .comment-item {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
      box-shadow: none;
      color: #f3f4f6;
    }

    body.dark-mode .comments-sheet .comment-thread.is-reply .comment-item {
      background: rgba(255, 255, 255, 0.05);
    }

    body.dark-mode .comments-sheet .comment-action-btn {
      color: #d1d5db;
    }

    body.dark-mode .comments-sheet .comment-like-btn.liked {
      color: #f472b6;
    }

    body.dark-mode .comments-sheet .close-btn,
    body.dark-mode .comments-sheet .sheet-drag,
    body.dark-mode .comments-sheet #submitCommentBtn {
      color: #f3f4f6;
    }

    body.dark-mode .comments-sheet #submitCommentBtn {
      background: #f3f4f6;
      color: #111827;
    }

    button#themeToggleBtn.theme-toggle-btn {
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }

    button#themeToggleBtn.theme-toggle-btn:hover {
      transform: translateY(-1px);
    }

    button#themeToggleBtn.theme-toggle-btn .theme-toggle-label {
      flex: 1;
      color: inherit;
    }

    button#themeToggleBtn.theme-toggle-btn .theme-toggle-switch {
      position: relative;
      width: 46px;
      height: 26px;
      border-radius: 999px;
      background: rgba(17, 17, 17, 0.14);
      border: 1px solid rgba(17, 17, 17, 0.08);
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    button#themeToggleBtn.theme-toggle-btn .theme-toggle-knob {
      position: absolute;
      top: 3px;
      left: 4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
      transition: transform 0.2s ease, background 0.2s ease;
    }

    button#themeToggleBtn.theme-toggle-btn.is-dark {
      border-color: rgba(123, 92, 255, 0.45);
      background: rgba(123, 92, 255, 0.12);
    }

    button#themeToggleBtn.theme-toggle-btn.is-dark .theme-toggle-switch {
      background: linear-gradient(135deg, #8f7cff, #5c6cff);
      border-color: rgba(255, 255, 255, 0.12);
    }

    button#themeToggleBtn.theme-toggle-btn.is-dark .theme-toggle-knob {
      transform: translateX(20px);
      background: #f7d14e;
    }

    body.dark-mode button#themeToggleBtn.theme-toggle-btn {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: #f3f4f6;
    }

    body.dark-mode button#themeToggleBtn.theme-toggle-btn .theme-toggle-switch {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.08);
    }

    body.dark-mode button#themeToggleBtn.theme-toggle-btn .theme-toggle-knob {
      background: #f5f5f5;
    }

    body.dark-mode button#themeToggleBtn.theme-toggle-btn.is-dark .theme-toggle-switch {
      background: linear-gradient(135deg, #8f7cff, #5c6cff);
    }
    
    body.dark-mode .feed-post-user-name,
body.dark-mode .side-menu-user-name-btn,
body.dark-mode #sideMenuUserName {
  color: #ffffff !important;
}

body.dark-mode .see-more-btn,
body.dark-mode .feed-read-more-btn,
body.dark-mode .reel-read-more-btn,
body.dark-mode .readmore-btn,
body.dark-mode .text-only-post .feed-read-more-btn,
.dark-mode .see-more-btn,
.dark-mode .feed-read-more-btn,
.dark-mode .reel-read-more-btn,
.dark-mode .readmore-btn {
  background: none !important;
  color: white !important;
  padding: 4px 10px !important;
  box-shadow: none !important;
}

body.dark-mode .see-more-like-this,
body.dark-mode .see-more-like-this:hover,
.dark-mode .see-more-like-this {
  background: transparent !important;
  border: none !important;
  color: #111111 !important;
  padding: 10px 12px !important;
  box-shadow: none !important;

}

   body.dark-mode .feed-more-bar { 
      background: rgba(255, 255, 255, 0.04) !important;
      border-color: rgba(238, 4, 4, 0.12) !important;
      

    }
  `;
  document.head.appendChild(styleTag);
  return styleTag;
})();

function getPreferredTheme() {
  const savedTheme = localStorage.getItem("bookme-theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateFeedActionTheme(theme) {
  const isDark = theme === "dark";

  document.querySelectorAll(".like-btn i, .comment-btn i, .fa-bookmark, .fa-retweet, .like-btn .like-count, .comment-btn .comment-count").forEach((element) => {
    if (!element) return;
    element.style.color = isDark ? "#ffffff" : "";
    if (element.classList && element.classList.contains("like-count")) {
      element.style.color = isDark ? "#ffffff" : "";
    }
    if (element.classList && element.classList.contains("comment-count")) {
      element.style.color = isDark ? "#ffffff" : "";
    }
  });
}

function updateSettingsSheetTheme(theme) {
  const isDark = theme === "dark";
  const settingsSheet = document.getElementById("settingsSheet");
  if (!settingsSheet) return;

  settingsSheet.querySelectorAll("h3, label, input, select, button").forEach((element) => {
    if (!element) return;
    const isInputOrSelect = element.tagName === "INPUT" || element.tagName === "SELECT";
    element.style.color = isDark ? "#ffffff" : "";

    if (isInputOrSelect) {
      element.style.backgroundColor = isDark ? "rgba(255, 255, 255, 0.04)" : "";
      element.style.borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "";
    }
  });
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark-mode", isDark);
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("bookme-theme", theme);
  updateFeedActionTheme(theme);
  updateSettingsSheetTheme(theme);

  const themeLabel = themeToggleBtn?.querySelector(".theme-toggle-label");

  if (themeToggleBtn) {
    themeToggleBtn.classList.toggle("is-dark", isDark);
    themeToggleBtn.setAttribute("aria-pressed", String(isDark));
  }

  if (themeLabel) {
    themeLabel.textContent = isDark ? "Dark mode" : "Dark mode";
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("dark-mode") ? "light" : "dark";
    applyTheme(nextTheme);
  });
}

applyTheme(getPreferredTheme());

/* User Data Slideup Sheet Functions */
const yourDataSheet = document.getElementById("yourDataSheet");
const openYourDataBtn = document.getElementById("openYourDataSheetBtn");
const closeYourDataSheet = document.getElementById("closeYourDataSheet");
const friendsSheet = document.getElementById("friendsSheet");
const openFriendsSheetBtn = document.getElementById("friendsSheetBtn");
const closeFriendsSheetBtn = document.getElementById("closeFriendsSheet");
const friendsSheetList = document.getElementById("friendsSheetList");
const friendsSuggestionsList = document.getElementById("friendsSuggestionsList");
const friendsSuggestionSearchInput = document.getElementById("friendsSuggestionSearchInput");
const friendsSheetSlider = document.getElementById("friendsSheetSlider");
const friendsSheetModeButtons = document.querySelectorAll(".friends-sheet-mode-btn");
let selectedUserDataChartType = "column";
let currentFriendsSuggestionData = [];
let currentUserActivityData = [];
let currentUserDataTotals = { post_count: 0, total_likes: 0, follower_count: 0, following_count: 0 };

function getLast12MonthsFallback() {
  const months = [];
  const now = new Date();

  for (let i = 11; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: date.toLocaleString("en-US", { month: "short" }),
      posts: 0,
      likes: 0
    });
  }

  return months;
}

function formatCompactNumber(value) {
  const safeValue = Number(value || 0);
  if (!Number.isFinite(safeValue) || safeValue === 0) return "0";
  if (safeValue >= 1000000) {
    const millions = safeValue / 1000000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (safeValue >= 1000) {
    return `${Math.round(safeValue / 1000)}k`;
  }
  return String(safeValue);
}

function renderYourDataChart(type = selectedUserDataChartType, data = currentUserActivityData, totals = currentUserDataTotals) {
  const chartContainer = document.getElementById("yourDataChart");
  if (!chartContainer) return;

  const activity = Array.isArray(data) && data.length ? data : getLast12MonthsFallback();
  const chartTotals = totals || { post_count: 0, total_likes: 0, following_count: 0 };

  if (type === "pie") {
    const pieSeries = [
      { label: "Posts", value: Number(chartTotals.post_count || 0), color: "#111111" },
      { label: "Likes", value: Number(chartTotals.total_likes || 0), color: "#f4b400" },
      { label: "Followers", value: Number(chartTotals.follower_count || 0), color: "#4caf50" },
      { label: "Following", value: Number(chartTotals.following_count || 0), color: "#0ea5e9" }
    ];

    const pieTotal = pieSeries.reduce((sum, item) => sum + Math.max(item.value, 0), 0) || 1;
    const cx = 110;
    const cy = 86;
    const radius = 82;

    let angle = -Math.PI / 2;
    const segments = pieSeries.map((item) => {
      const slice = (Math.max(item.value, 0) / pieTotal) * Math.PI * 2;
      const start = angle;
      const end = angle + slice;
      angle = end;

      const x1 = cx + Math.cos(start) * radius;
      const y1 = cy + Math.sin(start) * radius;
      const x2 = cx + Math.cos(end) * radius;
      const y2 = cy + Math.sin(end) * radius;
      const largeArc = slice > Math.PI ? 1 : 0;
      return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    });

    const legend = pieSeries.map((item) => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color};"></span>
          <span style="font-size:0.78rem;color:white;">${item.label}</span>
        </div>
        <span style="font-size:0.78rem;color:#111;font-weight:700;">${item.value}</span>
      </div>
    `).join("");

    chartContainer.innerHTML = `
      <svg viewBox="0 0 220 170" width="100%" height="170" style="display:block;">
        ${pieSeries.map((item, index) => `<path d="${segments[index]}" fill="${item.color}" opacity="0.95"></path>`).join("")}
        <circle cx="${cx}" cy="${cy}" r="24" fill="#ffffff"></circle>
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#111111">${pieTotal}</text>
      </svg>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">${legend}</div>
    `;
    return;
  }

  if (type === "plot") {
    const plotValues = activity.map((item) => Number(item?.posts || 0) + Number(item?.likes || 0));
    const maxPlotValue = Math.max(...plotValues, 1);
    const points = plotValues.map((value, index) => {
      const x = 18 + index * (264 / Math.max(plotValues.length - 1, 1));
      const y = 136 - (value / maxPlotValue) * 96;
      return `${x},${y}`;
    }).join(" ");

    const gridLines = Array.from({ length: 4 }, (_, index) => {
      const y = 18 + index * 28;
      return `<line x1="18" y1="${y}" x2="282" y2="${y}" stroke="rgba(17,17,17,0.12)" stroke-width="1"></line>`;
    }).join("");

    const labels = activity.map((item, index) => {
      const x = 18 + index * (264 / Math.max(activity.length - 1, 1));
      return `<text x="${x}" y="154" text-anchor="middle" font-size="8" fill="#111111">${item?.month || ""}</text>`;
    }).join("");

    chartContainer.innerHTML = `
      <svg viewBox="0 0 300 170" width="100%" height="170" style="display:block;overflow:visible;">
        ${gridLines}
        <polyline fill="none" stroke="#111111" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round"></polyline>
        ${plotValues.map((value, index) => {
          const x = 18 + index * (264 / Math.max(plotValues.length - 1, 1));
          const y = 136 - (value / maxPlotValue) * 96;
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="#f4b400"></circle>`;
        }).join("")}
        ${labels}
      </svg>
    `;
    return;
  }

  const columnSeries = [
    { label: "Followers", value: Number(chartTotals.follower_count || 0), color: "#f4b400" },
    { label: "Likes", value: Number(chartTotals.total_likes || 0), color: "#ef4444" },
    { label: "Following", value: Number(chartTotals.following_count || 0), color: "#3b82f6" },
    { label: "Posts", value: Number(chartTotals.post_count || 0), color: "#6a5acd" }
  ];

  const chartWidth = 380;
  const chartHeight = 160;
  const chartPlotTop = 20;
  const chartPlotBottom = 170;
  const axisMax = 1000000;
  const axisValues = [0, 100000, 200000, 400000, 600000, 800000, 1000000];
  const startX = 82;
  const gap = 32;
  const barWidth = 46;
  const axisX = 68;
  const chartRange = chartPlotBottom - chartPlotTop;

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${chartWidth} 245" width="100%" height="260" style="display:block;">
      <g transform="translate(0 12)">
        <text x="${chartWidth / 2}" y="88" text-anchor="middle" font-size="16" font-weight="900" fill="#111111" font-family="'Times New Roman', Times, serif" style="margin-top:10px;"></text>

        <g>
          ${axisValues.map((value, index) => {
            const totalSteps = Math.max(axisValues.length - 1, 1);
            const actualY = chartPlotBottom - ((index / totalSteps) * (chartPlotBottom - chartPlotTop));
            return `
              <g>
                <line x1="${axisX}" y1="${actualY}" x2="${chartWidth - 26}" y2="${actualY}" stroke="rgba(27, 27, 27, 0.38)" stroke-width="1"></line>
                <line x1="${axisX}" y1="${actualY}" x2="${axisX}" y2="${actualY}" stroke="rgba(35, 35, 35, 0.7)" stroke-width="1"></line>
                <text x="${axisX - 8}" y="${actualY + 4}" text-anchor="end" font-size="14" fill="#0c0c0c" font-family="'Times New Roman', Times, serif">${formatCompactNumber(value)}</text>
              </g>
            `;
          }).join("")}
        </g>

        <g>
          ${columnSeries.map((item, index) => {
            const x = startX + index * (barWidth + gap);
            const safeValue = Math.min(Math.max(Number(item.value || 0), 0), axisMax);
            const visibleHeight = (safeValue / axisMax) * chartRange;
            const y = chartPlotBottom - visibleHeight;
            return `
              <g>
                <rect x="${x}" y="${y}" width="${barWidth}" height="${visibleHeight}" fill="${item.color}" opacity="0.95"></rect>
                <text x="${x + barWidth / 2}" y="${chartPlotBottom + 20}" text-anchor="middle" font-size="16" fill="${item.color}" font-family="arial, sans-serif">${item.label}</text>
              </g>
            `;
          }).join("")}
        </g>
      </g>
    </svg>
  `;
}

window.forceYourDataChartTest = function (values = { post_count: 1000000, total_likes: 1000000, follower_count: 1000000, following_count: 1000000 }) {
  const nextTotals = {
    post_count: Number(values.post_count || 0),
    total_likes: Number(values.total_likes || 0),
    follower_count: Number(values.follower_count || 0),
    following_count: Number(values.following_count || 0)
  };

  currentUserDataTotals = nextTotals;

  const totalLikesEl = document.getElementById("yourDataTotalLikes");
  const postCountEl = document.getElementById("yourDataPostCount");
  const followerCountEl = document.getElementById("yourDataFollowerCount");
  const followingCountEl = document.getElementById("yourDataFollowingCount");

  if (totalLikesEl) totalLikesEl.textContent = formatCompactNumber(nextTotals.total_likes);
  if (postCountEl) postCountEl.textContent = formatCompactNumber(nextTotals.post_count);
  if (followerCountEl) followerCountEl.textContent = formatCompactNumber(nextTotals.follower_count);
  if (followingCountEl) followingCountEl.textContent = formatCompactNumber(nextTotals.following_count);

  renderYourDataChart(selectedUserDataChartType, currentUserActivityData, currentUserDataTotals);
};

async function renderYourDataStats() {
  const totalLikesEl = document.getElementById("yourDataTotalLikes");
  const postCountEl = document.getElementById("yourDataPostCount");
  const followerCountEl = document.getElementById("yourDataFollowerCount");
  const followingCountEl = document.getElementById("yourDataFollowingCount");
  const avatarEl = document.getElementById("yourDataAvatar");
  const displayNameEl = document.getElementById("yourDataDisplayName");

  if (!totalLikesEl || !postCountEl || !followerCountEl || !followingCountEl) return;

  const currentUserId = getCurrentUserId();
  const profileData = getCurrentUserProfileData(currentUserId) || {};
  const directName = String(profileData.name || profileData.displayName || "").trim();
  const firstName = String(profileData.firstName || profileData.first_name || "").trim();
  const lastName = String(profileData.lastName || profileData.last_name || "").trim();
  const fallbackDisplayName = [directName || [firstName, lastName].filter(Boolean).join(" "), auth?.currentUser?.displayName || "", auth?.currentUser?.email ? auth.currentUser.email.split("@")[0] : ""].filter(Boolean)[0] || "User";

  if (displayNameEl) {
    displayNameEl.textContent = fallbackDisplayName;
  }

  if (avatarEl) {
    const avatarUrl = getProfilePicForUser(currentUserId);
    if (avatarUrl) {
      avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Profile picture" />`;
    } else {
      avatarEl.innerHTML = '<i class="fa-solid fa-circle-user"></i>';
    }
  }

  if (!currentUserId || currentUserId === "guest") {
    totalLikesEl.textContent = "0";
    postCountEl.textContent = "0";
    followingCountEl.textContent = "0";
    currentUserDataTotals = { post_count: 0, total_likes: 0, follower_count: 0, following_count: 0 };
    currentUserActivityData = getLast12MonthsFallback();
    renderYourDataChart(selectedUserDataChartType, currentUserActivityData, currentUserDataTotals);
    return;
  }

  try {
    const [statsResponse, activityResponse] = await Promise.all([
      fetch(`/api/users/${encodeURIComponent(currentUserId)}/stats`),
      fetch(`/api/users/${encodeURIComponent(currentUserId)}/activity`)
    ]);

    if (!statsResponse.ok) {
      throw new Error("Failed to load user stats");
    }

    const statsData = await statsResponse.json();
    const activityData = activityResponse.ok ? await activityResponse.json() : { data: [] };

    const normalizedStats = {
      post_count: Number(statsData?.post_count || 0),
      total_likes: Number(statsData?.total_likes || 0),
      follower_count: Number(statsData?.follower_count || 0),
      following_count: Number(statsData?.following_count || 0)
    };

    currentUserDataTotals = normalizedStats;
    currentUserActivityData = Array.isArray(activityData?.data) && activityData.data.length ? activityData.data : getLast12MonthsFallback();

    totalLikesEl.textContent = formatCompactNumber(normalizedStats.total_likes);
    postCountEl.textContent = formatCompactNumber(normalizedStats.post_count);
    followerCountEl.textContent = formatCompactNumber(normalizedStats.follower_count);
    followingCountEl.textContent = formatCompactNumber(normalizedStats.following_count);
    renderYourDataChart(selectedUserDataChartType, currentUserActivityData, currentUserDataTotals);
  } catch (error) {
    console.error("USER STATS ERROR:", error);
    const allPosts = Array.isArray(window.__feedPostsCache) ? window.__feedPostsCache : [];
    const userPosts = allPosts.filter((post) => {
      const authorId = post && post.user_id ? String(post.user_id) : "";
      return authorId && authorId === String(currentUserId);
    });

    const fallbackTotalLikes = userPosts.reduce((sum, post) => {
      const value = Number(post?.likes_count ?? post?.like_count ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const fallbackStats = {
      post_count: userPosts.length,
      total_likes: fallbackTotalLikes,
      follower_count: 0,
      following_count: 0
    };

    currentUserDataTotals = fallbackStats;
    currentUserActivityData = getLast12MonthsFallback();

    totalLikesEl.textContent = formatCompactNumber(fallbackStats.total_likes);
    postCountEl.textContent = formatCompactNumber(fallbackStats.post_count);
    followerCountEl.textContent = formatCompactNumber(fallbackStats.follower_count);
    followingCountEl.textContent = formatCompactNumber(fallbackStats.following_count);
    renderYourDataChart(selectedUserDataChartType, currentUserActivityData, currentUserDataTotals);
  }
}

if (document.querySelectorAll(".chart-type-btn").length) {
  document.querySelectorAll(".chart-type-btn").forEach((button) => {
    button.addEventListener("click", () => {
      selectedUserDataChartType = button.dataset.chartType || "column";
      document.querySelectorAll(".chart-type-btn").forEach((btn) => {
        btn.classList.toggle("active", btn === button);
      });
      renderYourDataChart(selectedUserDataChartType, currentUserActivityData, currentUserDataTotals);
    });
  });
}

if (openYourDataBtn) {
  openYourDataBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await renderYourDataStats();
    openSheet(yourDataSheet);
  });
}

if (closeYourDataSheet) {
  closeYourDataSheet.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSheet(yourDataSheet);
  });
}

if (yourDataSheet) {
  yourDataSheet.addEventListener("click", (event) => {
    if (event.target === yourDataSheet) {
      closeSheet(yourDataSheet);
    }
  });
}

/* Friends sheet functionality */

function renderFriendsSheetPlaceholder(message = "No friends yet.") {
  if (!friendsSheetList) return;

  friendsSheetList.innerHTML = `
    <div class="friends-empty-state">${escapeHtml(message)}</div>
  `;
}

async function loadFriendsListForCurrentUser() {
  if (!friendsSheetList) return;

  const currentUserId = getCurrentUserId();
  if (!currentUserId || currentUserId === "guest") {
    renderFriendsSheetPlaceholder("Sign in to see your friends.");
    return;
  }

  try {
    const response = await fetch(`/api/users/${encodeURIComponent(currentUserId)}/following`);
    if (!response.ok) {
      throw new Error(`Failed to load friends: ${response.status}`);
    }

    const data = await response.json();
    const following = Array.isArray(data?.following) ? data.following : [];

    if (!following.length) {
      renderFriendsSheetPlaceholder("No friends yet.");
      return;
    }

    friendsSheetList.innerHTML = following.map((user) => {
      const userId = user?.id || "";
      const displayName = String(user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User").trim() || "User";
      const avatarUrl = user?.profile_pic || "";
      const avatarMarkup = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
        : `<i class="fa-solid fa-circle-user" aria-hidden="true"></i>`;

      return `
        <div class="friend-sheet-item">
          <div class="friend-sheet-user">
            <div class="friend-sheet-avatar">${avatarMarkup}</div>
            <div>
              <div class="friend-sheet-name">${escapeHtml(displayName)}</div>
              <div class="friend-sheet-status">Following</div>
            </div>
          </div>
          <button type="button" class="friend-sheet-pill" data-user-id="${escapeHtml(userId)}">View</button>
        </div>
      `;
    }).join("");

    friendsSheetList.querySelectorAll(".friend-sheet-pill").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const targetUserId = button.dataset.userId || "";
        if (targetUserId) {
          closeSheet(friendsSheet);
          if (typeof openUserProfileSheet === "function") {
            openUserProfileSheet(targetUserId);
          }
        }
      });
    });
  } catch (error) {
    console.error("FRIENDS SHEET ERROR:", error);
    renderFriendsSheetPlaceholder("Unable to load friends right now.");
  }
}

function renderFriendsSuggestionsPlaceholder(message = "No suggestions yet.") {
  if (!friendsSuggestionsList) return;
  friendsSuggestionsList.innerHTML = `<div class="friends-empty-state">${escapeHtml(message)}</div>`;
}

function renderSuggestionMatches(query = "") {
  if (!friendsSuggestionsList) return;

  const normalizedQuery = String(query || "").trim().toLowerCase();
  const filteredSuggestions = !normalizedQuery
    ? currentFriendsSuggestionData
    : currentFriendsSuggestionData.filter((user) => {
        const displayName = String(user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "").trim() || "";
        return displayName.toLowerCase().includes(normalizedQuery);
      });

  if (!filteredSuggestions.length) {
    renderFriendsSuggestionsPlaceholder(normalizedQuery ? "No matching suggestions." : "Type to see suggestions.");
    return;
  }

  friendsSuggestionsList.innerHTML = filteredSuggestions.map((user) => {
    const userId = user?.id || "";
    const displayName = String(user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User").trim() || "User";
    const avatarUrl = user?.profile_pic || "";
    const avatarMarkup = avatarUrl
      ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<i class="fa-solid fa-circle-user" aria-hidden="true"></i>`;

    return `
      <div class="friend-sheet-item">
        <div class="friend-sheet-user">
          <div class="friend-sheet-avatar">${avatarMarkup}</div>
          <div>
            <div class="friend-sheet-name">${escapeHtml(displayName)}</div>
            <div class="friend-sheet-status">Suggested</div>
          </div>
        </div>
        <button type="button" class="friend-sheet-follow-btn" data-user-id="${escapeHtml(userId)}">Follow</button>
      </div>
    `;
  }).join("");

  friendsSuggestionsList.querySelectorAll(".friend-sheet-follow-btn").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const targetUserId = button.dataset.userId || "";
      if (!targetUserId || getCurrentUserId() === "guest") {
        alert("Please sign in to follow someone.");
        return;
      }

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(targetUserId)}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: getCurrentUserId(),
            name: getCurrentUserDisplayNameForApi()
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to follow user.");
        }

        await Promise.all([
          loadFriendsListForCurrentUser(),
          loadFriendsSuggestionsForCurrentUser()
        ]);
      } catch (error) {
        console.error("FOLLOW SUGGESTION ERROR:", error);
        alert(error.message || "Unable to follow user right now.");
      }
    });
  });
}

async function loadFriendsSuggestionsForCurrentUser() {
  if (!friendsSuggestionsList) return;

  const currentUserId = getCurrentUserId();
  if (!currentUserId || currentUserId === "guest") {
    currentFriendsSuggestionData = [];
    renderFriendsSuggestionsPlaceholder("Sign in to see suggestions.");
    return;
  }

  try {
    const response = await fetch(`/api/users/${encodeURIComponent(currentUserId)}/following-suggestions`);
    if (!response.ok) {
      throw new Error(`Failed to load suggestions: ${response.status}`);
    }

    const data = await response.json();
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
    currentFriendsSuggestionData = suggestions;

    if (friendsSuggestionSearchInput) {
      renderSuggestionMatches(friendsSuggestionSearchInput.value || "");
    } else {
      renderSuggestionMatches();
    }
  } catch (error) {
    console.error("FRIENDS SUGGESTIONS ERROR:", error);
    currentFriendsSuggestionData = [];
    renderFriendsSuggestionsPlaceholder("Unable to load suggestions right now.");
  }
}

function setFriendsSheetMode(mode = "friends") {
  const nextMode = mode === "suggestions" ? "suggestions" : "friends";

  if (friendsSheetSlider) {
    friendsSheetSlider.classList.toggle("is-suggestions", nextMode === "suggestions");
  }

  friendsSheetModeButtons.forEach((button) => {
    const isActive = button.dataset.friendsMode === nextMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

setFriendsSheetMode("friends");

if (friendsSheetModeButtons.length) {
  friendsSheetModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setFriendsSheetMode(button.dataset.friendsMode || "friends");
    });
  });
}

if (friendsSuggestionSearchInput) {
  const syncSuggestionInputState = (value = friendsSuggestionSearchInput.value || "") => {
    const hasValue = String(value).trim().length > 0;
    friendsSuggestionSearchInput.classList.toggle("active", hasValue || friendsSuggestionSearchInput === document.activeElement);
  };

  friendsSuggestionSearchInput.addEventListener("input", (event) => {
    const value = event.target.value || "";
    syncSuggestionInputState(value);
    renderSuggestionMatches(value);
  });

  friendsSuggestionSearchInput.addEventListener("focus", () => syncSuggestionInputState(friendsSuggestionSearchInput.value || ""));
  friendsSuggestionSearchInput.addEventListener("blur", () => syncSuggestionInputState(friendsSuggestionSearchInput.value || ""));
}

if (openFriendsSheetBtn) {
  openFriendsSheetBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setFriendsSheetMode("friends");
    await Promise.all([
      loadFriendsListForCurrentUser(),
      loadFriendsSuggestionsForCurrentUser()
    ]);
    openSheet(friendsSheet);
  });
}

if (closeFriendsSheetBtn) {
  closeFriendsSheetBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSheet(friendsSheet);
  });
}

if (friendsSheet) {
  friendsSheet.addEventListener("click", (event) => {
    if (event.target === friendsSheet) {
      closeSheet(friendsSheet);
    }
  });
}

/* ============================================================
   AUTH + PROFILE FUNCTIONS
   Handles login state, profile data, local storage, and avatar work.
   ============================================================ */

function getDefaultUserAvatarMarkup({ size = 28, color = "rgb(108, 108, 105)" } = {}) {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="display:block; color:${color};">
      <path fill="currentColor" d="M12 12.2a4.35 4.35 0 1 0-4.35-4.35A4.35 4.35 0 0 0 12 12.2Zm0 2.2c-4.4 0-8 2.35-8 5.25V21h16v-1.35c0-2.9-3.6-5.25-8-5.25Z"/>
    </svg>
  `;
}

function updateSideMenuProfileAvatar() {
  if (!sideMenuProfileAvatar) return;

  const avatarUrl = getProfilePicForUser(getCurrentUserId());

  if (avatarUrl) {
    sideMenuProfileAvatar.innerHTML = `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="Profile picture" />`;
    return;
  }

  sideMenuProfileAvatar.innerHTML = getDefaultUserAvatarMarkup({ size: 28, color: "rgb(108, 108, 105)" });
}

function updateSideMenuUserName() {
  if (!sideMenuUserName) return;

  const userId = getCurrentUserId();
  const data = getCurrentUserProfileData(userId) || {};
  const firstName = (data.firstName || data.first_name || "").trim();
  const lastName = (data.lastName || data.last_name || "").trim();
  const directName = (data.name || data.displayName || "").trim();
  const customName = [directName || [firstName, lastName].filter(Boolean).join(" ")].filter(Boolean)[0];

  let displayName = "User";

  if (customName) {
    displayName = customName;
  } else if (auth?.currentUser?.displayName) {
    displayName = auth.currentUser.displayName;
  } else if (auth?.currentUser?.email) {
    displayName = auth.currentUser.email.split("@")[0];
  }

  const truncatedName = displayName.length > 22 ? `${displayName.slice(0, 19).trim()}...` : displayName;
  sideMenuUserName.title = displayName;
  sideMenuUserName.innerHTML = renderUserNameWithVerification(truncatedName, userId);
}

function redirectToLogin() {
  if (window.location.pathname.endsWith("login.html")) {
    return;
  }

  window.location.replace("login.html");
}

if (auth) {
  let authRedirectTimer = null;
  const protectedPaths = ["/", "/index.html", "/message.html"];
  const currentPath = window.location.pathname.replace(/\/+/g, "/");
  const isProtectedPage = protectedPaths.includes(currentPath) || currentPath.endsWith("/index.html") || currentPath.endsWith("/message.html");

  const scheduleAuthRedirect = () => {
    if (authRedirectTimer) {
      clearTimeout(authRedirectTimer);
    }

    authRedirectTimer = setTimeout(() => {
      if (!auth.currentUser && !window.location.pathname.endsWith("login.html") && !window.location.pathname.endsWith("reels.html")) {
        redirectToLogin();
      }
    }, 1500);
  };

  auth.onAuthStateChanged((user) => {
    if (authRedirectTimer) {
      clearTimeout(authRedirectTimer);
    }

    if (!user) {
      if (isProtectedPage) {
        scheduleAuthRedirect();
      }
      if (profilePicBtn) {
        profilePicBtn.innerHTML = getDefaultUserAvatarMarkup({ size: 42, color: "rgb(108, 108, 105)" });
      }
      return;
    }

    const userProfilePic = getProfilePicForUser(user.uid) || user.photoURL;
    if (profilePicBtn) {
      if (userProfilePic) {
        setProfilePicPreview(userProfilePic, user.uid);
      } else {
        setProfilePicPreview(null, user.uid);
      }
    }

    updateSideMenuProfileAvatar();
    updateSideMenuUserName();
    updateProfileNameDisplay(user.uid);
    ensureUserProfileRecordOnServer(user);
    loadCurrentUserProfileDataFromServer(user.uid).then(() => populateProfileSettingsForm(user.uid));
    populateProfileSettingsForm(user.uid);
    startNotificationPolling();
    loadNotificationCount();

    if (feedPosts || searchResults) {
      loadPosts();
    }

    if (window.location.pathname.endsWith("message.html") && typeof initializeMessagePage === "function") {
      initializeMessagePage();
    }
  });
}

function getCurrentUserId() {
  return auth?.currentUser?.uid || "guest";
}

function getProfilePicKeyForUser(userId = getCurrentUserId()) {
  const safeUserId = userId || "guest";
  return safeUserId === "guest" ? "bookme_profile_pic" : `bookme_profile_pic_${safeUserId}`;
}

function getProfilePicForUser(userId = getCurrentUserId()) {
  return localStorage.getItem(getProfilePicKeyForUser(userId));
}

function getUserProfileKey(userId = getCurrentUserId()) {
  return `bookme_user_profile_${userId || "guest"}`;
}

function getCurrentUserProfileData(userId = getCurrentUserId()) {
  try {
    const raw = localStorage.getItem(getUserProfileKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function validateDisplayNamePolicy(name, fieldLabel = "Name") {
  const trimmedName = String(name || "").trim();

  if (!trimmedName) {
    return `${fieldLabel} is required.`;
  }

  if (trimmedName.length < 2) {
    return `${fieldLabel} must be at least 2 characters long.`;
  }

  if (trimmedName.length > 30) {
    return `${fieldLabel} must be no more than 30 characters long.`;
  }

  if (/\p{Extended_Pictographic}/u.test(trimmedName)) {
    return `${fieldLabel} cannot contain emojis.`;
  }

  if (/[!@#$%^&*()[\]{};:"\\|<>/?~]/.test(trimmedName)) {
    return `${fieldLabel} cannot contain special symbols like @, #, $, %, ^, &, *, (, ), or similar characters.`;
  }

  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(trimmedName)) {
    return `${fieldLabel} can only contain letters, numbers, spaces, apostrophes, and hyphens.`;
  }

  const normalized = trimmedName.toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized.includes("chatmini") || normalized.includes("chat-mini")) {
    return "The name 'Chat-mini' cannot be used for impersonation or misleading purposes.";
  }

  const restrictedWords = ["fuck", "shit", "bitch", "hate", "nazi", "slur", "bomb", "terror"];
  if (restrictedWords.some((word) => normalized.includes(word))) {
    return `${fieldLabel} contains restricted or offensive language.`;
  }

  return "";
}

function saveCurrentUserProfileData(data, userId = getCurrentUserId()) {
  const firstName = String(data?.firstName || "").trim();
  const lastName = String(data?.lastName || "").trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  const nameError = validateDisplayNamePolicy(fullName || firstName || lastName || "", "Name");

  if (nameError) {
    alert(nameError);
    return false;
  }

  const currentData = getCurrentUserProfileData(userId);
  const merged = { ...currentData, ...data, name: fullName || currentData?.name || "" };
  localStorage.setItem(getUserProfileKey(userId), JSON.stringify(merged));

  const profilePayload = {
    user_id: userId,
    firstName: merged.firstName && merged.firstName.trim() ? merged.firstName.trim() : null,
    lastName: merged.lastName && merged.lastName.trim() ? merged.lastName.trim() : null,
    dob: merged.dob && merged.dob.trim() ? merged.dob.trim() : null,
    email: merged.email && merged.email.trim() ? merged.email.trim() : null,
    profile_pic: getProfilePicForUser(userId) || auth?.currentUser?.photoURL || null,
    ...(merged.verified !== undefined ? { verified: Boolean(merged.verified) } : {})
  };

  apiFetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profilePayload)
  }).catch((error) => {
    console.warn("Backend profile save failed, using local storage only:", error);
  });

  return merged;
}

function splitDisplayName(displayName = "") {
  const fullName = String(displayName || "").trim();
  if (!fullName) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

async function ensureUserProfileRecordOnServer(user = auth?.currentUser) {
  if (!user || !user.uid) {
    return null;
  }

  const localProfile = getCurrentUserProfileData(user.uid);
  const fallbackName = splitDisplayName(user.displayName || "");
  const payload = {
    user_id: user.uid,
    firstName: localProfile.firstName || fallbackName.firstName || "",
    lastName: localProfile.lastName || fallbackName.lastName || "",
    dob: localProfile.dob || "",
    email: localProfile.email || user.email || "",
    profile_pic: getProfilePicForUser(user.uid) || user.photoURL || null,
    ...(localProfile.verified !== undefined ? { verified: Boolean(localProfile.verified) } : {})
  };

  try {
    const response = await apiFetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const result = await response.json();
      const savedProfile = result?.profile || payload;
      localStorage.setItem(getUserProfileKey(user.uid), JSON.stringify(savedProfile));
      return savedProfile;
    }
  } catch (error) {
    console.warn("Failed to ensure backend profile record:", error);
  }

  localStorage.setItem(getUserProfileKey(user.uid), JSON.stringify(payload));
  return payload;
}

async function loadUserProfileDataFromServer(userId = getCurrentUserId()) {
  if (!userId || userId === "guest") {
    return getCurrentUserProfileData(userId);
  }

  const existingProfile = getCurrentUserProfileData(userId);

  try {
    const response = await fetch(`/api/profile/${encodeURIComponent(userId)}`);
    if (!response.ok) {
      return existingProfile;
    }

    const data = await response.json();
    const profile = {
      firstName: data?.firstName || "",
      lastName: data?.lastName || "",
      dob: data?.dob || "",
      email: data?.email || "",
      verified: Boolean(data?.verified)
    };

    localStorage.setItem(getUserProfileKey(userId), JSON.stringify(profile));

    const storedProfilePic = getProfilePicForUser(userId);
    const recoveredProfilePic = data?.profile_pic || storedProfilePic || null;

    if (recoveredProfilePic) {
      localStorage.setItem(getProfilePicKeyForUser(userId), recoveredProfilePic);
    }

    return profile;
  } catch (error) {
    console.warn("Failed to load profile from backend:", error);
    return existingProfile;
  }
}

async function loadCurrentUserProfileDataFromServer(userId = getCurrentUserId()) {
  return loadUserProfileDataFromServer(userId);
}

const profileHydrationQueue = new Map();

async function hydrateUserProfileFromServer(userId = getCurrentUserId()) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId || safeUserId === "guest") {
    return null;
  }

  if (profileHydrationQueue.has(safeUserId)) {
    return profileHydrationQueue.get(safeUserId);
  }

  const existingProfile = getCurrentUserProfileData(safeUserId);
  const existingPic = getProfilePicForUser(safeUserId);
  const hydrationPromise = (async () => {
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(safeUserId)}`);
      if (!response.ok) {
        return existingProfile;
      }

      const data = await response.json();
      const profile = {
        firstName: data?.firstName || existingProfile.firstName || "",
        lastName: data?.lastName || existingProfile.lastName || "",
        dob: data?.dob || existingProfile.dob || "",
        email: data?.email || existingProfile.email || "",
        verified: Boolean(data?.verified ?? existingProfile.verified ?? false)
      };

      localStorage.setItem(getUserProfileKey(safeUserId), JSON.stringify(profile));

      const recoveredProfilePic = data?.profile_pic || existingPic || null;
      if (recoveredProfilePic) {
        localStorage.setItem(getProfilePicKeyForUser(safeUserId), recoveredProfilePic);
      }

      return profile;
    } catch (error) {
      console.warn("Failed to hydrate user profile metadata:", error);
      return existingProfile;
    } finally {
      profileHydrationQueue.delete(safeUserId);
    }
  })();

  profileHydrationQueue.set(safeUserId, hydrationPromise);
  return hydrationPromise;
}

function normalizeVerificationValue(value) {
  if (typeof value === "string") {
    return ["1", "true", "yes", "verified"].includes(value.trim().toLowerCase());
  }

  return Boolean(value);
}

function isUserVerified(userId = getCurrentUserId()) {
  const data = getCurrentUserProfileData(userId);
  const directValue = data?.verified ?? data?.is_verified ?? data?.verified_user ?? false;
  if (directValue !== undefined && directValue !== null) {
    return normalizeVerificationValue(directValue);
  }

  const fallbackState = data?.user_verified ?? false;
  return normalizeVerificationValue(fallbackState);
}

function matchesConversationSearch(searchTerm, displayName = "", threadEntries = []) {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const name = String(displayName || "").toLowerCase();
  if (name.includes(normalizedSearch)) {
    return true;
  }

  return (Array.isArray(threadEntries) ? threadEntries : []).some((entry) => {
    const messageText = String(entry?.text || "").toLowerCase();
    return messageText.includes(normalizedSearch);
  });
}

function getVerifiedBadgeMarkup() {
  return `
    <span class="verified-user-badge" title="Verified user" aria-label="Verified user">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-check preview-icon" aria-hidden="true" focusable="false">
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"></path>
        <path d="m16 9-5.5 5.5L8 12"></path>
      </svg>
    </span>
  `;
}

function truncateDisplayName(displayName, maxLength = 22) {
  const resolvedName = String(displayName || "User").trim() || "User";

  if (resolvedName.length <= maxLength) {
    return resolvedName;
  }

  return `${resolvedName.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function parseCompactCount(value) {
  const text = String(value ?? "0").trim();
  if (!text) return 0;

  const lower = text.toLowerCase();
  if (lower.endsWith("m")) {
    return Number.parseFloat(lower.slice(0, -1)) * 1000000;
  }

  if (lower.endsWith("k")) {
    return Number.parseFloat(lower.slice(0, -1)) * 1000;
  }

  return Number(text) || 0;
}

function formatCompactCount(value) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : parseCompactCount(value);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return "0";
  }

  if (numericValue >= 1000000) {
    const millions = numericValue / 1000000;
    return `${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, "")}m`;
  }

  if (numericValue >= 1000) {
    const thousands = numericValue / 1000;
    return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(numericValue);
}

function renderUserNameWithVerification(displayName, userId = getCurrentUserId()) {
  const resolvedName = String(displayName || "User").trim() || "User";
  const verified = isUserVerified(userId);

  if (!verified) {
    return escapeHtml(resolvedName);
  }

  return `${escapeHtml(resolvedName)}${getVerifiedBadgeMarkup()}`;
}

function getCurrentUserDisplayNameForApi() {
  const currentUserId = getCurrentUserId();
  const data = getCurrentUserProfileData(currentUserId) || {};
  const directName = String(data.name || data.displayName || "").trim();
  const firstName = (data.firstName || data.first_name || "").trim();
  const lastName = (data.lastName || data.last_name || "").trim();
  const customDisplayName = [directName || [firstName, lastName].filter(Boolean).join(" ")].filter(Boolean)[0];

  if (customDisplayName) {
    return customDisplayName;
  }

  if (auth?.currentUser?.displayName) {
    return auth.currentUser.displayName;
  }

  if (auth?.currentUser?.email) {
    return auth.currentUser.email.split("@")[0];
  }

  return "User";
}

function getDisplayNameForUser(userId = getCurrentUserId()) {
  const data = getCurrentUserProfileData(userId) || {};
  const directName = String(data.name || data.displayName || "").trim();
  const firstName = (data.firstName || data.first_name || "").trim();
  const lastName = (data.lastName || data.last_name || "").trim();
  const customDisplayName = [directName || [firstName, lastName].filter(Boolean).join(" ")].filter(Boolean)[0];

  if (customDisplayName) {
    return customDisplayName;
  }

  if (auth?.currentUser?.uid === userId && auth.currentUser.displayName) {
    return auth.currentUser.displayName;
  }

  if (auth?.currentUser?.uid === userId && auth.currentUser.email) {
    return auth.currentUser.email.split("@")[0];
  }

  return "User";
}

function updateProfileNameDisplay(userId = getCurrentUserId()) {
  const profileNameDisplay = document.getElementById("profileNameDisplay");
  if (!profileNameDisplay) return;

  const data = getCurrentUserProfileData(userId);
  const firstName = (data.firstName || "").trim();
  const lastName = (data.lastName || "").trim();
  const customDisplayName = [firstName, lastName].filter(Boolean).join(" ");

  let displayName = "User";

  if (customDisplayName) {
    displayName = customDisplayName;
  } else if (auth?.currentUser?.uid === userId && auth.currentUser.displayName) {
    displayName = auth.currentUser.displayName;
  } else if (auth?.currentUser?.uid === userId && auth.currentUser.email) {
    displayName = auth.currentUser.email.split("@")[0];
  }

  if (isUserVerified(userId)) {
    profileNameDisplay.innerHTML = `${escapeHtml(displayName)}${getVerifiedBadgeMarkup()}`;
    return;
  }

  profileNameDisplay.textContent = displayName;
}

function populateProfileSettingsForm(userId = getCurrentUserId()) {
  const firstNameInput = document.getElementById("firstNameInput");
  const lastNameInput = document.getElementById("lastNameInput");
  const dobInput = document.getElementById("dobInput");
  const emailInput = document.getElementById("emailInput");

  if (!firstNameInput && !lastNameInput && !dobInput && !emailInput) return;

  const data = getCurrentUserProfileData(userId);

  if (firstNameInput) firstNameInput.value = data.firstName || "";
  if (lastNameInput) lastNameInput.value = data.lastName || "";
  if (dobInput) dobInput.value = data.dob || "";
  if (emailInput) emailInput.value = data.email || "";
}

async function signUserOut() {
  try {
    if (auth) {
      await auth.signOut();
    }
  } catch (error) {
    console.warn("Firebase sign-out failed:", error);
  }

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn("Storage clear failed:", error);
  }

  redirectToLogin();
}

if (signOutBtn) {
  signOutBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    signUserOut();
  });
}

if (sideMenuProfileBtn) {
  sideMenuProfileBtn.addEventListener("click", () => {
    openUserProfileSheet(getCurrentUserId());
    closeNav();
  });
}

if (sideMenuUserNameBtn) {
  sideMenuUserNameBtn.addEventListener("click", () => {
    openUserProfileSheet(getCurrentUserId());
    closeNav();
  });
}

updateSideMenuProfileAvatar();
updateSideMenuUserName();

// notification.js
const bell = document.getElementById("notifyBell");
const bubble = document.getElementById("notifyCount");
const notification = document.getElementById("notification");
const notificationSheet = document.getElementById("notificationSheet");
const notificationList = document.getElementById("notificationList");
const clearNotificationsBtn = document.getElementById("clearNotificationsBtn");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNotificationTime(value = "") {
  if (!value) return "now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = diffMs / 1000;

  if (diffSeconds < 60) return "now";

  const diffMinutes = diffSeconds / 60;
  if (diffMinutes < 60) {
    const roundedMinutes = Math.max(1, Math.round(diffMinutes));
    return roundedMinutes === 1 ? "1 minute ago" : `${roundedMinutes} minutes ago`;
  }

  const diffHours = diffMinutes / 60;
  if (diffHours < 24) {
    const roundedHours = Math.max(1, Math.round(diffHours));
    return roundedHours === 1 ? "1 hour ago" : `${roundedHours} hours ago`;
  }

  const diffDays = diffHours / 24;
  if (diffDays < 2) return "yesterday";
  if (diffDays < 30) {
    const roundedDays = Math.max(2, Math.round(diffDays));
    return `${roundedDays} days ago`;
  }

  const diffMonths = diffDays / 30;
  if (diffMonths < 12) {
    const roundedMonths = Math.max(1, Math.round(diffMonths));
    return roundedMonths === 1 ? "1 month ago" : `${roundedMonths} months ago`;
  }

  return "last year";
}

function setNotificationBadge(count = 0) {
  if (!bubble) return;
  const safeCount = Number(count || 0);
  if (safeCount <= 0) {
    bubble.textContent = "0";
    bubble.style.display = "none";
    return;
  }
  bubble.textContent = safeCount > 99 ? "99+" : String(safeCount);
  bubble.style.display = "block";
}

function startNotificationPolling() {
  if (window.__notificationPollingStarted) return;
  window.__notificationPollingStarted = true;
  loadNotificationCount();
  window.setInterval(() => {
    loadNotificationCount();
  }, 15000);
}

async function loadNotificationCount() {
  const userId = getCurrentUserId();
  if (!userId || userId === "guest") {
    setNotificationBadge(0);
    return;
  }

  try {
    const response = await apiFetch(`/api/notifications/unread-count?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) return;
    const data = await response.json();
    setNotificationBadge(Number(data?.unread_count || 0));
  } catch (error) {
    console.warn("Failed to load notifications count:", error);
  }
}

function renderNotificationList(rows = []) {
  if (!notificationList) return;

  const visibleRows = Array.isArray(rows)
    ? rows.filter((item) => String(item?.type || "").toLowerCase() !== "welcome")
    : [];

  if (!visibleRows.length) {
    notificationList.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
    return;
  }

  notificationList.innerHTML = visibleRows.map((item) => {
    const actorId = item.actor_user_id || item.actor_id || null;
    const rawActorName = String(item.actor_name || "").trim();
    const genericActorNames = new Set(["User", "user", "Someone", "someone", "Anonymous", "anonymous"]);
    const resolvedActorName = (!rawActorName || genericActorNames.has(rawActorName)) && actorId
      ? getDisplayNameForUser(actorId)
      : (rawActorName || item.actor_user_id || "User");
    const actorName = escapeHtml(resolvedActorName || "User");
    const message = escapeHtml(item.message || "New notification");
    const avatar = item.actor_profile_pic || "";
    const time = formatNotificationTime(item.created_at);
    const unread = Number(item.is_read || 0) === 0 ? "unread" : "";
    const notificationType = String(item.type || "").toLowerCase();
    const iconName = notificationType.includes("message")
      ? "fa-regular fa-message"
      : notificationType.includes("comment")
        ? "fa-regular fa-comment"
        : notificationType.includes("welcome")
          ? "fa-solid fa-book-open"
          : notificationType.includes("follow") || notificationType.includes("follower")
            ? "fa-solid fa-user-plus"
            : "fa-solid fa-heart";
    const iconColor = notificationType.includes("message")
      ? "#3b82f6"
      : notificationType.includes("comment")
        ? "#f59e0b"
        : notificationType.includes("welcome")
          ? "#8b5cf6"
          : notificationType.includes("follow") || notificationType.includes("follower")
            ? "rgb(255, 212, 59)"
            : "#ef4444";
    const avatarMarkup = avatar
      ? `<img src="${escapeHtml(avatar)}" alt="${actorName}">`
      : `<span>${escapeHtml(actorName).charAt(0).toUpperCase() || "U"}</span>`;
    const notificationBadge = `
      <span class="notification-type-badge" style="background:${iconColor};">
        <i class="${iconName}"></i>
      </span>
    `;

    return `
      <div class="notification-item ${unread}" data-id="${escapeHtml(String(item.id || ""))}">
        <div class="notification-avatar">${avatarMarkup}${notificationBadge}</div>
        <div class="notification-copy">
          <div class="notification-topline">
            <strong>${actorName}</strong>
            <span class="notification-time">${time}</span>
          </div>
          <div class="notification-message">${message}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function loadNotifications() {
  const userId = getCurrentUserId();
  if (!userId || userId === "guest") {
    renderNotificationList([]);
    setNotificationBadge(0);
    return;
  }

  try {
    const response = await apiFetch(`/api/notifications?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      renderNotificationList([]);
      return;
    }

    const rows = await response.json();
    renderNotificationList(Array.isArray(rows) ? rows : []);

    const markReadResponse = await apiFetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });

    if (markReadResponse.ok) {
      setNotificationBadge(0);
    }
    await loadNotificationCount();
  } catch (error) {
    console.warn("Failed to load notifications:", error);
    renderNotificationList([]);
  }
}

if (bell && notificationSheet) {
  bell.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (notificationSheet && typeof openSheet === "function") {
      openSheet(notificationSheet);
    }
    await loadNotifications();
  });
}

if (notificationSheet) {
  notificationSheet.addEventListener("click", (event) => {
    if (event.target === notificationSheet) {
      closeSheet(notificationSheet);
    }
  });
}

const closeNotificationSheet = document.getElementById("closeNotificationSheet");
if (closeNotificationSheet && notificationSheet) {
  closeNotificationSheet.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSheet(notificationSheet);
  });
}

if (clearNotificationsBtn) {
  clearNotificationsBtn.addEventListener("click", async () => {
    const userId = getCurrentUserId();
    if (!userId || userId === "guest") return;

    try {
      const response = await apiFetch("/api/notifications/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || "Unable to clear notifications.");
      }

      renderNotificationList([]);
      await loadNotificationCount();
    } catch (error) {
      console.warn("Clear notifications error:", error);
    }
  });
}

if (bell || bubble || notification) {
  startNotificationPolling();
}

// search.js
const searchBtn = document.getElementById("searchBtn");
const searchSheet = document.getElementById("searchSheet");
const closeSearchSheet = document.getElementById("closeSearchSheet");
const headerBrandLink = document.getElementById("headerBrandLink");

function closeSheet(sheet) {
  if (!sheet) return;
  sheet.classList.remove("show");
  sheet.style.bottom = "-100%";
}

function getAllSheets() {
  return [yourDataSheet, friendsSheet, searchSheet, writePostSheet, uploadSheet, notificationSheet].filter(Boolean);
}

function openSheet(targetSheet) {
  if (!targetSheet) return;

  const isAlreadyOpen = targetSheet.classList.contains("show");
  if (isAlreadyOpen) {
    closeSheet(targetSheet);
    return;
  }

  getAllSheets().forEach((sheet) => {
    if (sheet !== targetSheet) {
      closeSheet(sheet);
    }
  });

  targetSheet.classList.add("show");
  targetSheet.style.bottom = "0";

  if (targetSheet === yourDataSheet && typeof renderYourDataStats === "function") {
    renderYourDataStats();
  }
}

function closeAllSheets(exceptSheet = null) {
  getAllSheets().forEach((sheet) => {
    if (sheet && sheet !== exceptSheet) {
      closeSheet(sheet);
    }
  });
}

if (headerBrandLink) {
  headerBrandLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = "message.html";
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", (event) => {
    if (searchSheet) {
      event.stopPropagation();
      if (footerIconMenu) {
        footerIconMenu.classList.remove("show");
      }
      openSheet(searchSheet);
      return;
    }

    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    window.location.href = "search.html";
  });
}

if (closeSearchSheet && searchSheet) {
  closeSearchSheet.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSheet(searchSheet);
  });
}

let searchStartY = 0, searchCurrentY = 0, searchIsDragging = false;

if (searchSheet) {
  searchSheet.addEventListener("touchstart", (e) => {
    if (e.target.closest(".close-btn") || e.target.closest("input") || e.target.closest("textarea") || e.target.closest("button")) {
      searchIsDragging = false;
      return;
    }
    searchStartY = e.touches[0].clientY;
    searchIsDragging = true;
  });

  searchSheet.addEventListener("touchmove", (e) => {
    if (!searchIsDragging) return;

    searchCurrentY = e.touches[0].clientY;
    const diff = searchCurrentY - searchStartY;

    if (diff > 0) searchSheet.style.bottom = `-${diff}px`;
  });

  searchSheet.addEventListener("touchend", () => {
    searchIsDragging = false;

    const diff = searchCurrentY - searchStartY;
    if (diff > 120) searchSheet.classList.remove("show");

    searchSheet.style.bottom = "0";
  });
}

// user sheet and settings sheet functionality//

const userSheetBtn = document.getElementById("userSheetBtn");
const settingsBtn = document.getElementById("settingsBtn");
const userSheetSettingsBtn = document.getElementById("userSheetSettingsBtn");
const settingsSheet = document.getElementById("settingsSheet");
const closeSettingsSheet = document.getElementById("closeSettingsSheet");
const openTermsSheetBtn = document.getElementById("openTermsSheetBtn");
const openPrivacySheetBtn = document.getElementById("openPrivacySheetBtn");
const userSheet = document.getElementById("userSheet");
const closeUserSheet = document.getElementById("closeUserSheet");
const profilePicInput = document.getElementById("profilePicInput");
const profilePicBtn = document.getElementById("profilePicBtn");
const profileSettingsForm = document.getElementById("profileSettingsForm");
const followUserBtn = document.getElementById("followUserBtn");
const userFollowCount = document.getElementById("userFollowCount");
const PROFILE_PIC_KEY = "bookme_profile_pic";
const LANGUAGE_KEY = "bookme_language";
const DEVICE_LANGUAGE_KEY = "bookme_device_language";

const LOCAL_CAPTION_TRANSLATIONS = {
  en: {
    "hello": "hello",
    "hi": "hi",
    "welcome": "welcome",
    "good morning": "good morning",
    "good night": "good night",
    "love": "love",
    "happy": "happy",
    "sad": "sad",
    "beautiful": "beautiful",
    "amazing": "amazing",
    "family": "family",
    "friends": "friends",
    "today": "today",
    "tomorrow": "tomorrow",
    "yesterday": "yesterday",
    "photo": "photo",
    "video": "video",
    "check this out": "check this out"
  },
  es: {
    "hello": "hola",
    "hi": "hola",
    "welcome": "bienvenido",
    "good morning": "buenos días",
    "good night": "buenas noches",
    "love": "amor",
    "happy": "feliz",
    "sad": "triste",
    "beautiful": "hermoso",
    "amazing": "asombroso",
    "family": "familia",
    "friends": "amigos",
    "today": "hoy",
    "tomorrow": "mañana",
    "yesterday": "ayer",
    "photo": "foto",
    "video": "video",
    "check this out": "mira esto"
  },
  fr: {
    "hello": "bonjour",
    "hi": "salut",
    "welcome": "bienvenue",
    "good morning": "bon matin",
    "good night": "bonne nuit",
    "love": "amour",
    "happy": "heureux",
    "sad": "triste",
    "beautiful": "beau",
    "amazing": "incroyable",
    "family": "famille",
    "friends": "amis",
    "today": "aujourd'hui",
    "tomorrow": "demain",
    "yesterday": "hier",
    "photo": "photo",
    "video": "vidéo",
    "check this out": "regarde ça"
  },
  hi: {
    "hello": "नमस्ते",
    "hi": "नमस्ते",
    "welcome": "स्वागत है",
    "good morning": "सुप्रभात",
    "good night": "शुभ रात्रि",
    "love": "प्यार",
    "happy": "खुशी",
    "sad": "उदास",
    "beautiful": "सुंदर",
    "amazing": "अद्भुत",
    "family": "परिवार",
    "friends": "दोस्त",
    "today": "आज",
    "tomorrow": "कल",
    "yesterday": "कल",
    "photo": "फ़ोटो",
    "video": "वीडियो",
    "check this out": "इसे देखिए"
  },
  pt: {
    "hello": "olá",
    "hi": "oi",
    "welcome": "bem-vindo",
    "good morning": "bom dia",
    "good night": "boa noite",
    "love": "amor",
    "happy": "feliz",
    "sad": "triste",
    "beautiful": "bonito",
    "amazing": "incrível",
    "family": "família",
    "friends": "amigos",
    "today": "hoje",
    "tomorrow": "amanhã",
    "yesterday": "ontem",
    "photo": "foto",
    "video": "vídeo",
    "check this out": "confira isso"
  },
  ar: {
    "hello": "مرحبًا",
    "hi": "أهلاً",
    "welcome": "مرحبًا",
    "good morning": "صباح الخير",
    "good night": "طاب مساؤك",
    "love": "حب",
    "happy": "سعيد",
    "sad": "حزين",
    "beautiful": "جميل",
    "amazing": "رائع",
    "family": "العائلة",
    "friends": "الأصدقاء",
    "today": "اليوم",
    "tomorrow": "غدًا",
    "yesterday": "أمس",
    "photo": "صورة",
    "video": "فيديو",
    "check this out": "شاهد هذا"
  },
  zh: {
    "hello": "你好",
    "hi": "你好",
    "welcome": "欢迎",
    "good morning": "早上好",
    "good night": "晚安",
    "love": "爱",
    "happy": "开心",
    "sad": "伤心",
    "beautiful": "美丽",
    "amazing": "惊人",
    "family": "家人",
    "friends": "朋友",
    "today": "今天",
    "tomorrow": "明天",
    "yesterday": "昨天",
    "photo": "照片",
    "video": "视频",
    "check this out": "看看这个"
  },
  bn: {
    "hello": "হ্যালো",
    "hi": "হাই",
    "welcome": "স্বাগতম",
    "good morning": "শুভ সকাল",
    "good night": "শুভ রাত্রি",
    "love": "ভালবাসা",
    "happy": "খুশি",
    "sad": "দুঃখিত",
    "beautiful": "সুন্দর",
    "amazing": "আশ্চর্যজনক",
    "family": "পরিবার",
    "friends": "বন্ধুরা",
    "today": "আজ",
    "tomorrow": "আগামীকাল",
    "yesterday": "গতকাল",
    "photo": "ফটো",
    "video": "ভিডিও",
    "check this out": "এটা দেখুন"
  },
  ur: {
    "hello": "ہیلو",
    "hi": "ہیلو",
    "welcome": "خوش آمدید",
    "good morning": "صبح بخیر",
    "good night": "شام بخیر",
    "love": "محبت",
    "happy": "خوش",
    "sad": "اداس",
    "beautiful": "خوبصورت",
    "amazing": "عجیب",
    "family": "خاندان",
    "friends": "دوست",
    "today": "آج",
    "tomorrow": "کل",
    "yesterday": "گذشتہ کل",
    "photo": "تصویر",
    "video": "ویڈیو",
    "check this out": "یہ دیکھیں"
  }
};

const TRANSLATIONS = {
  en: {
    settings: "Settings",
    report: "Report",
    friends: "Friends",
    chat: "Chat",
    signOut: "Sign out",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    firstName: "First name",
    lastName: "Last name",
    dob: "Date of birth",
    email: "Email",
    language: "Language",
    saveProfile: "Save profile",
    contactUs: "Contact us",
    firstNamePlaceholder: "First name",
    lastNamePlaceholder: "Last name",
    emailPlaceholder: "Email",
    search: "Search",
    comments: "Comments",
    noComments: "No comments yet.",
    commentInputPlaceholder: "Write a comment...",
    createPost: "Create a Post",
    postPlaceholder: "Write something...",
    post: "Post",
    searchPlaceholder: "Search people or posts",
    searchPlaceholderVariants: [
      "Search people or posts",
      "Search for trending topics...",
      "Search new releases...",
      "Search your favorite subjects...",
      "Search popular creators...",
      "Search upcoming events..."
    ],
    youMightLike: "We think you might like:",
    announcement: "App version to be released soon. Stay tuned!",
    chatHeader: "Chats",
    recentConversations: "Recent Conversations",
    typeMessage: "Type a message...",
    send: "Send",
    newMessage: "New message",
    chatHeader: "Chats",
    recentConversations: "Recent Conversations",
    typeMessage: "Type a message...",
    send: "Send",
    newMessage: "New message",
    chatHeader: "Chats",
    recentConversations: "Recent Conversations",
    typeMessage: "Type a message...",
    send: "Send",
    newMessage: "New message",
    readMore: "Read more",
    readLess: "Read less",
    translate: "Translate",
    video: "Video",
    noPosts: "No posts yet. Start following people to see their posts.",
    openReels: "Open reels",
    commentsHeader: "Comments",
    noCommentsYet: "No comments yet.",
    uploadDescription: "Add a caption and #hashtags to reach people's interests...",
    upload: "Upload",
    submit: "<i class='fa-solid fa-circle-arrow-right fa-lg' style='color: rgb(255, 255, 255);'></i>",
    saveSettings: "Save profile",
    contact: "Contact us",
    login: "Log In",
    signUp: "Sign Up",
    forgotPassword: "Forgot Password?",
    welcome: "Welcome to CHAT-MINI",
    createAccount: "Create Account",
    verifyEmail: "Verify your email",
    personalInfo: "Personal Info (optional)",
    profilePicOptional: "Profile Picture(optional)",
    selectSex: "Select Sex",
    male: "Male",
    female: "Female",
    other: "Other",
    next: "Next →",
    back: "← Back",
    skip: "Skip →",
    finish: "Finish",
    bySigningUp: "By signing up, you agree to our",
    and: "and",
    showPassword: "Show password",
    hidePassword: "Hide password",
    loginEmailPlaceholder: "Email",
    loginPasswordPlaceholder: "Password",
    fullNamePlaceholder: "Full Name",
    verifyCodePlaceholder: "Enter verification code",
    passwordPlaceholder: "Password",
    searchPeople: "Search people or posts"
  },
  hi: {
    settings: "सेटिंग्स",
    report: "रिपोर्ट",
    friends: "दोस्त",
    chat: "चैट",
    signOut: "साइन आउट",
    privacyPolicy: "गोपनीयता नीति",
    termsOfService: "सेवा की शर्तें",
    firstName: "पहला नाम",
    lastName: "अंतिम नाम",
    dob: "जन्म तिथि",
    email: "ईमेल",
    language: "भाषा",
    saveProfile: "प्रोफ़ाइल सेव करें",
    contactUs: "संपर्क करें",
    firstNamePlaceholder: "पहला नाम",
    lastNamePlaceholder: "अंतिम नाम",
    emailPlaceholder: "ईमेल",
    search: "खोज",
    comments: "टिप्पणियाँ",
    noComments: "अभी तक कोई टिप्पणी नहीं है।",
    commentInputPlaceholder: "एक टिप्पणी लिखें...",
    createPost: "पोस्ट बनाएं",
    postPlaceholder: "कुछ लिखें...",
    post: "पोस्ट",
    searchPlaceholder: "लोगों या पोस्ट को खोजें",
    searchPlaceholderVariants: [
      "लोगों या पोस्ट को खोजें",
      "ट्रेंडिंग विषय खोजें...",
      "नई रिलीज़ खोजें...",
      "अपने पसंदीदा विषय खोजें...",
      "लोकप्रिय निर्माता खोजें...",
      "आगामी कार्यक्रम खोजें..."
    ],
    youMightLike: "हमें लगता है आपको यह पसंद आ सकता है:",
    announcement: "हम मोबाइल डिवाइस के लिए ऐप संस्करण बनाने के लिए अभी काम कर रहे हैं। जैसे ही यह उपलब्ध होगा, हम आपको बता देंगे। बने रहें!",
    chatHeader: "चैट",
    recentConversations: "हाल की बातचीत",
    typeMessage: "संदेश लिखें...",
    send: "भेजें",
    newMessage: "नई बातचीत",
    readMore: "और पढ़ें",
    readLess: "कम पढ़ें",
    translate: "अनुवाद करें",
    video: "वीडियो",
    noPosts: "अभी तक कोई पोस्ट नहीं है। पहली पोस्ट शुरू करें।",
    openReels: "रील्स खोलें",
    commentsHeader: "टिप्पणियाँ",
    noCommentsYet: "अभी तक कोई टिप्पणी नहीं है।",
    uploadDescription: "एक विवरण जोड़ें या किसी को टैग करें...",
    upload: "अपलोड",
    submit: "सबमिट",
    saveSettings: "प्रोफ़ाइल सेव करें",
    contact: "संपर्क करें",
    login: "लॉग इन",
    signUp: "साइन अप",
    forgotPassword: "पासवर्ड भूल गए?",
    welcome: "CHAT-MINI में आपका स्वागत है",
    createAccount: "अकाउंट बनाएं",
    verifyEmail: "अपना ईमेल सत्यापित करें",
    personalInfo: "व्यक्तिगत जानकारी (वैकल्पिक)",
    profilePicOptional: "प्रोफ़ाइल फोटो (वैकल्पिक)",
    selectSex: "लिंग चुनें",
    male: "पुरुष",
    female: "महिला",
    other: "अन्य",
    next: "अगला →",
    back: "← वापस",
    skip: "छोड़ें →",
    finish: "समाप्त",
    bySigningUp: "साइन अप करके, आप हमारी",
    and: "और",
    showPassword: "पासवर्ड दिखाएं",
    hidePassword: "पासवर्ड छिपाएं",
    loginEmailPlaceholder: "ईमेल",
    loginPasswordPlaceholder: "पासवर्ड",
    fullNamePlaceholder: "पूरा नाम",
    verifyCodePlaceholder: "सत्यापन कोड दर्ज करें",
    passwordPlaceholder: "पासवर्ड",
    searchPeople: "लोगों या पोस्ट को खोजें"
  },
  es: {
    settings: "Configuración",
    report: "Reporte",
    friends: "Amigos",
    chat: "Chat",
    signOut: "Cerrar sesión",
    privacyPolicy: "Política de privacidad",
    termsOfService: "Términos del servicio",
    firstName: "Nombre",
    lastName: "Apellido",
    dob: "Fecha de nacimiento",
    email: "Correo",
    language: "Idioma",
    saveProfile: "Guardar perfil",
    contactUs: "Contáctanos",
    firstNamePlaceholder: "Nombre",
    lastNamePlaceholder: "Apellido",
    emailPlaceholder: "Correo",
    search: "Buscar",
    comments: "Comentarios",
    noComments: "Aún no hay comentarios.",
    commentInputPlaceholder: "Escribe un comentario...",
    createPost: "Crear una publicación",
    postPlaceholder: "Escribe algo...",
    post: "Publicar",
    searchPlaceholder: "Buscar personas o publicaciones",
    searchPlaceholderVariants: [
      "Buscar personas o publicaciones",
      "Buscar temas de tendencia...",
      "Buscar nuevos lanzamientos...",
      "Buscar tus temas favoritos...",
      "Buscar creadores populares...",
      "Buscar próximos eventos..."
    ],
    youMightLike: "Creemos que te podría gustar:",
    announcement: "Estamos trabajando arduamente para crear la versión de la aplicación para dispositivos móviles. Te avisaremos en cuanto esté disponible. ¡Mantente atento!",
    commentsHeader: "Comentarios",
    noCommentsYet: "Aún no hay comentarios.",
    uploadDescription: "Agrega una descripción o etiqueta a alguien...",
    upload: "Subir",
    submit: "Enviar",
    saveSettings: "Guardar perfil",
    contact: "Contáctanos",
    login: "Iniciar sesión",
    signUp: "Registrarse",
    forgotPassword: "¿Olvidaste tu contraseña?",
    welcome: "Bienvenido a CHAT-MINI",
    createAccount: "Crear cuenta",
    verifyEmail: "Verifica tu correo",
    personalInfo: "Información personal (opcional)",
    profilePicOptional: "Foto de perfil (opcional)",
    selectSex: "Selecciona sexo",
    male: "Masculino",
    female: "Femenino",
    other: "Otro",
    next: "Siguiente →",
    back: "← Atrás",
    skip: "Omitir →",
    finish: "Finalizar",
    bySigningUp: "Al registrarte, aceptas nuestras",
    and: "y",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    loginEmailPlaceholder: "Correo",
    loginPasswordPlaceholder: "Contraseña",
    fullNamePlaceholder: "Nombre completo",
    verifyCodePlaceholder: "Ingresa el código de verificación",
    passwordPlaceholder: "Contraseña",
    searchPeople: "Buscar personas o publicaciones"
  },
  fr: {
    settings: "Paramètres",
    report: "Attention",
    friends: "Amis",
    chat: "Chat",
    signOut: "Déconnecter",
    privacyPolicy: "Confidentialitées",
    termsOfService: "Conditions d'utilisation",
    firstName: "Prénom",
    lastName: "Nom",
    dob: "Date de naissance",
    email: "E-mail",
    language: "Langue",
    saveProfile: "Enregistrer le profil",
    contactUs: "Contactez-nous",
    firstNamePlaceholder: "Prénom",
    lastNamePlaceholder: "Nom",
    emailPlaceholder: "E-mail",
    search: "Recherche",
    comments: "Commentaires",
    noComments: "Aucun commentaire pour le moment.",
    commentInputPlaceholder: "Écrivez un commentaire...",
    createPost: "Créer une publication",
    postPlaceholder: "Écrivez quelque chose...",
    post: "Publier",
    searchPlaceholder: "Rechercher des personnes ou des publications",
    searchPlaceholderVariants: [
      "Rechercher des personnes ou des publications",
      "Rechercher les sujets tendance...",
      "Rechercher les nouveautés...",
      "Rechercher vos sujets préférés...",
      "Rechercher des créateurs populaires...",
      "Rechercher les événements à venir..."
    ],
    youMightLike: "Nous pensons que vous aimerez :",
    announcement: "Nous travaillons actuellement sur la création de la version mobile de l'application. Nous vous informerons dès qu'elle sera disponible. Restez à l'écoute !",
    commentsHeader: "Commentaires",
    noCommentsYet: "Aucun commentaire pour le moment.",
    uploadDescription: "Ajoutez une description ou taguez quelqu'un...",
    upload: "Sélectionner",
    submit: "Soumettre",
    saveSettings: "Enregistrer le profil",
    contact: "Contactez-nous",
    login: "Connexion",
    signUp: "S'inscrire",
    forgotPassword: " oublié son mot de passe ?",
    welcome: "Bienvenue sur CHAT-MINI",
    createAccount: "Créer un compte",
    verifyEmail: "Vérifiez votre e-mail",
    personalInfo: "Informations personnelles (optionnel)",
    profilePicOptional: "Photo de profil (optionnel)",
    selectSex: "Sélectionnez son sexe",
    male: "Homme",
    female: "Femme",
    other: "Autre",
    next: "Suivant →",
    back: "← Retour",
    skip: "Ignorer →",
    finish: "Terminer",
    bySigningUp: "En vous inscrivant, vous acceptez nos",
    and: "et",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    loginEmailPlaceholder: "E-mail",
    loginPasswordPlaceholder: "Mot de passe",
    fullNamePlaceholder: "Nom complet",
    verifyCodePlaceholder: "Entrez le code de vérification",
    passwordPlaceholder: "Mot de passe",
    searchPeople: "Rechercher des personnes ou des publications"
  },
  ru: {
    settings: "Настройки",
    report: "Жалоба",
    friends: "Друзья",
    chat: "Чат",
    signOut: "Выйти",
    privacyPolicy: "Политика конфиденциальности",
    termsOfService: "Условия использования",
    firstName: "Имя",
    lastName: "Фамилия",
    dob: "Дата рождения",
    email: "Электронная почта",
    language: "Язык",
    saveProfile: "Сохранить профиль",
    contactUs: "Связаться с нами",
    firstNamePlaceholder: "Имя",
    lastNamePlaceholder: "Фамилия",
    emailPlaceholder: "Электронная почта",
    search: "Поиск",
    comments: "Комментарии",
    noComments: "Пока комментариев нет.",
    commentInputPlaceholder: "Напишите комментарий...",
    createPost: "Создать пост",
    postPlaceholder: "Напишите что-нибудь...",
    post: "Опубликовать",
    searchPlaceholder: "Искать людей или посты",
    searchPlaceholderVariants: [
      "Искать людей или посты",
      "Искать трендовые темы...",
      "Искать новые релизы...",
      "Искать ваши любимые темы...",
      "Искать популярных авторов...",
      "Искать предстоящие события..."
    ],
    youMightLike: "Мы думаем, вам может понравиться:",
    announcement: "Мы усердно работаем над созданием мобильной версии приложения. Мы сообщим вам, как только она станет доступной. Оставайтесь с нами!",
    commentsHeader: "Комментарии",
    noCommentsYet: "Пока комментариев нет.",
    uploadDescription: "Добавьте описание или отметьте кого-нибудь...",
    upload: "Загрузить",
    submit: "Отправить",
    saveSettings: "Сохранить профиль",
    contact: "Связаться с нами",
    login: "Войти",
    signUp: "Регистрация",
    forgotPassword: "Забыли пароль?",
    welcome: "Добро пожаловать в CHAT-MINI",
    createAccount: "Создать аккаунт",
    verifyEmail: "Подтвердите ваш email",
    personalInfo: "Личная информация (по желанию)",
    profilePicOptional: "Фото профиля (по желанию)",
    selectSex: "Выберите пол",
    male: "Мужской",
    female: "Женский",
    other: "Другое",
    next: "Далее →",
    back: "← Назад",
    skip: "Пропустить →",
    finish: "Готово",
    bySigningUp: "Регистрируясь, вы соглашаетесь с нашими",
    and: "и",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    loginEmailPlaceholder: "Электронная почта",
    loginPasswordPlaceholder: "Пароль",
    fullNamePlaceholder: "Полное имя",
    verifyCodePlaceholder: "Введите код подтверждения",
    passwordPlaceholder: "Пароль",
    searchPeople: "Искать людей или посты"
  },
  pt: {
    settings: "Configurações",
    report: "Denunciar",
    friends: "Amigos",
    chat: "Chat",
    signOut: "Sair",
    privacyPolicy: "Política de privacidade",
    termsOfService: "Termos de serviço",
    firstName: "Nome",
    lastName: "Sobrenome",
    dob: "Data de nascimento",
    email: "E-mail",
    language: "Idioma",
    saveProfile: "Salvar perfil",
    contactUs: "Fale conosco",
    firstNamePlaceholder: "Nome",
    lastNamePlaceholder: "Sobrenome",
    emailPlaceholder: "E-mail",
    search: "Pesquisar",
    comments: "Comentários",
    noComments: "Ainda não há comentários.",
    commentInputPlaceholder: "Escreva um comentário...",
    createPost: "Criar publicação",
    postPlaceholder: "Escreva algo...",
    post: "Publicar",
    searchPlaceholder: "Pesquisar pessoas ou posts",
    searchPlaceholderVariants: [
      "Pesquisar pessoas ou posts",
      "Pesquisar tópicos em alta...",
      "Pesquisar novidades...",
      "Pesquisar seus assuntos favoritos...",
      "Pesquisar criadores populares...",
      "Pesquisar eventos futuros..."
    ],
    youMightLike: "Achamos que você pode gostar:",
    announcement: "Estamos trabalhando duro para criar a versão do aplicativo para dispositivos móveis. Avisaremos assim que estiver disponível. Fique ligado!",
    commentsHeader: "Comentários",
    noCommentsYet: "Ainda não há comentários.",
    uploadDescription: "Adicione uma descrição ou marque alguém...",
    upload: "Carregar",
    submit: "Enviar",
    saveSettings: "Salvar perfil",
    contact: "Fale conosco",
    login: "Entrar",
    signUp: "Cadastrar",
    forgotPassword: "Esqueceu sua senha?",
    welcome: "Bem-vindo ao CHAT-MINI",
    createAccount: "Criar conta",
    verifyEmail: "Verifique seu e-mail",
    personalInfo: "Informações pessoais (opcional)",
    profilePicOptional: "Foto de perfil (opcional)",
    selectSex: "Selecione o sexo",
    male: "Masculino",
    female: "Feminino",
    other: "Outro",
    next: "Próximo →",
    back: "← Voltar",
    skip: "Pular →",
    finish: "Concluir",
    bySigningUp: "Ao se inscrever, você concorda com nossos",
    and: "e",
    showPassword: "Mostrar senha",
    hidePassword: "Ocultar senha",
    loginEmailPlaceholder: "E-mail",
    loginPasswordPlaceholder: "Senha",
    fullNamePlaceholder: "Nome completo",
    verifyCodePlaceholder: "Digite o código de verificação",
    passwordPlaceholder: "Senha",
    searchPeople: "Pesquisar pessoas ou posts"
  },
  ar: {
    settings: "الإعدادات",
    report: "إبلاغ",
    friends: "الأصدقاء",
    chat: "الدردشة",
    signOut: "تسجيل الخروج",
    privacyPolicy: "سياسة الخصوصية",
    termsOfService: "شروط الخدمة",
    firstName: "الاسم الأول",
    lastName: "الاسم الأخير",
    dob: "تاريخ الميلاد",
    email: "البريد الإلكتروني",
    language: "اللغة",
    saveProfile: "حفظ الملف الشخصي",
    contactUs: "تواصل معنا",
    firstNamePlaceholder: "الاسم الأول",
    lastNamePlaceholder: "الاسم الأخير",
    emailPlaceholder: "البريد الإلكتروني",
    search: "بحث",
    comments: "التعليقات",
    noComments: "لا توجد تعليقات بعد.",
    commentInputPlaceholder: "اكتب تعليقًا...",
    createPost: "إنشاء منشور",
    postPlaceholder: "اكتب شيئًا...",
    post: "نشر",
    searchPlaceholder: "ابحث عن الأشخاص أو المنشورات",
    searchPlaceholderVariants: [
      "ابحث عن الأشخاص أو المنشورات",
      "ابحث عن المواضيع الرائجة...",
      "ابحث عن الإصدارات الجديدة...",
      "ابحث عن موضوعاتك المفضلة...",
      "ابحث عن المبدعين المشهورين...",
      "ابحث عن الأحداث القادمة..."
    ],
    youMightLike: "نعتقد أنك قد تعجبك:",
    announcement: "نحن نعمل بجد لإنشاء نسخة التطبيق للأجهزة المحمولة. سنخبرك بمجرد توفرها. ترقبوا!",
    commentsHeader: "التعليقات",
    noCommentsYet: "لا توجد تعليقات بعد.",
    uploadDescription: "أضف وصفًا أو اذكر شخصًا...",
    upload: "تحميل",
    submit: "إرسال",
    saveSettings: "حفظ الملف الشخصي",
    contact: "تواصل معنا",
    login: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    forgotPassword: "هل نسيت كلمة المرور؟",
    welcome: "مرحبًا بك في CHAT-MINI",
    createAccount: "إنشاء حساب",
    verifyEmail: "تحقق من بريدك الإلكتروني",
    personalInfo: "المعلومات الشخصية (اختياري)",
    profilePicOptional: "صورة الملف الشخصي (اختياري)",
    selectSex: "اختر الجنس",
    male: "ذكر",
    female: "أنثى",
    other: "أخرى",
    next: "التالي →",
    back: "← رجوع",
    skip: "تخطي →",
    finish: "إنهاء",
    bySigningUp: "بالتسجيل، فإنك توافق على",
    and: "و",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    loginEmailPlaceholder: "البريد الإلكتروني",
    loginPasswordPlaceholder: "كلمة المرور",
    fullNamePlaceholder: "الاسم الكامل",
    verifyCodePlaceholder: "أدخل رمز التحقق",
    passwordPlaceholder: "كلمة المرور",
    searchPeople: "ابحث عن الأشخاص أو المنشورات"
  },
  zh: {
    settings: "设置",
    report: "举报",
    friends: "朋友",
    chat: "聊天",
    signOut: "退出",
    privacyPolicy: "隐私政策",
    termsOfService: "服务条款",
    firstName: "名字",
    lastName: "姓氏",
    dob: "出生日期",
    email: "电子邮件",
    language: "语言",
    saveProfile: "保存资料",
    contactUs: "联系我们",
    firstNamePlaceholder: "名字",
    lastNamePlaceholder: "姓氏",
    emailPlaceholder: "电子邮件",
    search: "搜索",
    comments: "评论",
    noComments: "还没有评论。",
    commentInputPlaceholder: "写下评论...",
    createPost: "创建帖子",
    postPlaceholder: "写点什么...",
    post: "发布",
    searchPlaceholder: "搜索人物或帖子",
    searchPlaceholderVariants: [
      "搜索人物或帖子",
      "搜索热门话题...",
      "搜索新发布内容...",
      "搜索你喜欢的主题...",
      "搜索热门创作者...",
      "搜索即将举行的活动..."
    ],
    youMightLike: "我们觉得你可能会喜欢：",
    announcement: "我们目前正在努力开发移动设备应用版本。等应用上线后，我们会及时通知您。敬请关注！",
    commentsHeader: "评论",
    noCommentsYet: "还没有评论。",
    uploadDescription: "添加描述或标记某人...",
    upload: "上传",
    submit: "提交",
    saveSettings: "保存资料",
    contact: "联系我们",
    login: "登录",
    signUp: "注册",
    forgotPassword: "忘记密码？",
    welcome: "欢迎来到 CHAT-MINI",
    createAccount: "创建账户",
    verifyEmail: "验证你的电子邮件",
    personalInfo: "个人信息（可选）",
    profilePicOptional: "头像（可选）",
    selectSex: "选择性别",
    male: "男",
    female: "女",
    other: "其他",
    next: "下一步 →",
    back: "← 返回",
    skip: "跳过 →",
    finish: "完成",
    bySigningUp: "注册即表示你同意我们的",
    and: "和",
    showPassword: "显示密码",
    hidePassword: "隐藏密码",
    loginEmailPlaceholder: "电子邮件",
    loginPasswordPlaceholder: "密码",
    fullNamePlaceholder: "全名",
    verifyCodePlaceholder: "输入验证码",
    passwordPlaceholder: "密码",
    searchPeople: "搜索人物或帖子"
  },
  bn: {
    settings: "সেটিংস",
    report: "রিপোর্ট",
    friends: "বন্ধুরা",
    chat: "চ্যাট",
    signOut: "সাইন আউট",
    privacyPolicy: "গোপনীয়তা নীতি",
    termsOfService: "সেবার শর্তাবলী",
    firstName: "নামের প্রথম অংশ",
    lastName: "নামের শেষ অংশ",
    dob: "জন্মতারিখ",
    email: "ইমেল",
    language: "ভাষা",
    saveProfile: "প্রোফাইল সংরক্ষণ",
    contactUs: "যোগাযোগ করুন",
    firstNamePlaceholder: "নামের প্রথম অংশ",
    lastNamePlaceholder: "নামের শেষ অংশ",
    emailPlaceholder: "ইমেল",
    search: "খুঁজুন",
    comments: "মন্তব্য",
    noComments: "এখনো কোনো মন্তব্য নেই।",
    commentInputPlaceholder: "একটি মন্তব্য লিখুন...",
    createPost: "পোস্ট তৈরি করুন",
    postPlaceholder: "কিছু লিখুন...",
    post: "পোস্ট",
    searchPlaceholder: "ব্যক্তি বা পোস্ট খুঁজুন",
    searchPlaceholderVariants: [
      "ব্যক্তি বা পোস্ট খুঁজুন",
      "ট্রেন্ডিং বিষয় খুঁজুন...",
      "নতুন প্রকাশ খুঁজুন...",
      "আপনার পছন্দের বিষয় খুঁজুন...",
      "জনপ্রিয় সৃষ্টিকর্তা খুঁজুন...",
      "আসন্ন ইভেন্ট খুঁজুন..."
    ],
    youMightLike: "আমরা মনে করি আপনি এটি পছন্দ করতে পারেন:",
    announcement: "আমরা বর্তমানে মোবাইল ডিভাইসের জন্য অ্যাপের সংস্করণ তৈরি করতে কঠোর পরিশ্রম করছি। এটি পাওয়া মাত্রই আপনাকে জানিয়ে দেব। সাথে থাকুন!",
    commentsHeader: "মন্তব্য",
    noCommentsYet: "এখনো কোনো মন্তব্য নেই।",
    uploadDescription: "একটি বর্ণনা যোগ করুন বা কাউকে ট্যাগ করুন...",
    upload: "আপলোড",
    submit: "জমা দিন",
    saveSettings: "প্রোফাইল সংরক্ষণ",
    contact: "যোগাযোগ করুন",
    login: "লগইন",
    signUp: "সাইন আপ",
    forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
    welcome: "CHAT-MINI-এ স্বাগতম",
    createAccount: "অ্যাকাউন্ট তৈরি করুন",
    verifyEmail: "আপনার ইমেল যাচাই করুন",
    personalInfo: "ব্যক্তিগত তথ্য (ঐচ্ছিক)",
    profilePicOptional: "প্রোফাইল ছবি (ঐচ্ছিক)",
    selectSex: "লিঙ্গ নির্বাচন করুন",
    male: "পুরুষ",
    female: "নারী",
    other: "অন্যান্য",
    next: "পরবর্তী →",
    back: "← ফিরে যান",
    skip: "এড়িয়ে যান →",
    finish: "শেষ করুন",
    bySigningUp: "সাইন আপ করে আপনি আমাদের",
    and: "এবং",
    showPassword: "পাসওয়ার্ড দেখান",
    hidePassword: "পাসওয়ার্ড লুকান",
    loginEmailPlaceholder: "ইমেল",
    loginPasswordPlaceholder: "পাসওয়ার্ড",
    fullNamePlaceholder: "পূর্ণ নাম",
    verifyCodePlaceholder: "যাচাইকরণ কোড লিখুন",
    passwordPlaceholder: "পাসওয়ার্ড",
    searchPeople: "ব্যক্তি বা পোস্ট খুঁজুন"
  },
  ur: {
    settings: "سیٹنگز",
    report: "رپورٹ",
    friends: "دوست",
    chat: "چیٹ",
    signOut: "سائن آؤٹ",
    privacyPolicy: "رازداری کی پالیسی",
    termsOfService: "خدمات کی شرائط",
    firstName: "پہلا نام",
    lastName: "آخری نام",
    dob: "تاریخ پیدائش",
    email: "ای میل",
    language: "زبان",
    saveProfile: "پروفائل محفوظ کریں",
    contactUs: "ہم سے رابطہ کریں",
    firstNamePlaceholder: "پہلا نام",
    lastNamePlaceholder: "آخری نام",
    emailPlaceholder: "ای میل",
    search: "تلاش",
    comments: "تبصرے",
    noComments: "ابھی تک کوئی تبصرہ نہیں۔",
    commentInputPlaceholder: "ایک تبصرہ لکھیں...",
    createPost: "پوسٹ بنائیں",
    postPlaceholder: "کچھ لکھیں...",
    post: "پوسٹ",
    searchPlaceholder: "لوگوں یا پوسٹس تلاش کریں",
    searchPlaceholderVariants: [
      "لوگوں یا پوسٹس تلاش کریں",
      "ٹرینڈنگ موضوعات تلاش کریں...",
      "نئی ریلیزز تلاش کریں...",
      "اپنے پسندیدہ موضوعات تلاش کریں...",
      "مشہور تخلیقکار تلاش کریں...",
      "قریب کے ایونٹس تلاش کریں..."
    ],
    youMightLike: "ہم سمجھتے ہیں آپ کو یہ پسند آئے گا:",
    announcement: "ہم موبائل ڈیوائسز کے لیے ایپ ورژن بنانے کے لیے سخت محنت کر رہے ہیں۔ جیسے ہی یہ دستیاب ہو جائے گا، ہم آپ کو مطلع کر دیں گے۔ انتظار کریں!",
    commentsHeader: "تبصرے",
    noCommentsYet: "ابھی تک کوئی تبصرہ نہیں۔",
    uploadDescription: "توضیح شامل کریں یا کسی کو ٹیگ کریں...",
    upload: "اپ لوڈ",
    submit: "جمع کروائیں",
    saveSettings: "پروفائل محفوظ کریں",
    contact: "ہم سے رابطہ کریں",
    login: "لاگ ان",
    signUp: "سائن اپ",
    forgotPassword: "پاس ورڈ بھول گئے؟",
    welcome: "CHAT-MINI میں خوش آمدید",
    createAccount: "اکاؤنٹ بنائیں",
    verifyEmail: "اپنا ای میل تصدیق کریں",
    personalInfo: "ذاتی معلومات (اختیاری)",
    profilePicOptional: "پروفائل تصویر (اختیاری)",
    selectSex: "صنف منتخب کریں",
    male: "مرد",
    female: "عورت",
    other: "دیگر",
    next: "اگلا →",
    back: "← واپس",
    skip: "اسکپ →",
    finish: "ختم",
    bySigningUp: "سائن اپ کرکے، آپ ہماری",
    and: "اور",
    showPassword: "پاس ورڈ دکھائیں",
    hidePassword: "پاس ورڈ چھپائیں",
    loginEmailPlaceholder: "ای میل",
    loginPasswordPlaceholder: "پاس ورڈ",
    fullNamePlaceholder: "پورا نام",
    verifyCodePlaceholder: "تصدیقی کوڈ درج کریں",
    passwordPlaceholder: "پاس ورڈ",
    searchPeople: "لوگوں یا پوسٹس تلاش کریں"
  }
};

let pIndex = 0;
let charIndex = 0;

/* ============================================================
   TRANSLATION + LANGUAGE FUNCTIONS
   Controls all language switching and UI text updates.
   ============================================================ */

function getDeviceLanguage() {
  const saved = localStorage.getItem(DEVICE_LANGUAGE_KEY);
  if (saved && Object.prototype.hasOwnProperty.call(LOCAL_CAPTION_TRANSLATIONS, saved)) {
    return saved;
  }

  const navLang = (navigator.language || navigator.languages?.[0] || "en").toLowerCase();
  const base = navLang.split("-")[0];

  if (Object.prototype.hasOwnProperty.call(LOCAL_CAPTION_TRANSLATIONS, base)) {
    localStorage.setItem(DEVICE_LANGUAGE_KEY, base);
    return base;
  }

  localStorage.setItem(DEVICE_LANGUAGE_KEY, "en");
  return "en";
}

function getPreferredLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (Object.prototype.hasOwnProperty.call(TRANSLATIONS, saved)) {
    return saved;
  }
  return getDeviceLanguage();
}

function getTranslationTargetLanguage() {
  return getDeviceLanguage();
}

function ensureMlKitTranslationBridge() {
  if (typeof window === "undefined") return;

  if (!window.mlKitTranslate) {
    window.mlKitTranslate = {
      translate(text, targetLanguage) {
        const input = String(text || "").trim();
        if (!input) return text;

        const languageCode = String(targetLanguage || "en").toLowerCase();
        if (!languageCode) return text;

        const dictionary = LOCAL_CAPTION_TRANSLATIONS[languageCode] || {};
        if (!Object.keys(dictionary).length) return text;

        const normalized = input.toLowerCase();
        if (dictionary[normalized]) {
          return preserveWhitespaceAroundTranslatedText(input, dictionary[normalized]);
        }

        const words = normalized.split(/\s+/).filter(Boolean);
        const translatedWords = words.map((word) => dictionary[word] || word);
        const translated = translatedWords.join(" ");
        const translatedWithSpacing = preserveWhitespaceAroundTranslatedText(input, translated);

        return translated === normalized ? input : translatedWithSpacing;
      }
    };
  }
}

function getGoogleTargetLanguageCode(language) {
  const normalized = String(language || "en").trim().toLowerCase();
  const mapping = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    hi: "hi",
    ar: "ar",
    zh: "zh-cn",
    bn: "bn",
    ur: "ur",
    ja: "ja",
    ko: "ko",
    ru: "ru"
  };

  return mapping[normalized] || normalized;
}

function normalizeCaptionTextForTranslation(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function preserveWhitespaceAroundTranslatedText(originalText, translatedText) {
  const original = String(originalText || "");
  const translated = String(translatedText ?? original);
  const leadingWhitespace = original.match(/^\s*/)?.[0] || "";
  const trailingWhitespace = original.match(/\s*$/)?.[0] || "";
  const innerOriginal = original.trim();
  const innerTranslated = translated.trim();

  if (!innerOriginal) {
    return original;
  }

  return `${leadingWhitespace}${innerTranslated}${trailingWhitespace}`;
}

async function translateTextWithGoogleApi(text, targetLanguage) {
  if (!text || !text.trim()) return text;

  const normalizedText = normalizeCaptionTextForTranslation(text);
  const newlineSegments = normalizedText.split(/(\n+)/g);

  if (newlineSegments.length > 1) {
    const translatedSegments = await Promise.all(newlineSegments.map(async (segment) => {
      if (!segment) return "";
      if (/^\n+$/.test(segment)) return segment;
      return await translateTextWithGoogleApi(segment, targetLanguage);
    }));

    return translatedSegments.join("").trim();
  }

  const segments = normalizedText.split(/(#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);
  if (segments.length <= 1) {
    const sourceText = normalizedText.trim();
    const targetCode = getGoogleTargetLanguageCode(targetLanguage);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetCode)}&dt=t&q=${encodeURIComponent(sourceText)}`;

    try {
      const response = await fetch(url, { method: "GET", mode: "cors" });
      if (!response.ok) {
        throw new Error(`Google Translate request failed: ${response.status}`);
      }

      const payload = await response.json();
      if (Array.isArray(payload) && Array.isArray(payload[0])) {
        const translated = payload[0]
          .map((entry) => (Array.isArray(entry) && entry[0]) ? entry[0] : "")
          .join("");

        if (translated && translated.trim()) {
          return preserveWhitespaceAroundTranslatedText(normalizedText, translated);
        }
      }
    } catch (error) {
      console.warn("Google Translate fallback failed:", error);
    }

    return normalizeCaptionTextForTranslation(text);
  }

  const translatedSegments = await Promise.all(segments.map(async (segment) => {
    if (!segment) return "";
    if (/^#[A-Za-z0-9_]+$/.test(segment) || /^@[A-Za-z0-9_]+$/.test(segment)) return segment;
    return await translateTextWithGoogleApi(segment, targetLanguage);
  }));

  return translatedSegments.join("");
}

function isTextLikelyInDeviceLanguage(text, deviceLanguage = getDeviceLanguage()) {
  if (!text || !text.trim()) return false;

  const value = String(text).trim();
  const normalized = value.toLowerCase();
  const hasNonAscii = /[^\u0000-\u007F]/.test(value);

  if (!deviceLanguage) return false;

  const lang = String(deviceLanguage).toLowerCase();

  if (lang === "en") {
    if (hasNonAscii) return false;

    const plainEnglishText = /^[A-Za-z0-9\s.,!?"'()\-:;@#/]+$/.test(value);
    if (!plainEnglishText) return false;

    const obviousNonEnglishMarkers = [
      "hola", "gracias", "porfavor", "buenos", "buenas", "adios", "adiós", "bonjour", "merci", "salut",
      "hallo", "danke", "guten", "morgen", "heute", "ciao", "grazie", "buongiorno", "buonasera",
      "olá", "obrigado", "como", "onde", "quando", "porque", "quiero", "tengo", "donde", "dónde"
    ];

    if (obviousNonEnglishMarkers.some((marker) => normalized.includes(marker))) {
      return false;
    }

    return true;
  }

  if (lang === "es") {
    return /[áéíóúüñ¿¡]/.test(value) || /(hola|gracias|por|para|como|pero|donde|cuando|porque|tengo|quiero|buenos|dias|buenas)/.test(normalized);
  }

  if (lang === "fr") {
    return /[éèàùç]/.test(value) || /(bonjour|merci|pour|avec|comment|français|bonjour|aujourd|ici)/.test(normalized);
  }

  if (lang === "de") {
    return /[äöüß]/.test(value) || /(hallo|danke|mit|für|wann|wo|ich|bin|morgen|heute|guten)/.test(normalized);
  }

  if (lang === "it") {
    return /[àèéìòù]/.test(value) || /(ciao|grazie|per|come|dove|quando|sono|buongiorno|buonasera)/.test(normalized);
  }

  if (lang === "pt") {
    return /[ãõáéíóúç]/.test(value) || /(olá|obrigado|para|como|onde|quando|quero|bom|dias)/.test(normalized);
  }

  return false;
}

function translateTextPreservingHashtags(text, targetLanguage) {
  if (!text || !text.trim()) return text;

  const normalizedText = normalizeCaptionTextForTranslation(text);
  const newlineSegments = normalizedText.split(/(\n+)/g);

  if (newlineSegments.length > 1) {
    return newlineSegments.map((segment) => {
      if (!segment || /^\n+$/.test(segment)) {
        return segment;
      }
      return translateTextPreservingHashtags(segment, targetLanguage);
    }).join("");
  }

  const segments = normalizedText.split(/(#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);
  return segments.map((segment) => {
    if (!segment || /^#[A-Za-z0-9_]+$/.test(segment) || /^@[A-Za-z0-9_]+$/.test(segment)) {
      return segment;
    }
    return translateTextForCurrentLocale(segment, targetLanguage);
  }).join("");
}

function translateTextForCurrentLocale(text, targetLanguageOverride = null) {
  if (!text || !text.trim()) return text;

  const targetLang = targetLanguageOverride || getTranslationTargetLanguage();
  if (!targetLang) return text;

  const normalizedText = normalizeCaptionTextForTranslation(text);
  const newlineSegments = normalizedText.split(/(\n+)/g);
  if (newlineSegments.length > 1) {
    return newlineSegments.map((segment) => {
      if (!segment || /^\n+$/.test(segment)) {
        return segment;
      }
      return translateTextForCurrentLocale(segment, targetLang);
    }).join("");
  }

  const hashtagSegments = normalizedText.split(/(#[A-Za-z0-9_]+|@[A-Za-z0-9_]+)/g);
  if (hashtagSegments.length > 1) {
    return hashtagSegments.map((segment) => {
      if (!segment || /^#[A-Za-z0-9_]+$/.test(segment) || /^@[A-Za-z0-9_]+$/.test(segment)) {
        return segment;
      }
      return translateTextForCurrentLocale(segment, targetLang);
    }).join("");
  }

  ensureMlKitTranslationBridge();

  if (typeof window !== "undefined" && window.mlKitTranslate && typeof window.mlKitTranslate.translate === "function") {
    try {
      const translated = window.mlKitTranslate.translate(normalizedText, targetLang);
      if (translated && translated.trim() && translated.trim() !== normalizedText.trim()) {
        return preserveWhitespaceAroundTranslatedText(normalizedText, translated);
      }
    } catch (error) {
      console.warn("ML Kit translation fallback failed:", error);
    }
  }

  const dictionary = LOCAL_CAPTION_TRANSLATIONS[targetLang] || {};
  const normalized = normalizedText.trim().toLowerCase();
  if (dictionary[normalized]) {
    return preserveWhitespaceAroundTranslatedText(normalizedText, dictionary[normalized]);
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const translatedWords = words.map((word) => dictionary[word] || word);
  const translated = translatedWords.join(" ");
  const translatedWithSpacing = preserveWhitespaceAroundTranslatedText(normalizedText, translated);

  return translated === normalized ? normalizedText : translatedWithSpacing;
}

async function resolveTranslatedTextForButton(text, targetLanguage) {
  if (!text || !text.trim()) return text;

  const normalizedText = String(text).trim();
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;
  const shouldUseGoogleFirst = wordCount > 3 || /[A-Z]/.test(normalizedText) || /[#@]/.test(normalizedText) || /[.!?]/.test(normalizedText);

  if (shouldUseGoogleFirst) {
    const googleTranslation = await translateTextWithGoogleApi(normalizedText, targetLanguage);
    if (googleTranslation && googleTranslation.trim() && googleTranslation.trim() !== normalizedText.trim()) {
      return googleTranslation;
    }
  }

  const currentTranslation = translateTextPreservingHashtags(normalizedText, targetLanguage);
  if (currentTranslation && currentTranslation.trim() !== normalizedText.trim()) {
    return currentTranslation;
  }

  if (!shouldUseGoogleFirst) {
    const googleTranslation = await translateTextWithGoogleApi(normalizedText, targetLanguage);
    if (googleTranslation && googleTranslation.trim() && googleTranslation.trim() !== normalizedText.trim()) {
      return googleTranslation;
    }
  }

  return normalizedText;
}

function applyTranslations(lang = getPreferredLanguage()) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const languageSelect = document.getElementById("languageSelect");

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const value = dict[key] || TRANSLATIONS.en[key];
    if (!value) return;

    const explicitLabel = element.querySelector(".report-menu-label, .menu-label, .text-label");
    if (explicitLabel) {
      explicitLabel.textContent = value;
      return;
    }

    const textTarget = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "");
    if (textTarget) {
      textTarget.textContent = value;
      return;
    }

    const childTarget = Array.from(element.children).find((child) => child.textContent.trim() && !child.querySelector("i, svg, img"));
    if (childTarget) {
      childTarget.textContent = value;
      return;
    }

    element.textContent = value;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    const value = dict[key] || TRANSLATIONS.en[key];
    if (value) {
      element.placeholder = value;
    }
  });

  // Announcement Section

  const announcementText = document.getElementById("announcementText");
  if (announcementText) {
    const announcementTextValue = dict.announcement || TRANSLATIONS.en.announcement;
    announcementText.dataset.fullText = announcementTextValue;
    const preview = announcementText.querySelector(".announcement-text-preview");
    if (preview) {
      preview.textContent = announcementTextValue;
    }
    if (announcementText.textContent && !announcementText.textContent.trim()) {
      announcementText.textContent = announcementTextValue;
    }
  }

  const commentInput = document.getElementById("commentInput");
  if (commentInput && dict.commentInputPlaceholder) {
    commentInput.placeholder = dict.commentInputPlaceholder;
  }

  const searchInputs = document.querySelectorAll("#searchInput, .search-input");
  const searchVariants = Array.isArray(dict.searchPlaceholderVariants) && dict.searchPlaceholderVariants.length
    ? dict.searchPlaceholderVariants
    : [dict.searchPlaceholder || "Search people or posts"];

  searchInputs.forEach((searchInput) => {
    if (searchInput) {
      const activePlaceholder = searchVariants[pIndex % searchVariants.length] || searchVariants[0];
      searchInput.placeholder = activePlaceholder;
      searchInput.setAttribute("placeholder", activePlaceholder);
    }
  });

  const postTextArea = document.getElementById("postTextArea");
  if (postTextArea && dict.postPlaceholder) {
    postTextArea.placeholder = dict.postPlaceholder;
  }

  const uploadDescription = document.getElementById("uploadDescription");
  if (uploadDescription && dict.uploadDescription) {
    uploadDescription.placeholder = dict.uploadDescription;
  }

  const commentsHeader = document.querySelector(".comments-header h3");
  if (commentsHeader && dict.comments) {
    commentsHeader.textContent = dict.comments;
  }

  const commentEmpty = document.querySelector(".comment-empty");
  if (commentEmpty && dict.noComments) {
    commentEmpty.textContent = dict.noComments;
  }

  const likeHeading = document.querySelector("#searchSheet h3:last-of-type");
  if (likeHeading && dict.youMightLike) {
    likeHeading.textContent = dict.youMightLike;
  }

  const feedEmptyState = document.querySelector(".feed-empty-state");
  if (feedEmptyState && dict.noPosts) {
    feedEmptyState.textContent = dict.noPosts;
  }

  document.querySelectorAll(".feed-read-more-btn").forEach((button) => {
    const caption = button.closest(".feed-caption");
    const isExpanded = caption?.classList.contains("expanded");
    button.textContent = isExpanded ? (dict.readLess || TRANSLATIONS.en.readLess) : (dict.readMore || TRANSLATIONS.en.readMore);
  });

  document.querySelectorAll(".video-tag").forEach((element) => {
    element.textContent = dict.video || TRANSLATIONS.en.video;
  });

  document.querySelectorAll(".translate-btn").forEach((element) => {
    const label = element.querySelector(".translate-label");
    const text = dict.translate || TRANSLATIONS.en.translate;
    if (label) {
      label.textContent = text;
    } else {
      const current = element.textContent.replace(/\s*.*$/s, "");
      element.innerHTML = `${text}<i class="fa-solid fa-language" style="color: rgb(244, 228, 136);"></i>`;
    }
  });

  if (languageSelect) {
    languageSelect.value = lang;
  }

  localStorage.setItem(LANGUAGE_KEY, lang);
}

if (document.getElementById("languageSelect")) {
  document.getElementById("languageSelect").addEventListener("change", (event) => {
    const nextLang = event.target.value;
    applyTranslations(nextLang);

    if (feedPosts) {
      loadPosts();
    }
  });
}

applyTranslations();

/* ============================================================
   MEDIA + PROFILE IMAGE FUNCTIONS
   Handles media resizing, avatar preview, and profile upload logic.
   ============================================================ */

function resizeProfileImage(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith("image/")) {
      reject(new Error("Profile picture must be an image."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(maxSize, Math.max(img.width, img.height));
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not available in this browser."));
          return;
        }

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        const scale = Math.max(size / img.width, size / img.height);
        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const offsetX = (size - drawWidth) / 2;
        const offsetY = (size - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to process image."));
            return;
          }

          const resizedFile = new File([blob], file.name || "profile-picture.jpg", {
            type: "image/jpeg",
            lastModified: Date.now()
          });

          resolve(resizedFile);
        }, "image/jpeg", 0.96);
      };
      img.onerror = () => reject(new Error("The selected image could not be loaded."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function setProfilePicPreview(url, userId = getCurrentUserId()) {
  if (!profilePicBtn) return;

  if (!url) {
    const firebasePhotoUrl = auth?.currentUser?.photoURL;
    if (firebasePhotoUrl) {
      profilePicBtn.innerHTML = `<img src="${getCacheBustedImageUrl(firebasePhotoUrl)}" alt="Profile picture" />`;
      return;
    }

    profilePicBtn.innerHTML = getDefaultUserAvatarMarkup({ size: 42, color: "rgb(108, 108, 105)" });
    return;
  }

  profilePicBtn.innerHTML = `<img src="${getCacheBustedImageUrl(url)}" alt="Profile picture" />`;
}

if (profilePicBtn && profilePicInput) {
  const currentUserId = getCurrentUserId();
  const savedProfilePic = getProfilePicForUser(currentUserId);
  if (savedProfilePic) {
    setProfilePicPreview(savedProfilePic, currentUserId);
  } else if (auth?.currentUser) {
    setProfilePicPreview(null, auth.currentUser.uid);
  }

  profilePicBtn.addEventListener("click", () => {
    profilePicInput.click();
  });

  profilePicInput.addEventListener("change", async () => {
    const file = profilePicInput.files && profilePicInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image for your profile picture.");
      return;
    }

    let uploadFile = file;
    try {
      uploadFile = await resizeProfileImage(file, 512);
    } catch (error) {
      console.warn("Profile image resize skipped:", error.message);
    }

    const userId = getCurrentUserId();
    const formData = new FormData();
    formData.append("profilePic", uploadFile);
    formData.append("user_id", userId);

    try {
      const response = await apiFetch("/api/profile-picture", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Profile picture upload failed.");
      }

      if (data?.url) {
        const profileKey = getProfilePicKeyForUser(userId);
        localStorage.setItem(profileKey, data.url);
        setProfilePicPreview(data.url, userId);
      }
    } catch (error) {
      console.error("Profile picture upload error:", error);
      alert(error.message || "Profile picture upload failed.");
    }
  });
}

updateProfileNameDisplay();
populateProfileSettingsForm();

/* ============================================================
   MESSAGE PAGE FUNCTIONS
   Handles chat screens, conversations, and messaging UI.
   ============================================================ */

function matchesConversationSearch(searchTerm, displayName = "", threadEntries = []) {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  if (!normalizedSearch) {
    return true;
  }

  const name = String(displayName || "").toLowerCase();
  const threadMatch = (Array.isArray(threadEntries) ? threadEntries : []).some((entry) => {
    const messageText = String(entry?.text || "").toLowerCase();
    return messageText.includes(normalizedSearch);
  });

  return name.includes(normalizedSearch) || threadMatch;
}

async function initializeMessagePage() {
  const currentUserId = typeof getCurrentUserId === "function" ? getCurrentUserId() : "guest";
  const sessionKey = `bookme_message_page_${currentUserId}`;
  if (window.__bookmeMessagePageInitialized && window.__bookmeMessagePageUserId === currentUserId) return;

  const messagePlusBtn = document.getElementById("messagePlusBtn");
  const messageFooterMenu = document.getElementById("messageFooterMenu");
  const newMessageBtn = document.getElementById("newMessageBtn");
  const messageInput = document.getElementById("messageInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const messageList = document.getElementById("messageList");
  const conversationList = document.getElementById("conversationList");
  const chatRecipientName = document.getElementById("chatRecipientName");
  const chatBackBtn = document.getElementById("chatBackBtn");
  const conversationPanel = document.getElementById("conversationPanel");
  const chatWindow = document.getElementById("chatWindow");
  const messageSearchInput = document.getElementById("messageSearchInput");
  const messageSearchToggleBtn = document.getElementById("messageSearchToggleBtn");
  const deleteConversationBtn = document.getElementById("deleteConversationBtn");

  if (!conversationList || !chatWindow || !messageList) {
    return;
  }

  const currentUserDisplayName = typeof getDisplayNameForUser === "function" ? getDisplayNameForUser(currentUserId) : "User";

  const getKnownUsers = () => {
    const users = new Set();

    if (currentUserId && currentUserId !== "guest") {
      users.add(currentUserId);
    }

    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("bookme_user_profile_")) {
          const userId = key.replace("bookme_user_profile_", "");
          if (userId && userId !== "guest") {
            users.add(userId);
          }
        }

        if (key.startsWith("bookme_display_name_")) {
          const userId = key.replace("bookme_display_name_", "");
          if (userId && userId !== "guest") {
            users.add(userId);
          }
        }
      });
    } catch (error) {
      console.warn("Unable to inspect local storage for message users:", error);
    }

    ["guest", "michael"].forEach((user) => {
      if (user) {
        users.add(user);
      }
    });

    return [...users];
  };

  const existingMessages = (() => {
    try {
      const raw = localStorage.getItem(sessionKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  })();

  const conversations = {};
  if (currentUserId && currentUserId !== "guest") {
    Object.assign(conversations, existingMessages);
    if (!conversations[currentUserId]) {
      conversations[currentUserId] = [];
    }
  }

  delete conversations.guest;
  delete conversations.michael;

  async function hydrateConversationsFromServer() {
    if (!currentUserId || currentUserId === "guest") {
      return;
    }

    try {
      const response = await apiFetch(`/api/messages/conversations?user_id=${encodeURIComponent(currentUserId)}`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json().catch(() => []);
      const rows = Array.isArray(payload) ? payload : [];

      rows.forEach((thread) => {
        const otherUserId = String(thread?.user_id || "").trim();
        if (!otherUserId || otherUserId === currentUserId) return;

        const messages = Array.isArray(thread?.messages) ? thread.messages : [];
        conversations[otherUserId] = messages.map((entry) => ({
          id: entry?.id || null,
          text: entry?.text || entry?.message || "",
          mine: Boolean(entry?.mine) || String(entry?.sender_user_id || "") === String(currentUserId),
          created_at: entry?.created_at || null
        }));
      });

      saveConversations();
    } catch (error) {
      console.warn("Unable to hydrate conversations from server:", error);
    }
  }

  function startMessagePolling() {
    if (window.__bookmeMessagePollingStarted) return;
    window.__bookmeMessagePollingStarted = true;

    const refreshMessages = async () => {
      if (!currentUserId || currentUserId === "guest") return;

      await hydrateConversationsFromServer();
      renderConversations();
      if (activeConversation) {
        renderMessages();
      }
    };

    refreshMessages();
    window.setInterval(refreshMessages, 5000);
  }

  let activeConversation = null;
  let currentSearchTerm = "";
  let userSearchMatches = [];

  function saveConversations() {
    try {
      localStorage.setItem(sessionKey, JSON.stringify(conversations));
    } catch (error) {
      console.warn("Unable to save conversations:", error);
    }
  }

  function getConversationDisplayName(userKey) {
    if (!userKey) return "Conversation";
    if (userKey === currentUserId) return currentUserDisplayName || "Me";
    return (typeof getDisplayNameForUser === "function" ? getDisplayNameForUser(userKey) : "") || userKey;
  }

  function getConversationAvatarMarkup(userKey) {
    let avatarUrl = null;

    if (typeof getProfilePicForUser === "function") {
      avatarUrl = getProfilePicForUser(userKey)
        || getProfilePicForUser(currentUserId)
        || (window.firebase && firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.photoURL)
        || null;
    }

    if (avatarUrl) {
      return `<span class="conversation-avatar"><img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${getConversationDisplayName(userKey)} profile picture" /></span>`;
    }

    return `
      <span class="conversation-avatar">
        <span class="conversation-avatar-fallback"><i class="fa-solid fa-circle-user fa-lg" style="color: rgb(108, 108, 105);"></i></span>
      </span>
    `;
  }

  function getLastMessagePreview(userKey) {
    const thread = conversations[userKey] || [];
    if (!thread.length) {
      return "No messages yet";
    }

    const lastMessage = [...thread].reverse().find((entry) => typeof entry?.text === "string" && entry.text.trim());
    return lastMessage ? lastMessage.text.trim() : "No messages yet";
  }

  async function loadConversationHistoryFromServer(userKey) {
    const contactUserId = String(userKey || "").trim();
    if (!contactUserId || contactUserId === currentUserId) {
      return;
    }

    try {
      const response = await apiFetch(`/api/messages?user_id=${encodeURIComponent(currentUserId)}&other_user_id=${encodeURIComponent(contactUserId)}`);
      if (!response.ok) {
        return;
      }

      const rows = await response.json().catch(() => []);
      const mappedRows = (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row?.id || null,
        text: row?.message || row?.text || "",
        mine: String(row?.sender_user_id || row?.sender_id || "") === String(currentUserId),
        created_at: row?.created_at || null
      }));

      if (mappedRows.length) {
        conversations[contactUserId] = mappedRows;
        saveConversations();
      }
    } catch (error) {
      console.warn("Unable to load conversation history from server:", error);
    }
  }

  async function saveConversationMessageToServer(userKey, text) {
    const contactUserId = String(userKey || "").trim();
    const safeText = String(text || "").trim();
    if (!contactUserId || !safeText) return null;

    try {
      const response = await apiFetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_user_id: currentUserId,
          recipient_user_id: contactUserId,
          message: safeText
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.warn("Message save failed:", payload?.error || response.statusText);
        return null;
      }

      const payload = await response.json().catch(() => ({}));
      return payload?.message || null;
    } catch (error) {
      console.warn("Unable to save message to database:", error);
      return null;
    }
  }

  function syncView() {
    const hasActiveConversation = Boolean(activeConversation && conversations[activeConversation]);
    const header = document.querySelector(".header");
    const searchWrap = document.querySelector(".message-search-wrap");

    if (hasActiveConversation) {
      conversationPanel.style.display = "none";
      conversationPanel.style.width = "0";
      chatWindow.style.display = "flex";
      chatWindow.style.width = "100%";
      if (header) header.style.display = "none";
      if (searchWrap) searchWrap.style.display = "none";
      if (chatBackBtn) chatBackBtn.style.display = "block";
    } else {
      conversationPanel.style.display = "block";
      conversationPanel.style.width = "100%";
      chatWindow.style.display = "none";
      chatWindow.style.width = "0";
      if (header) header.style.display = "flex";
      if (searchWrap) searchWrap.style.display = "block";
      if (chatBackBtn) chatBackBtn.style.display = "none";
    }

    if (chatRecipientName) {
      if (!hasActiveConversation) {
        chatRecipientName.innerHTML = "Select a conversation";
        return;
      }

      const recipientName = getConversationDisplayName(activeConversation);
      const recipientPic = getProfilePicForUser(activeConversation);
      const avatarMarkup = recipientPic
        ? `<span class="chat-recipient-avatar"><img src="${getCacheBustedImageUrl(recipientPic)}" alt="${escapeHtml(recipientName)} profile picture" /></span>`
        : `<span class="chat-recipient-avatar chat-recipient-avatar-fallback"><i class="fa-solid fa-circle-user"></i></span>`;

      chatRecipientName.innerHTML = `${avatarMarkup}<span class="chat-recipient-name-text">${escapeHtml(recipientName)}</span>`;
    }
  }

  function matchesMessageSearch(userKey, searchTerm) {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
    if (!normalizedSearch) return true;

    const displayName = getConversationDisplayName(userKey).toLowerCase();
    const conversationText = (conversations[userKey] || []).some((entry) => {
      const messageText = String(entry?.text || "").toLowerCase();
      return messageText.includes(normalizedSearch);
    });

    return displayName.includes(normalizedSearch) || conversationText;
  }

  async function loadUserSearchMatches(searchTerm) {
    const query = String(searchTerm || "").trim();
    if (!query) {
      userSearchMatches = [];
      return [];
    }

    try {
      const response = await apiFetch(`/api/users?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        userSearchMatches = [];
        return [];
      }

      const rows = await response.json().catch(() => []);
      const matches = (Array.isArray(rows) ? rows : [])
        .map((user) => {
          const userId = String(user?.user_id || user?.id || "").trim();
          if (!userId || userId === currentUserId) return null;

          const displayName = String(
            user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "User"
          ).trim();

          return {
            userId,
            displayName: displayName || "User",
            profilePic: user?.profile_pic || null
          };
        })
        .filter(Boolean);

      const uniqueMatches = [];
      const seen = new Set();
      matches.forEach((user) => {
        if (!seen.has(user.userId)) {
          seen.add(user.userId);
          uniqueMatches.push(user);
        }
      });

      userSearchMatches = uniqueMatches;
      return uniqueMatches;
    } catch (error) {
      console.warn("Unable to search users for message input:", error);
      userSearchMatches = [];
      return [];
    }
  }

  async function renderConversations() {
    const existingUsers = Object.keys(conversations)
      .filter((user) => user !== currentUserId)
      .filter((user) => matchesConversationSearch(currentSearchTerm, getConversationDisplayName(user), conversations[user] || []));

    const searchUsers = currentSearchTerm.trim() ? await loadUserSearchMatches(currentSearchTerm) : [];
    const allUsers = [...new Set([...existingUsers, ...searchUsers.map((user) => user.userId)])];

    const filteredUsers = allUsers.sort((a, b) => {
      const labelA = getConversationDisplayName(a).toLowerCase();
      const labelB = getConversationDisplayName(b).toLowerCase();
      return labelA.localeCompare(labelB);
    });

    if (!filteredUsers.length) {
      conversationList.innerHTML = `
        <div style="padding: 14px 8px; color: #666; font-size: 14px; text-align: center;">
          No matches found.
        </div>
      `;
      return;
    }

    const finalUserList = filteredUsers.filter((user) => {
      const matchesOnlySearch = currentSearchTerm.trim() && !conversations[user]?.length;
      if (!matchesOnlySearch) {
        return true;
      }
      return searchUsers.some((entry) => entry.userId === user);
    });

    if (!finalUserList.length) {
      conversationList.innerHTML = `
        <div style="padding: 14px 8px; color: #666; font-size: 14px; text-align: center;">
          No matches found.
        </div>
      `;
      return;
    }

    conversationList.innerHTML = finalUserList.map((user) => {
      const label = getConversationDisplayName(user);
      const preview = conversations[user]?.length ? getLastMessagePreview(user) : "Start a conversation";
      const matchingUser = searchUsers.find((entry) => entry.userId === user);
      const avatarMarkup = matchingUser?.profilePic ? `<span class="conversation-avatar"><img src="${getCacheBustedImageUrl(matchingUser.profilePic)}" alt="${escapeHtml(label)} profile picture" /></span>` : getConversationAvatarMarkup(user);
      return `
        <div class="conversation-item ${user === activeConversation ? "active" : ""}">
          <button type="button" class="conversation-select-btn" data-user="${user}">
            <span class="conversation-meta">
              ${avatarMarkup}
              <span class="conversation-text-wrap">
                <span class="conversation-name">${escapeHtml(label)}</span>
                <span class="conversation-preview">${escapeHtml(preview)}</span>
              </span>
            </span>
          </button>
          <div class="conversation-menu-wrap">
            <button type="button" class="conversation-menu-btn" data-user="${user}" aria-label="More options for ${escapeHtml(label)}">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
            <div class="conversation-menu-popup" data-menu-user="${user}" style="display:none;">
              <button type="button" class="conversation-menu-delete" data-user="${user}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    conversationList.querySelectorAll(".conversation-select-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const selectedUser = button.dataset.user;
        if (!selectedUser) return;

        currentSearchTerm = "";
        if (messageSearchInput) {
          messageSearchInput.value = "";
        }

        if (!conversations[selectedUser]) {
          conversations[selectedUser] = [];
          saveConversations();
        }

        activeConversation = selectedUser;
        await loadConversationHistoryFromServer(selectedUser);
        renderConversations();
        renderMessages();
        syncView();
        messageInput?.focus();
      });
    });

    conversationList.querySelectorAll(".conversation-menu-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const user = button.dataset.user;
        if (!user) return;

        const menu = conversationList.querySelector(`.conversation-menu-popup[data-menu-user="${CSS.escape(user)}"]`);
        if (!menu) return;

        const isVisible = menu.style.display === "block";
        document.querySelectorAll(".conversation-menu-popup").forEach((popup) => {
          popup.style.display = "none";
        });
        menu.style.display = isVisible ? "none" : "block";
      });
    });

    conversationList.querySelectorAll(".conversation-menu-delete").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const user = button.dataset.user;
        if (!user) return;
        deleteConversation(user);
      });
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!target) return;
      if (!target.closest(".conversation-menu-btn") && !target.closest(".conversation-menu-popup")) {
        document.querySelectorAll(".conversation-menu-popup").forEach((popup) => {
          popup.style.display = "none";
        });
      }
    }, { once: true });
  }

  function renderMessages() {
    if (!activeConversation) {
      messageList.innerHTML = "";
      return;
    }

    const thread = conversations[activeConversation] || [];
    messageList.innerHTML = thread.map((entry) => `
      <div class="message-row ${entry.mine ? "mine" : ""}">
        <div class="message-bubble">
          <span class="message-text">${escapeHtml(entry.text || "")}</span>
        </div>
      </div>
    `).join("");

    if (chatRecipientName) {
      chatRecipientName.textContent = getConversationDisplayName(activeConversation);
    }
  }

  function appendMessage(text, isMine = false) {
    if (!activeConversation) return;
    const thread = conversations[activeConversation] || [];
    thread.push({ text, mine: isMine });
    conversations[activeConversation] = thread;
    saveConversations();
    renderMessages();
    renderConversations();
  }

  async function notifyRecipientOfMessage(recipientUserId, messageText) {
    const targetUserId = String(recipientUserId || "").trim();
    const sanitizedText = String(messageText || "").trim();
    if (!targetUserId || targetUserId === currentUserId || !sanitizedText) return;

    try {
      const payload = {
        recipient_user_id: targetUserId,
        actor_user_id: currentUserId,
        message: `${getConversationDisplayName(currentUserId)} sent you a message: ${sanitizedText}`
      };

      const response = await apiFetch("/api/notifications/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.warn("Message notification failed:", errorPayload?.error || response.statusText);
      }
    } catch (error) {
      console.warn("Unable to notify recipient of message:", error);
    }
  }

  async function openUserSearchConversation(searchTerm = currentSearchTerm) {
    const query = String(searchTerm || "").trim();
    if (!query) return;

    try {
      const response = await apiFetch(`/api/users?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;

      const users = await response.json().catch(() => []);
      const selectedUser = (Array.isArray(users) ? users : []).find((user) => {
        const userId = String(user?.user_id || user?.id || "").trim();
        if (!userId || userId === currentUserId) return false;
        const displayName = String(user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "").toLowerCase();
        return displayName.includes(query.toLowerCase());
      });

      if (!selectedUser) return;

      const selectedUserId = String(selectedUser.user_id || selectedUser.id || "").trim();
      if (!selectedUserId) return;

      if (!conversations[selectedUserId]) {
        conversations[selectedUserId] = [];
      }

      currentSearchTerm = "";
      if (messageSearchInput) {
        messageSearchInput.value = "";
      }

      activeConversation = selectedUserId;
      await loadConversationHistoryFromServer(selectedUserId);
      renderConversations();
      renderMessages();
      syncView();
      messageInput?.focus();
    } catch (error) {
      console.warn("Unable to start conversation from message search:", error);
    }
  }

  function deleteConversation(userKey) {
    if (!userKey || !conversations[userKey]) return;
    delete conversations[userKey];
    saveConversations();

    if (activeConversation === userKey) {
      activeConversation = null;
    }

    renderConversations();
    renderMessages();
    syncView();
  }

  if (messagePlusBtn && messageFooterMenu) {
    messagePlusBtn.addEventListener("click", () => {
      messageFooterMenu.classList.toggle("show");
    });
  }

  if (sendMessageBtn && messageInput) {
    sendMessageBtn.addEventListener("click", async () => {
      const text = messageInput.value.trim();
      if (!text || !activeConversation) return;

      const savedMessage = await saveConversationMessageToServer(activeConversation, text);
      const thread = conversations[activeConversation] || [];
      const savedText = savedMessage?.message && typeof savedMessage.message === "string" ? savedMessage.message : text;
      const savedTime = savedMessage?.created_at || new Date().toISOString();
      thread.push({
        text: savedText,
        mine: true,
        created_at: savedTime
      });
      conversations[activeConversation] = thread;
      saveConversations();
      renderMessages();
      renderConversations();
      await notifyRecipientOfMessage(activeConversation, text);
      messageInput.value = "";
      messageInput.focus();
    });
  }

  if (deleteConversationBtn) {
    deleteConversationBtn.addEventListener("click", () => {
      if (!activeConversation) return;
      deleteConversation(activeConversation);
    });
  }

  if (messageSearchToggleBtn && messageSearchInput) {
    messageSearchToggleBtn.addEventListener("click", () => {
      messageSearchInput.focus();
      messageSearchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  if (messageSearchInput) {
    messageSearchInput.addEventListener("input", async (event) => {
      currentSearchTerm = event.target.value || "";
      await renderConversations();
    });

    messageSearchInput.addEventListener("keydown", async (event) => {
      if (event.key === "Enter" && currentSearchTerm.trim()) {
        event.preventDefault();
        await openUserSearchConversation(currentSearchTerm);
      }
    });
  }

  chatBackBtn?.addEventListener("click", () => {
    activeConversation = null;
    renderMessages();
    syncView();
  });

  messageInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendMessageBtn.click();
    }
  });

  window.addEventListener("resize", syncView);

  await hydrateConversationsFromServer();
  renderConversations();
  renderMessages();
  syncView();
  startMessagePolling();
  window.__bookmeMessagePageInitialized = true;
  window.__bookmeMessagePageUserId = currentUserId;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMessagePage);
} else {
  initializeMessagePage();
}

function setSheetVisibility(sheet, shouldShow) {
  if (!sheet) return;
  sheet.classList.toggle("show", Boolean(shouldShow));
  sheet.style.pointerEvents = shouldShow ? "auto" : "none";
}

function setExclusiveSheetState({ userSheetOpen = false, settingsSheetOpen = false } = {}) {
  setSheetVisibility(userSheet, userSheetOpen);
  setSheetVisibility(settingsSheet, settingsSheetOpen);
}

if (userSheetBtn && userSheet) {
  userSheetBtn.addEventListener("click", () => {
    openUserProfileSheet(getCurrentUserId());
  });
}

if (followUserBtn) {
  followUserBtn.addEventListener("click", async () => {
    const targetUserId = getCurrentUserId() === "guest"
      ? ""
      : followUserBtn.dataset.userId || document.getElementById("profileNameDisplay")?.dataset?.userId || getCurrentUserId();
    const currentUserId = getCurrentUserId();

    if (!targetUserId || currentUserId === "guest") {
      alert("Please sign in to follow someone.");
      return;
    }

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(targetUserId)}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          name: getCurrentUserDisplayNameForApi()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update follow state.");
      }

      const followerCount = Number(data?.follower_count || 0);
      const isFollowing = Boolean(data?.isFollowing);
      await loadNotificationCount();

      followUserBtn.dataset.following = String(isFollowing);
      followUserBtn.setAttribute("aria-pressed", String(isFollowing));
      followUserBtn.innerHTML = `<i class="fa-solid ${isFollowing ? "fa-check" : "fa-plus"} fa-lg" style="color: rgb(0, 0, 0);"></i> ${isFollowing ? "Following" : "Follow"}`;

      if (userFollowCount) {
        userFollowCount.textContent = `${followerCount} follower${followerCount === 1 ? "" : "s"}`;
      }
    } catch (error) {
      console.error("Follow toggle error:", error);
      alert(error.message || "Unable to follow user.");
    }
  });
}

if (closeUserSheet && userSheet) {
  closeUserSheet.addEventListener("click", () => {
    setSheetVisibility(userSheet, false);
  });
}

document.querySelectorAll(".user-media-filter-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const selectedType = button.dataset.mediaType || "all";
    const targetUserId = getCurrentUserId();
    renderUserSheetMedia(targetUserId, selectedType);
  });
});

function openSettingsSheet() {
  if (!settingsSheet) return;

  if (footerIconMenu) {
    footerIconMenu.classList.remove("show");
  }

  if (typeof closeNav === "function") {
    closeNav();
  }

  if (userSheet) {
    userSheet.classList.remove("show");
    userSheet.style.pointerEvents = "none";
  }

  settingsSheet.classList.add("show");
  settingsSheet.style.pointerEvents = "auto";
  populateProfileSettingsForm();
}

if (settingsBtn && settingsSheet) {
  settingsBtn.addEventListener("click", openSettingsSheet);
}

if (userSheetSettingsBtn && settingsSheet) {
  const handleUserSheetSettingsClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSettingsSheet();
  };

  userSheetSettingsBtn.addEventListener("click", handleUserSheetSettingsClick);
  userSheetSettingsBtn.onclick = handleUserSheetSettingsClick;
}

if (closeSettingsSheet && settingsSheet) {
  closeSettingsSheet.addEventListener("click", () => {
    setSheetVisibility(settingsSheet, false);
  });
}

if (openTermsSheetBtn) {
  openTermsSheetBtn.addEventListener("click", () => {
    if (settingsSheet) {
      settingsSheet.classList.remove("show");
    }
    window.location.href = "login.html?legal=terms";
  });
}

if (openPrivacySheetBtn) {
  openPrivacySheetBtn.addEventListener("click", () => {
    if (settingsSheet) {
      settingsSheet.classList.remove("show");
    }
    window.location.href = "login.html?legal=privacy";
  });
}

if (profileSettingsForm) {
  profileSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const firstName = document.getElementById("firstNameInput")?.value || "";
    const lastName = document.getElementById("lastNameInput")?.value || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const nameError = validateDisplayNamePolicy(fullName || firstName || lastName || "", "Name");

    if (nameError) {
      alert(nameError);
      return;
    }

    const payload = {
      firstName,
      lastName,
      dob: document.getElementById("dobInput")?.value || "",
      email: document.getElementById("emailInput")?.value || ""
    };

    if (!saveCurrentUserProfileData(payload)) {
      return;
    }

    updateSideMenuUserName();
    updateProfileNameDisplay();
    if (document.getElementById("reelsContainer")) {
      loadReels();
    }
    settingsSheet?.classList.remove("show");
  });
}


let userStartY = 0, userCurrentY = 0, userIsDragging = false;

if (userSheet) {
  const handleUserDragStart = (clientY) => {
    userStartY = clientY;
    userIsDragging = true;
  };

  const handleUserDragMove = (clientY) => {
    if (!userIsDragging) return;

    userCurrentY = clientY;
    const diff = userCurrentY - userStartY;

    if (diff > 0) {
      userSheet.style.bottom = `-${diff}px`;
    }
  };

  const handleUserDragEnd = () => {
    userIsDragging = false;
    const diff = userCurrentY - userStartY;

    if (diff > 120) {
      userSheet.classList.remove("show");
    }

    userSheet.style.bottom = "0";
  };

  userSheet.addEventListener("touchstart", (e) => {
    handleUserDragStart(e.touches[0].clientY);
  }, { passive: true });

  userSheet.addEventListener("touchmove", (e) => {
    handleUserDragMove(e.touches[0].clientY);
  }, { passive: true });

  userSheet.addEventListener("touchend", handleUserDragEnd);

  userSheet.addEventListener("mousedown", (e) => {
    handleUserDragStart(e.clientY);
  });

  userSheet.addEventListener("mousemove", (e) => {
    handleUserDragMove(e.clientY);
  });

  userSheet.addEventListener("mouseup", handleUserDragEnd);
  userSheet.addEventListener("mouseleave", handleUserDragEnd);
}

const searchInputs = document.querySelectorAll("#searchInput, .search-input");

if (searchInputs.length) {
  function getSearchPlaceholderVariants() {
    const dict = TRANSLATIONS[getPreferredLanguage()] || TRANSLATIONS.en;
    if (Array.isArray(dict.searchPlaceholderVariants) && dict.searchPlaceholderVariants.length) {
      return dict.searchPlaceholderVariants;
    }

    return [
      dict.searchPlaceholder || "Search people or posts",
      "Search for trending topics...",
      "Search new releases...",
      "Search your favorite subjects...",
      "Search popular creators...",
      "Search upcoming events..."
    ];
  }

  function getSearchPlaceholderText() {
    const variants = getSearchPlaceholderVariants();
    return variants[pIndex % variants.length] || variants[0];
  }

  function typePlaceholder() {
    const current = getSearchPlaceholderText();
    const partial = current.substring(0, charIndex);

    searchInputs.forEach((input) => {
      if (input) {
        input.setAttribute("placeholder", partial);
      }
    });
    charIndex++;

    if (charIndex <= current.length) {
      setTimeout(typePlaceholder, 80);
    } else {
      setTimeout(() => {
        charIndex = 0;
        pIndex = (pIndex + 1) % getSearchPlaceholderVariants().length;
        const nextPlaceholder = getSearchPlaceholderText();
        searchInputs.forEach((input) => {
          if (input) {
            input.placeholder = nextPlaceholder;
            input.setAttribute("placeholder", nextPlaceholder);
          }
        });
        typePlaceholder();
      }, 1200);
    }
  }

  const syncSearchPlaceholder = () => {
    pIndex = 0;
    const variants = getSearchPlaceholderVariants();
    const activePlaceholder = variants[pIndex % variants.length] || variants[0];

    searchInputs.forEach((input) => {
      if (input) {
        input.placeholder = activePlaceholder;
        input.setAttribute("placeholder", activePlaceholder);
      }
    });
  };

  syncSearchPlaceholder();
  typePlaceholder();
}

//side menu js
  function openNav() {
        const sideMenu = document.getElementById("mysidemenu");
        if (!sideMenu) return;
        sideMenu.dataset.state = "open";
        sideMenu.style.width = "300px";
    }

    function closeNav() {
        const sideMenu = document.getElementById("mysidemenu");
        if (!sideMenu) return;
        sideMenu.dataset.state = "closed";
        sideMenu.style.width = "0";
    }

    function syncDesktopSideMenuState() {
        const sideMenu = document.getElementById("mysidemenu");
        if (!sideMenu) return;

        if (window.innerWidth >= 980) {
          if (sideMenu.dataset.state !== "closed") {
            sideMenu.style.width = "350px";
          } else {
            sideMenu.style.width = "0";
          }
          return;
        }

        if (sideMenu.dataset.state === "open") {
          sideMenu.style.width = "350px";
          return;
        }

        sideMenu.style.width = "0";
    }

    document.addEventListener("click", (event) => {
      const sideMenu = document.getElementById("mysidemenu");
      const openButton = document.querySelector(".openbtn");
      if (!sideMenu || !openButton) return;

      const clickedInsideMenu = sideMenu.contains(event.target);
      const clickedOpenButton = openButton.contains(event.target);
      const isMenuOpen = sideMenu.dataset.state === "open";

      if (isMenuOpen && !clickedInsideMenu && !clickedOpenButton) {
        closeNav();
      }
    });

    window.addEventListener("resize", syncDesktopSideMenuState);
    window.addEventListener("load", () => {
      const sideMenu = document.getElementById("mysidemenu");
      if (sideMenu) sideMenu.dataset.state = window.innerWidth >= 980 ? "open" : "closed";
      syncDesktopSideMenuState();
    });

// read more js
const readMoreBtn = document.getElementById("readMoreIpost");
const ipostText = document.getElementById("ipostText");

if (readMoreBtn && ipostText) {
  readMoreBtn.addEventListener("click", () => {
    ipostText.classList.toggle("expanded");

    if (ipostText.classList.contains("expanded")) {
      readMoreBtn.textContent = "Read less";
    } else {
      readMoreBtn.textContent = "Read more";
    }
  });
}

const announcementToggle = document.getElementById("announcementToggle");
const announcementText = document.getElementById("announcementText");
const announcementPreview = announcementText?.querySelector(".announcement-text-preview");

if (announcementToggle && announcementText && announcementPreview) {
  const translatedValue = announcementText.dataset.fullText || announcementPreview.textContent || "";
  const fullText = translatedValue.trim();
  announcementText.dataset.fullText = fullText;
  announcementPreview.textContent = fullText;
  announcementToggle.style.display = "none";
}

// ads js
let adInterval = 105;
let adDuration = 36;
let countdown = adInterval;

const countdownBox = document.getElementById("adCountdown");
const adPopup = document.getElementById("adPopup");

if (countdownBox && adPopup) {
  setInterval(() => {
    countdown--;
    countdownBox.innerText = `Ad is coming in ${countdown} seconds`;

    if (countdown <= 0) {
      showAd();
      countdown = adInterval;
    }
  }, 1000);
}

function showAd() {
  if (!adPopup) return;

  adPopup.classList.add("show");

  setTimeout(() => {
    adPopup.classList.remove("show");
  }, adDuration * 1000);
}

// language js
const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");

const translateBtn = document.querySelector(".translate-btn");

if (translateBtn && langDropdown) {
  const toggleLangDropdown = () => {
    langDropdown.style.display = langDropdown.style.display === "block" ? "none" : "block";
  };

  translateBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleLangDropdown();
  });

  if (langBtn) {
    langBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLangDropdown();
    });
  }

  langDropdown.querySelectorAll("div").forEach(item => {
    item.addEventListener("click", () => {
      const selectedLang = item.dataset.lang;
      console.log("Selected language:", selectedLang);
      langDropdown.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    const clickedInside = translateBtn.contains(e.target) || langBtn?.contains(e.target) || langDropdown.contains(e.target);
    if (!clickedInside) {
      langDropdown.style.display = "none";
    }
  });
}

const skipAdBtn = document.getElementById("skipAdBtn");
let skipTimer = 5;
let skipInterval;
let adTimeout = null;

if (skipAdBtn && adPopup) {
  function showAd() {
      adPopup.classList.add("show");

      skipTimer = 5;
      skipAdBtn.disabled = true;
      skipAdBtn.style.opacity = "0.6";
      skipAdBtn.textContent = `Skip in ${skipTimer}`;

      skipInterval = setInterval(() => {
          skipTimer--;
          skipAdBtn.textContent = `Skip in ${skipTimer}`;

          if (skipTimer <= 0) {
              clearInterval(skipInterval);
              skipAdBtn.disabled = false;
              skipAdBtn.style.opacity = "1";
              skipAdBtn.textContent = "Skip";
          }
      }, 1000);

      adTimeout = setTimeout(() => {
          adPopup.classList.remove("show");
      }, adDuration * 1000);
  }

  skipAdBtn.addEventListener("click", () => {
      if (!skipAdBtn.disabled) {
          adPopup.classList.remove("show");
          clearTimeout(adTimeout);
          clearInterval(skipInterval);
      }
  });
}

/* ===========================
   WRITE POST SLIDE-UP SHEET
=========================== */

const writePostBtn = document.getElementById("writePostBtn");
const writePostSheet = document.getElementById("writePostSheet");
const closeWritePostSheet = document.getElementById("closeWritePostSheet");
const postSubmitBtn = document.getElementById("postSubmitBtn");
const postTextArea = document.getElementById("postTextArea");

if (postTextArea) {
  initHashtagSuggestions(postTextArea);
}

if (writePostBtn && writePostSheet) {
  writePostBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (footerIconMenu) {
      footerIconMenu.classList.remove("show");
    }

    openSheet(writePostSheet);
  });
}

if (closeWritePostSheet && writePostSheet) {
  closeWritePostSheet.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSheet(writePostSheet);
  });
}

// Drag-to-close
let postStartY = 0, postCurrentY = 0, postIsDragging = false;

if (writePostSheet) {
  writePostSheet.addEventListener("touchstart", (e) => {
    postStartY = e.touches[0].clientY;
    postIsDragging = true;
  });

  writePostSheet.addEventListener("touchmove", (e) => {
    if (!postIsDragging) return;

    postCurrentY = e.touches[0].clientY;
    const diff = postCurrentY - postStartY;

    if (diff > 0) writePostSheet.style.bottom = `-${diff}px`;
  });

  writePostSheet.addEventListener("touchend", () => {
    postIsDragging = false;

    const diff = postCurrentY - postStartY;
    if (diff > 120) writePostSheet.classList.remove("show");

    writePostSheet.style.bottom = "0";
  });
}

// Post button
if (postSubmitBtn && postTextArea && writePostSheet) {
  postSubmitBtn.addEventListener("click", async () => {
    const text = postTextArea.value.trim();
    if (text === "") return;

    try {
      postSubmitBtn.disabled = true;
      postSubmitBtn.textContent = "Posting...";

      const response = await apiFetch("/api/text-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: getCurrentUserId(),
          content: text
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Unable to post.");
      }

      postTextArea.value = "";
      writePostSheet.classList.remove("show");
      showUploadToast("Post uploaded");
      await loadPosts();
    } catch (error) {
      console.error("Text post error:", error);
      alert(error.message || "Unable to post.");
    } finally {
      postSubmitBtn.disabled = false;
      postSubmitBtn.textContent = "Post";
    }
  });
}


//footer js//

const footerPlusBtn = document.querySelector(".plus-btn");
const footerIconMenu = document.getElementById("footerIconMenu");

if (footerPlusBtn && footerIconMenu) {
  footerPlusBtn.addEventListener("click", () => {
    footerIconMenu.classList.toggle("show");
  });
}

// Comments Sheet JS//

const commentsSheet = document.getElementById("commentsSheet");
const closeCommentsSheet = document.getElementById("closeCommentsSheet");
const commentsList = document.getElementById("commentsList");
const commentInput = document.getElementById("commentInput");
const submitCommentBtn = document.getElementById("submitCommentBtn");
let activeCommentsPostId = "";
let activeReplyCommentId = null;
let activeReplyCommentName = "";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getCommentLocalState(commentId) {
  if (!commentId) {
    return { liked: false, likeCount: 0, replyCount: 0 };
  }

  try {
    const raw = localStorage.getItem(`bookme_comment_state_${commentId}`);
    if (!raw) {
      return { liked: false, likeCount: 0, replyCount: 0 };
    }

    const parsed = JSON.parse(raw);
    return {
      liked: Boolean(parsed?.liked),
      likeCount: Number(parsed?.likeCount || 0),
      replyCount: Number(parsed?.replyCount || 0)
    };
  } catch (error) {
    return { liked: false, likeCount: 0, replyCount: 0 };
  }
}

function setCommentLocalState(commentId, nextState = {}) {
  if (!commentId) return;

  const current = getCommentLocalState(commentId);
  const merged = {
    liked: Boolean(nextState.liked ?? current.liked),
    likeCount: Number(nextState.likeCount ?? current.likeCount ?? 0),
    replyCount: Number(nextState.replyCount ?? current.replyCount ?? 0)
  };

  localStorage.setItem(`bookme_comment_state_${commentId}`, JSON.stringify(merged));
  return merged;
}

function syncCommentReplyInputState() {
  if (!commentInput) return;

  if (activeReplyCommentId && activeReplyCommentName) {
    commentInput.placeholder = `Replying to ${activeReplyCommentName}...`;
    commentInput.setAttribute("aria-label", `Reply to ${activeReplyCommentName}`);
  } else {
    commentInput.placeholder = "Write a comment...";
    commentInput.setAttribute("aria-label", "Write a comment");
  }
}

function getPostCommentAccessState(postId = "") {
  const cache = Array.isArray(window.__feedPostsCache) ? window.__feedPostsCache : [];
  const post = cache.find((item) => String(item?.id) === String(postId));
  const currentUserId = getCurrentUserId();
  const commentsDisabled = Number(post?.comments_disabled || 0) === 1;
  const followersCommentsOnly = Number(post?.followers_comments_only || 0) === 1;
  const isAuthor = Boolean(post?.user_id) && String(post.user_id) === String(currentUserId);
  const isFollowing = Boolean(post?.followed_creator || post?.followedCreator || false);
  const canComment = !commentsDisabled && !(followersCommentsOnly && currentUserId && currentUserId !== "guest" && !isAuthor && !isFollowing);

  return {
    commentsDisabled,
    followersCommentsOnly,
    canComment,
    isAuthor,
    isFollowing,
    post
  };
}

function syncCommentReplyUiState() {
  const items = document.querySelectorAll(".comment-item");
  items.forEach((item) => {
    const isActive = activeReplyCommentId && String(item.dataset.commentId) === String(activeReplyCommentId);
    item.classList.toggle("replying", Boolean(isActive));
  });
}

function clearCommentReplyMode() {
  activeReplyCommentId = null;
  activeReplyCommentName = "";
  syncCommentReplyInputState();
  syncCommentReplyUiState();
}

function setCommentReplyMode(commentId, authorName = "") {
  activeReplyCommentId = commentId || null;
  activeReplyCommentName = authorName || "this user";
  syncCommentReplyInputState();
  syncCommentReplyUiState();
  if (commentInput) {
    commentInput.focus();
  }
}

function getCommentReplyVisibility(commentId) {
  if (!commentId) return false;

  try {
    const raw = localStorage.getItem(`bookme_comment_replies_open_${commentId}`);
    return raw === "true";
  } catch (error) {
    return false;
  }
}

function setCommentReplyVisibility(commentId, shouldShow) {
  if (!commentId) return;

  try {
    localStorage.setItem(`bookme_comment_replies_open_${commentId}`, String(Boolean(shouldShow)));
  } catch (error) {
    // Ignore storage issues and keep the UI functional.
  }
}

function toggleCommentReplyVisibility(commentId) {
  if (!commentId) return;

  const nextState = !getCommentReplyVisibility(commentId);
  setCommentReplyVisibility(commentId, nextState);
  const replyContainer = document.querySelector(`.comment-thread[data-comment-id="${CSS.escape(String(commentId))}"] .comment-replies`);
  if (replyContainer) {
    replyContainer.classList.toggle("expanded", nextState);
    replyContainer.style.display = nextState ? "block" : "none";
  }
}

function renderCommentNode(comment, depth = 0) {
  const commentId = String(comment?.id ?? "");
  const authorId = comment?.user_id || "";
  const author = comment?.user_name || comment?.first_name || comment?.name || getDisplayNameForUser(authorId) || "User";
  const text = comment?.comment || "";
  const profilePic = comment?.profile_pic || getProfilePicForUser(authorId) || "";
  const formattedDate = comment?.created_at ? formatRelativeDateLabel(comment.created_at) : "Just now";
  const existingState = getCommentLocalState(commentId);
  const baseLikeCount = Number(comment?.like_count ?? comment?.likes_count ?? comment?.likeCount ?? existingState.likeCount ?? 0);
  const renderedReplyCount = Math.max(
    Number(comment?.reply_count ?? comment?.replies_count ?? comment?.replyCount ?? 0),
    Number(existingState.replyCount ?? 0)
  );
  const baseReplyCount = Number(
    Array.isArray(comment?.replies)
      ? Math.max(renderedReplyCount, comment.replies.length)
      : renderedReplyCount
  );
  const compactLikeCount = formatCompactCount(baseLikeCount);
  const compactReplyCount = formatCompactCount(baseReplyCount);
  const isLiked = Boolean(existingState.liked);
  const repliedToThisComment = activeReplyCommentId === String(commentId);
  const indentStyle = depth > 0 ? `style="margin-left: ${Math.min(depth * 18, 36)}px;"` : "";
  const repliesAreVisible = getCommentReplyVisibility(commentId);

  const avatarMarkup = profilePic
    ? `<img src="${escapeHtml(profilePic)}" alt="${escapeHtml(author)} profile" class="comment-avatar-img" />`
    : `<span class="comment-avatar-fallback"><i class="fa-solid fa-circle-user fa-lg" style="color: rgb(108, 108, 105);"></i></span>`;

  const childReplies = Array.isArray(comment?.replies) && comment.replies.length
    ? `<div class="comment-replies ${repliesAreVisible ? "expanded" : "collapsed"}" style="display: ${repliesAreVisible ? "block" : "none"};">${comment.replies.map((child) => renderCommentNode(child, depth + 1)).join("")}</div>`
    : "";

  return `
    <div class="comment-thread ${depth > 0 ? "is-reply" : ""}" data-comment-id="${escapeHtml(commentId)}" ${indentStyle}>
      <div class="comment-item ${repliedToThisComment ? "replying" : ""} ${depth > 0 ? "is-reply-item" : ""}" data-comment-id="${escapeHtml(commentId)}" data-author-name="${escapeHtml(author)}">
        <div class="comment-user-row">
          <div class="comment-avatar profile-avatar-trigger" data-user-id="${escapeHtml(authorId || getCurrentUserId())}">${avatarMarkup}</div>
          <div class="comment-user-meta profile-avatar-trigger" data-user-id="${escapeHtml(authorId || getCurrentUserId())}">
            <div class="comment-user-line">
              <strong>${renderUserNameWithVerification(author, authorId)}</strong>
              <span class="comment-date">${escapeHtml(formattedDate)}</span>
            </div>
          </div>
        </div>
        <div class="comment-text">${escapeHtml(text)}</div>
        <div class="comment-action-row">
          <button type="button" class="comment-action-btn comment-like-btn ${isLiked ? "liked" : ""}" data-comment-id="${escapeHtml(commentId)}" data-like-count="${Number(baseLikeCount)}" aria-label="Like comment">
            <i class="${isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"}"></i>
            <span>${compactLikeCount}</span>
          </button>
          <button type="button" class="comment-action-btn comment-reply-btn" data-comment-id="${escapeHtml(commentId)}" data-author-name="${escapeHtml(author)}" aria-label="Reply to comment">
            <i class="fa-regular fa-comment"></i>
            <span>${compactReplyCount}</span>
          </button>
        </div>
      </div>
      ${childReplies}
    </div>
  `;
}

async function loadCommentsForCurrentPost() {
  if (!commentsList) return;

  if (!activeCommentsPostId) {
    commentsList.innerHTML = '<div class="comment-empty">No comments yet.</div>';
    clearCommentReplyMode();
    return;
  }

  try {
    commentsList.innerHTML = '<div class="comment-empty">Loading comments...</div>';
    const response = await fetch(`/api/comments/${encodeURIComponent(activeCommentsPostId)}?_t=${Date.now()}`, {
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Unable to load comments.");
    }

    const comments = Array.isArray(data) ? data : (Array.isArray(data.comments) ? data.comments : []);
    if (!comments.length) {
      commentsList.innerHTML = '<div class="comment-empty">No comments yet.</div>';
      clearCommentReplyMode();
      return;
    }

    commentsList.innerHTML = comments.map((comment) => renderCommentNode(comment, 0)).join("");
    syncCommentReplyUiState();

    bindProfileAvatarButtons(commentsList);

    commentsList.querySelectorAll(".comment-item").forEach((commentItem) => {
      commentItem.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;

        const commentId = commentItem.dataset.commentId;
        if (!commentId) return;

        const hasReplies = commentItem.parentElement?.querySelector(".comment-replies") || commentItem.closest(".comment-thread")?.querySelector(".comment-replies");
        if (hasReplies) {
          toggleCommentReplyVisibility(commentId);
          return;
        }

        const authorName = commentItem.dataset.authorName || "this user";
        if (activeReplyCommentId === String(commentId)) {
          clearCommentReplyMode();
          return;
        }

        setCommentReplyMode(commentId, authorName);
      });
    });

    commentsList.querySelectorAll(".comment-like-btn").forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const commentId = button.dataset.commentId;
        if (!commentId) return;

        const currentState = getCommentLocalState(commentId);
        const currentLikeCount = Number(button.dataset.likeCount || currentState.likeCount || 0);
        const nextLiked = !currentState.liked;

        try {
          const response = await apiFetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              user_id: getCurrentUserId(),
              name: getCurrentUserDisplayNameForApi()
            })
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data?.error || "Unable to update comment like.");
          }

          const serverLikeCount = Number(data?.likeCount ?? data?.likes_count ?? currentLikeCount ?? 0);
          const serverLiked = Boolean(data?.liked ?? nextLiked);
          const storedState = {
            liked: serverLiked,
            likeCount: serverLikeCount,
            replyCount: Number(currentState.replyCount || 0)
          };

          setCommentLocalState(commentId, storedState);

          const icon = button.querySelector("i");
          const count = button.querySelector("span");
          if (icon) {
            icon.className = serverLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
          }
          if (count) {
            count.textContent = formatCompactCount(serverLikeCount);
          }
          button.dataset.likeCount = String(serverLikeCount);
          button.classList.toggle("liked", serverLiked);
        } catch (error) {
          console.error("Comment like error:", error);
          const fallbackLikeCount = Math.max(0, nextLiked ? currentLikeCount + 1 : currentLikeCount - 1);
          setCommentLocalState(commentId, {
            liked: nextLiked,
            likeCount: fallbackLikeCount,
            replyCount: currentState.replyCount || 0
          });

          const icon = button.querySelector("i");
          const count = button.querySelector("span");
          if (icon) {
            icon.className = nextLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
          }
          if (count) {
            count.textContent = formatCompactCount(fallbackLikeCount);
          }
          button.dataset.likeCount = String(fallbackLikeCount);
          button.classList.toggle("liked", nextLiked);
        }
      });
    });

    commentsList.querySelectorAll(".comment-reply-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const commentId = button.dataset.commentId;
        const authorName = button.dataset.authorName || "this user";
        if (!commentId) return;

        if (activeReplyCommentId === String(commentId)) {
          clearCommentReplyMode();
          return;
        }

        setCommentReplyMode(commentId, authorName);
      });
    });
  } catch (error) {
    console.error("Comment load error:", error);
    commentsList.innerHTML = '<div class="comment-empty">Unable to load comments.</div>';
  }
}
const feedPosts = document.getElementById("feedPosts");
const searchResults = document.getElementById("searchResults");
const userSheetPosts = document.getElementById("userSheetPosts");
const feedModeButtons = document.querySelectorAll(".feed-mode-btn");
let textMenuHandlerBound = false;
let activeUserSheetFilter = "all";
let activeFeedMode = "for_you";
let homeFeedInitialized = false;

function initializeHomeFeed() {
  if (homeFeedInitialized) {
    return;
  }

  homeFeedInitialized = true;
  bindFeedModeButtons();
  loadPosts();
}

function bindFeedModeButtons() {
  feedModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedMode = button.dataset.feedMode || "for_you";
      activeFeedMode = selectedMode;

      feedModeButtons.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", String(isActive));
      });

      loadPosts();
    });
  });
}

function isVideoMediaUrl(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.toLowerCase();
  return /(?:\.mp4|\.webm|\.ogg|\.mov)(?:[?#].*)?$/i.test(normalized) || /(?:video)/i.test(normalized);
}

function isImageMediaUrl(value) {
  if (!value || typeof value !== "string") return false;
  const normalized = value.toLowerCase();
  return /(?:\.jpg|\.jpeg|\.png|\.gif|\.webp|\.bmp|\.svg)(?:[?#].*)?$/i.test(normalized) || /(?:image)/i.test(normalized);
}

function getVideoMediaUrl(post) {
  const mediaList = normalizeMediaList(post);
  return mediaList.find((url) => isVideoMediaUrl(url)) || (isVideoMediaUrl(post?.media_url) ? post.media_url : "") || "";
}

function getMediaTypeForPost(post) {
  const mediaList = normalizeMediaList(post);
  const mediaUrl = mediaList[0] || post?.media_url || "";
  const isVideo = isVideoMediaUrl(mediaUrl);
  const isImage = isImageMediaUrl(mediaUrl);

  if (post?.media_type === "video" || isVideo) return "video";
  if (post?.media_type === "image" || isImage) return "image";
  return "text";
}

function renderUserSheetCard(post) {
  const mediaList = normalizeMediaList(post);
  const mediaUrl = mediaList[0] || post?.media_url || "";
  const mediaType = getMediaTypeForPost(post);
  const textContent = (post?.content || "").trim();
  const isFlagged = Boolean(post?.is_flagged || Number(post?.report_count || 0) >= 10);

  const warningBadge = isFlagged ? `
    <div class="flagged-post-badge" title="Content flagged for review">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
    </div>
  ` : "";

  if (mediaType === "text") {
    const isOwner = String(post?.user_id || "") === String(getCurrentUserId());
    const menuMarkup = "";

    return `
      <div class="user-sheet-post-card user-sheet-text-card" data-post-id="${post?.id || ""}">
        ${menuMarkup}
        ${warningBadge}
        <i class="fa-solid fa-pen-clip user-sheet-text-icon" style="color: rgb(0, 0, 0);"></i>
        <div class="user-sheet-text-content">${textContent || "Text post"}</div>
      </div>
    `;
  }

  if (!mediaUrl || (mediaType !== "video" && mediaType !== "image")) {
    return "";
  }

  const isVideo = mediaType === "video";
  const menuMarkup = "";

  return `
    <div class="user-sheet-post-card" data-post-id="${post?.id || ""}">
      ${menuMarkup}
      ${warningBadge}
      ${isVideo ? `
        <div class="user-sheet-media-wrap">
          <i class="fa-solid fa-circle-play fa-sm" style="color: rgb(255, 255, 255);"></i>
          <video src="${mediaUrl}" muted loop playsinline></video>
        </div>
      ` : `
        <div class="user-sheet-media-wrap">
          <i class="fa-regular fa-image fa-sm" style="color: rgb(255, 255, 255);"></i>
          <img src="${mediaUrl}" alt="User post" />
        </div>
      `}
    </div>
  `;
}

async function deletePostById(postId) {
  if (!postId) return;

  const currentUserId = getCurrentUserId();
  if (!currentUserId) {
    alert("Please sign in to delete a post.");
    return;
  }

  const confirmed = window.confirm("Delete this post?");
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user_id: currentUserId })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Failed to delete post");
    }

    const card = document.querySelector(`.user-sheet-post-card[data-post-id="${String(postId)}"]`);
    if (card) {
      card.remove();
    }

    const feedCard = document.querySelector(`.feed-post-card[data-post-id="${String(postId)}"]`);
    if (feedCard) {
      feedCard.remove();
    }

    if (userSheetPosts && activeUserId) {
      renderUserSheetMedia(activeUserId, activeUserSheetFilter);
    }

    if (feedPosts) {
      loadPosts();
    }
  } catch (error) {
    console.error("Delete post error:", error);
    alert(error.message || "Could not delete the post.");
  }
}

async function renderUserSheetMedia(userId, filterType = "all") {
  if (!userSheetPosts) return;

  activeUserSheetFilter = filterType;
  document.querySelectorAll(".user-media-filter-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mediaType === filterType);
  });

  try {
    const response = await apiFetch("/api/posts");
    if (!response.ok) {
      throw new Error("Unable to load user posts");
    }

    const posts = await response.json();
    const userPosts = Array.isArray(posts)
      ? posts.filter((post) => String(post.user_id) === String(userId) || Boolean(post.is_flagged))
      : [];

    const filteredPosts = userPosts.filter((post) => {
      const mediaType = getMediaTypeForPost(post);
      if (filterType === "all") return mediaType === "image" || mediaType === "video" || mediaType === "text";
      return mediaType === filterType;
    });

    if (!filteredPosts.length) {
      const label = filterType === "all" ? "posts" : `${filterType}s`;
      userSheetPosts.innerHTML = `<div class="user-sheet-empty">No ${label} yet.</div>`;
      return;
    }

    userSheetPosts.innerHTML = filteredPosts.map(renderUserSheetCard).join("");
    bindTextPostMenus();
    userSheetPosts.querySelectorAll(".video-shell").forEach((videoShell, index) => {
      videoShell.dataset.autoplay = String(index === 0);
      const video = videoShell.querySelector("video");
      if (video) {
        video.muted = true;
        video.autoplay = index === 0;
        video.loop = true;
        video.playsInline = true;
      }
    });
  } catch (error) {
    console.error("User sheet media load error:", error);
    userSheetPosts.innerHTML = '<div class="user-sheet-empty">No posts yet.</div>';
  }
}

function renderSearchCard(post) {
  const mediaUrl = getVideoMediaUrl(post);
  const isVideo = Boolean(mediaUrl && isVideoMediaUrl(mediaUrl));

  if (!isVideo) {
    return "";
  }

  const ownerUserId = post?.user_id || getCurrentUserId();
  const displayName = getDisplayNameForUser(ownerUserId) || "User";

  return `
    <div class="search-post-card">
      <video src="${mediaUrl}" muted loop playsinline preload="metadata"></video>
      <div class="search-caption-row">
        <button type="button" class="search-user-avatar profile-avatar-trigger" data-user-id="${ownerUserId}" aria-label="View profile">
          ${getCurrentUserAvatarMarkup(ownerUserId)}
        </button>
        <div class="search-caption">${renderUserNameWithVerification(displayName, ownerUserId)}</div>
      </div>
    </div>
  `;
}

function renderSearchSheet(posts) {
  if (!searchResults) return;

  const validPosts = Array.isArray(posts)
    ? posts.filter((post) => Boolean(getVideoMediaUrl(post)))
    : [];

  if (!validPosts.length) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = "";
}

function renderUserSearchCard(user = {}) {
  const userId = user?.user_id || user?.id || "";
  const displayName = (user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User").trim();
  const avatarUrl = user?.profile_pic || getProfilePicForUser(userId);

  return `
    <button type="button" class="search-post-card search-user-result profile-avatar-trigger" data-user-id="${escapeHtml(String(userId))}" aria-label="Open ${escapeHtml(displayName)} profile">
      <div class="search-caption-row">
        <i class="search-user-icon fa-solid fa-magnifying-glass fa-flip-horizontal fa-lg" style="color: rgb(253, 236, 42);"></i>
        <span class="search-user-avatar">${avatarUrl ? `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${escapeHtml(displayName)} profile" />` : getDefaultUserAvatarMarkup({ size: 24, color: "rgb(108, 108, 105)" })}</span>
        <span class="search-caption">
          <span class="search-user-name-text">${renderUserNameWithVerification(displayName, userId)}</span>
        </span>
      </div>
    </button>
  `;
}

async function persistRecentSearch(query = "", userMatch = null) {
  const userId = (auth && auth.currentUser && auth.currentUser.uid) || (getCurrentUserId && getCurrentUserId()) || "";
  const trimmed = String(query || "").trim();

  if (!trimmed || !userId || userId === "guest") {
    return;
  }

  const matchedUserId = userMatch && (userMatch.user_id || userMatch.id) ? String(userMatch.user_id || userMatch.id) : "";
  const matchedUserName = userMatch
    ? (userMatch.name || [userMatch.first_name, userMatch.last_name].filter(Boolean).join(" ") || userMatch.email || "User")
    : "";
  const matchedUserAvatar = userMatch
    ? (userMatch.profile_pic || getProfilePicForUser(matchedUserId) || "")
    : "";

  try {
    setRecentSearchesCleared(userId, false);
    await apiFetch("/api/recent-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        query: trimmed,
        searched_user_id: matchedUserId || null,
        searched_user_name: matchedUserName || null,
        searched_user_avatar: matchedUserAvatar || null
      })
    });
  } catch (error) {
    console.warn("Recent search save failed:", error);
  }
}

let activeRecentSearchId = null;

function getRecentSearchCacheKey(userId = "") {
  return `bookme_recent_searches_${String(userId || "guest")}`;
}

function setRecentSearchCache(userId = "", recentSearches = []) {
  try {
    localStorage.setItem(getRecentSearchCacheKey(userId), JSON.stringify(Array.isArray(recentSearches) ? recentSearches : []));
  } catch (error) {
    console.warn("Failed to save recent search cache:", error);
  }
}

function clearRecentSearchCache(userId = "") {
  try {
    localStorage.removeItem(getRecentSearchCacheKey(userId));
  } catch (error) {
    console.warn("Failed to clear recent search cache:", error);
  }
}

function getRecentSearchesClearedKey(userId = "") {
  return `bookme_recent_searches_cleared_${String(userId || "guest")}`;
}

function setRecentSearchesCleared(userId = "", cleared = true) {
  try {
    if (cleared) {
      localStorage.setItem(getRecentSearchesClearedKey(userId), "true");
      return;
    }
    localStorage.removeItem(getRecentSearchesClearedKey(userId));
  } catch (error) {
    console.warn("Failed to update recent search clear state:", error);
  }
}

async function clearAllRecentSearchSuggestions() {
  const userId = (auth && auth.currentUser && auth.currentUser.uid) || (getCurrentUserId && getCurrentUserId()) || "";
  if (!userId || userId === "guest") return;

  const container = document.getElementById("recentSearchSuggestions");
  if (container) {
    container.innerHTML = "";
  }
  setRecentSearchesCleared(userId, true);
  clearRecentSearchCache(userId);

  try {
    const response = await apiFetch(`/api/recent-searches?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Clear failed");
    }

    closeRecentSearchActionSheet();
    await loadRecentSearchSuggestions();
  } catch (error) {
    console.warn("Unable to clear recent searches:", error);
    if (container) {
      container.innerHTML = "";
    }
  }
}

function openRecentSearchActionSheet(searchId) {
  const sheet = document.getElementById("recentSearchActionSheet");
  if (!sheet) return;

  activeRecentSearchId = searchId;
  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
}

function closeRecentSearchActionSheet() {
  const sheet = document.getElementById("recentSearchActionSheet");
  if (!sheet) return;

  sheet.classList.remove("show");
  sheet.setAttribute("aria-hidden", "true");
  activeRecentSearchId = null;
}

async function deleteRecentSearchSuggestion(searchId) {
  if (!searchId) return;

  const userId = (auth && auth.currentUser && auth.currentUser.uid) || (getCurrentUserId && getCurrentUserId()) || "";
  if (!userId || userId === "guest") {
    closeRecentSearchActionSheet();
    return;
  }

  try {
    const response = await apiFetch(`/api/recent-searches/${encodeURIComponent(searchId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    closeRecentSearchActionSheet();
    await loadRecentSearchSuggestions();
  } catch (error) {
    console.warn("Unable to delete recent search suggestion:", error);
    closeRecentSearchActionSheet();
  }
}

async function loadRecentSearchSuggestions() {
  const container = document.getElementById("recentSearchSuggestions");
  if (!container) return;

  const searchInput = document.getElementById("searchInput");
  const hasActiveSearch = !!(searchInput && String(searchInput.value || "").trim());
  if (hasActiveSearch) {
    container.innerHTML = "";
    closeRecentSearchActionSheet();
    updateRecentSuggestionsVisibility(searchInput.value || "");
    return;
  }

  const userId = (auth && auth.currentUser && auth.currentUser.uid) || (getCurrentUserId && getCurrentUserId()) || "";
  if (!userId || userId === "guest") {
    container.innerHTML = "";
    clearRecentSearchCache(userId);
    return;
  }

  if (localStorage.getItem(getRecentSearchesClearedKey(userId)) === "true") {
    container.innerHTML = "";
    closeRecentSearchActionSheet();
    return;
  }

  const cachedRecentSearches = (() => {
    try {
      const raw = localStorage.getItem(getRecentSearchCacheKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  })();

  const dedupedCachedRecentSearches = dedupeRecentSearchList(cachedRecentSearches);

  if (dedupedCachedRecentSearches.length) {
    const cacheMarkup = dedupedCachedRecentSearches.slice(0, 10).map((search) => {
      const item = typeof search === "string" ? { query: search, searched_user_name: search } : search;
      const displayName = String(item.searched_user_name || item.name || item.query || "Recent search").trim();
      const avatarUrl = item.searched_user_avatar || item.profile_pic || item.avatar || getProfilePicForUser(item.searched_user_id || item.user_id || "");
      const queryValue = String(item.query || displayName).trim();
      const searchId = item.id || "";
      const matchedUserId = String(item.searched_user_id || item.user_id || "").trim();

      return `
        <div class="recent-search-pill" data-search="${escapeHtml(queryValue)}" data-search-id="${escapeHtml(String(searchId))}">
          <button type="button" class="recent-search-pill-inner" data-search="${escapeHtml(queryValue)}" data-user-id="${escapeHtml(matchedUserId)}" style="display: flex; align-items: center; gap: 10px; flex: 1; border: none; background: transparent; padding: 0; cursor: pointer; text-align: left;">
            <i class="fa-solid fa-magnifying-glass fa-flip-horizontal fa-lg" style="color: rgb(255, 212, 59);"></i>
            <span class="recent-search-avatar">
              ${avatarUrl ? `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${escapeHtml(displayName)}" />` : getDefaultUserAvatarMarkup({ size: 20, color: "rgb(108, 108, 105)" })}
            </span>
            <span class="recent-search-name">${escapeHtml(displayName)}</span>
          </button>
          <button type="button" class="recent-search-menu" data-search-id="${escapeHtml(String(searchId))}" aria-label="More options">
            <i class="fa-solid fa-ellipsis-vertical" style="color: rgb(4, 4, 4);"></i>
          </button>
        </div>
      `;
    }).join("");

    container.innerHTML = cacheMarkup;
    container.querySelectorAll(".recent-search-pill-inner").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.search || "";
        const targetUserId = String(button.dataset.userId || "").trim();
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.value = value;
        }

        if (targetUserId) {
          openUserProfileSheet(targetUserId);
          return;
        }

        runSearch(value);
      });
    });
    container.querySelectorAll(".recent-search-menu").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openRecentSearchActionSheet(button.dataset.searchId || "");
      });
    });
  }

  try {
    const response = await apiFetch(`/api/recent-searches?user_id=${encodeURIComponent(userId)}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error("Failed to load recent searches");
    }

    const data = await response.json();
    const recentSearches = Array.isArray(data?.recentSearches) ? data.recentSearches : [];
    const dedupedRecentSearches = dedupeRecentSearchList(recentSearches);
    setRecentSearchCache(userId, dedupedRecentSearches);

    if (!dedupedRecentSearches.length) {
      container.innerHTML = "";
      closeRecentSearchActionSheet();
      return;
    }

    const items = dedupedRecentSearches.slice(0, 10).map((search) => {
      const item = typeof search === "string" ? { query: search, searched_user_name: search } : search;
      const displayName = String(item.searched_user_name || item.name || item.query || "Recent search").trim();
      const avatarUrl = item.searched_user_avatar || item.profile_pic || item.avatar || getProfilePicForUser(item.searched_user_id || item.user_id || "");
      const queryValue = String(item.query || displayName).trim();
      const searchId = item.id || "";
      const matchedUserId = String(item.searched_user_id || item.user_id || "").trim();

      return `
        <div class="recent-search-pill" data-search="${escapeHtml(queryValue)}" data-search-id="${escapeHtml(String(searchId))}">
          <button type="button" class="recent-search-pill-inner" data-search="${escapeHtml(queryValue)}" data-user-id="${escapeHtml(matchedUserId)}" style="display: flex; align-items: center; gap: 10px; flex: 1; border: none; background: transparent; padding: 0; cursor: pointer; text-align: left;">
            <i class="fa-solid fa-magnifying-glass fa-flip-horizontal fa-lg" style="color: rgb(255, 212, 59);"></i>
            <span class="recent-search-avatar">
              ${avatarUrl ? `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${escapeHtml(displayName)}" />` : getDefaultUserAvatarMarkup({ size: 20, color: "rgb(108, 108, 105)" })}
            </span>
            <span class="recent-search-name">${escapeHtml(displayName)}</span>
          </button>
          <button type="button" class="recent-search-menu" data-search-id="${escapeHtml(String(searchId))}" aria-label="More options">
            <i class="fa-solid fa-ellipsis-vertical" style="color: rgb(4, 4, 4);"></i>
          </button>
        </div>
      `;
    }).join("");

    container.innerHTML = items;
    container.querySelectorAll(".recent-search-pill-inner").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.search || "";
        const targetUserId = String(button.dataset.userId || "").trim();
        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
          searchInput.value = value;
        }

        if (targetUserId) {
          openUserProfileSheet(targetUserId);
          return;
        }

        runSearch(value);
      });
    });

    container.querySelectorAll(".recent-search-menu").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openRecentSearchActionSheet(button.dataset.searchId || "");
      });
    });
  } catch (error) {
    console.warn("Recent search suggestions unavailable:", error);
    container.innerHTML = "";
    closeRecentSearchActionSheet();
  }
}

const recentSearchActionSheet = document.getElementById("recentSearchActionSheet");
if (recentSearchActionSheet) {
  recentSearchActionSheet.querySelectorAll(".recent-search-action-close").forEach((button) => {
    button.addEventListener("click", () => closeRecentSearchActionSheet());
  });

  const deleteRecentSearchBtn = document.getElementById("deleteRecentSearchBtn");
  if (deleteRecentSearchBtn) {
    deleteRecentSearchBtn.addEventListener("click", () => {
      deleteRecentSearchSuggestion(activeRecentSearchId);
    });
  }
}

const clearRecentSearchesBtn = document.getElementById("clearRecentSearchesBtn");
if (clearRecentSearchesBtn) {
  clearRecentSearchesBtn.addEventListener("click", () => {
    clearAllRecentSearchSuggestions();
  });
}

function dedupeRecentSearchList(entries = []) {
  const seen = new Set();

  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const item = typeof entry === "string" ? { query: entry } : (entry || {});
    const query = String(item.query || item.searched_user_name || item.name || "").trim().toLowerCase();
    const matchedUserId = String(item.searched_user_id || item.user_id || "").trim().toLowerCase();
    const userId = String(item.user_id || "").trim();
    const cacheKey = matchedUserId ? `user:${userId || ""}:${matchedUserId}` : `query:${userId || ""}:${query}`;

    if ((!query && !matchedUserId) || seen.has(cacheKey)) {
      return false;
    }

    seen.add(cacheKey);
    return true;
  });
}

function updateRecentSuggestionsVisibility(value = "") {
  const header = document.querySelector(".recent-search-header");
  const container = document.getElementById("recentSearchSuggestions");
  const hasText = String(value || "").trim().length > 0;

  if (header) {
    header.style.display = hasText ? "none" : "flex";
  }

  if (container) {
    container.style.display = hasText ? "none" : "block";
  }
}

async function runSearch(query = "") {
  if (!searchResults) return;

  const trimmedQuery = String(query || "").trim();
  updateRecentSuggestionsVisibility(trimmedQuery);

  if (!trimmedQuery) {
    try {
      const response = await apiFetch("/api/search?q=");
      if (!response.ok) {
        throw new Error("Failed to load default search results");
      }
      const data = await response.json();
      const posts = Array.isArray(data?.posts) ? data.posts : [];
      renderSearchSheet(posts);
      await loadRecentSearchSuggestions();
      return;
    } catch (error) {
      console.warn("Default search render failed:", error);
      renderSearchSheet([]);
      return;
    }
  }

  try {
    const response = await apiFetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
    if (!response.ok) {
      throw new Error("Search request failed");
    }

    const data = await response.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    const posts = Array.isArray(data?.posts) ? data.posts : [];

    const userCards = users.slice(0, 8).map(renderUserSearchCard).join("");
    const userListMarkup = userCards ? `<div class="search-user-results-list">${userCards}</div>` : "";
    const combinedCards = userListMarkup;

    if (!combinedCards) {
      searchResults.innerHTML = '<div class="search-empty-state">No people found.</div>';
      await persistRecentSearch(trimmedQuery, null);
      return;
    }

    searchResults.innerHTML = combinedCards;
    bindProfileAvatarButtons(searchResults);
    searchResults.querySelectorAll(".search-post-card video").forEach((video) => {
      video.muted = true;
      video.autoplay = false;
      video.loop = true;
      video.playsInline = true;
    });

    await persistRecentSearch(trimmedQuery, users[0] || null);
  } catch (error) {
    console.error("Search failed:", error);
    searchResults.innerHTML = '<div class="search-empty-state">Search is temporarily unavailable.</div>';
  }
}

let searchDebounceTimer = null;
if (searchResults) {
  const searchInput = document.getElementById("searchInput");
  const searchPageButton = document.getElementById("searchIconBtn");
  const searchBackButton = document.getElementById("searchBackBtn");

  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged(() => {
      loadRecentSearchSuggestions();
    });
  }

  const triggerSearchFromPage = (value = "") => {
    const trimmed = String(value || "").trim();
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
      runSearch(trimmed);
    }, 180);
  };

  if (searchBackButton) {
    searchBackButton.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "index.html";
      }
    });
  }

  updateRecentSuggestionsVisibility(searchInput ? searchInput.value || "" : "");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const typedValue = event.target.value || "";
      updateRecentSuggestionsVisibility(typedValue);
      triggerSearchFromPage(typedValue);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const typedValue = searchInput.value || "";
        updateRecentSuggestionsVisibility(typedValue);
        triggerSearchFromPage(typedValue);
      }
    });
  }

  if (searchPageButton && searchInput) {
    searchPageButton.addEventListener("click", () => {
      const typedValue = searchInput.value || "";
      updateRecentSuggestionsVisibility(typedValue);
      triggerSearchFromPage(typedValue);
    });
  }

  runSearch("");
}

// Load and render video reels
async function loadReels() {
  const reelsContainer = document.getElementById("reelsContainer");
  if (!reelsContainer) return;

  try {
    const currentUserId = getCurrentUserId();
    const mode = currentUserId && currentUserId !== "guest" ? (activeFeedMode || "for_you") : "for_you";
    const requestUrl = currentUserId && currentUserId !== "guest"
      ? `/api/posts?user_id=${encodeURIComponent(currentUserId)}&feed_mode=${encodeURIComponent(mode)}`
      : "/api/posts";

    const response = await apiFetch(requestUrl);
    if (!response.ok) {
      throw new Error("Failed to load reels");
    }

    const posts = await response.json();
    const reelPosts = Array.isArray(posts)
      ? posts.filter((post) => {
          const isVideo = getMediaTypeForPost(post) === "video";
          const isOwnPost = Boolean(post?.user_id) && String(post.user_id) === String(currentUserId);
          const hideOwnPostInFollowing = activeFeedMode === "following" && currentUserId && currentUserId !== "guest" && isOwnPost;
          return isVideo && !hideOwnPostInFollowing;
        })
      : [];

    if (!reelPosts.length) {
      reelsContainer.innerHTML = '<div class="reel-empty">No videos yet.</div>';
      return;
    }

    const targetVideoId = new URLSearchParams(window.location.search).get("videoId");

    reelsContainer.innerHTML = reelPosts.map((post) => {
      const mediaList = normalizeMediaList(post);
      const videoUrl = getVideoMediaUrl(post);
      const caption = (post?.content || "").trim() || "Video";
      const normalizedCaption = String(caption)
        .replace(/^\s+/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n");
      const displayCaption = normalizedCaption
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n/g, "<br>");
      const ownerUserId = post?.user_id || getCurrentUserId();
      const avatarMarkup = getCurrentUserAvatarMarkup(ownerUserId);
      const displayName = getDisplayNameForUser(ownerUserId);
      const truncatedDisplayName = truncateDisplayName(displayName, 30);
      const verifiedMarkup = renderUserNameWithVerification(truncatedDisplayName, ownerUserId);
      const truncatedCaption = normalizedCaption.length > 90 ? `${normalizedCaption.slice(0, 90).trim()}...` : normalizedCaption;
      const postId = post?.id || "";
      const likeCount = Number(post?.likes_count ?? post?.like_count ?? 0);
      const commentCount = Number(post?.comment_count ?? post?.comments_count ?? post?.commentCount ?? 0);
      const compactLikeCount = formatCompactCount(likeCount);
      const compactCommentCount = formatCompactCount(commentCount);
      const isLikedByCurrentUser = Boolean(post?.liked_by_current_user || post?.liked === true);
      const isSavedByCurrentUser = Boolean(post?.saved_by_current_user || post?.saved === true);
      const commentsDisabled = Number(post?.comments_disabled || 0) === 1;
      const followersCommentsOnly = Number(post?.followers_comments_only || 0) === 1;
      const currentUserId = getCurrentUserId();
      const isCurrentUserAuthor = Boolean(post?.user_id) && String(post.user_id) === String(currentUserId);
      const isCurrentUserFollowing = Boolean(post?.followed_creator || post?.followedCreator || false);
      const commentsLocked = commentsDisabled || (followersCommentsOnly && currentUserId && currentUserId !== "guest" && !isCurrentUserAuthor && !isCurrentUserFollowing);

      return `
        <div class="reel-item" data-post-id="${postId}">
          <div class="video-shell" data-post-id="${postId}">
            <video src="${videoUrl}" muted loop playsinline preload="auto"></video>
            <button class="video-toggle" type="button" aria-label="Play video"><i class="fa-solid fa-play fa-lg" style="color: rgb(255, 255, 255);"></i></button>
            <button class="video-mute-toggle" type="button" aria-label="Unmute video"><i class="fa-solid fa-volume-low fa-lg" style="color: rgb(255, 255, 255);"></i></button>
            <div class="video-progress"><span class="video-progress-bar"></span></div>
            <div class="video-meta">
              <span class="video-timer">0:00 / 0:00</span>
            </div>
          </div>

          <div class="reel-actions" aria-label="Reel actions">
            <button class="reel-action-btn like-btn ${isLikedByCurrentUser ? "liked" : ""}" type="button" aria-label="Like reel" data-post-id="${postId}" data-liked="${isLikedByCurrentUser ? "true" : "false"}">
              <i class="${isLikedByCurrentUser ? "fa-solid fa-heart" : "fa-regular fa-heart"}" style="color: ${isLikedByCurrentUser ? "rgb(255, 93, 93)" : "rgba(242, 224, 22, 0.9)"};"></i>
              <span class="reel-action-count">${compactLikeCount}</span>
            </button>
            <button class="reel-action-btn comment-btn ${commentsLocked ? "comments-disabled" : ""}" type="button" aria-label="${commentsLocked ? "Comments disabled" : "Open comments"}" data-post-id="${postId}" data-comments-disabled="${commentsLocked ? "true" : "false"}">
              <i class="${commentsLocked ? "fa-solid fa-comment-slash" : "fa-regular fa-comment"}" style="color: ${commentsLocked ? "rgba(255,255,255,0.7)" : "rgba(242, 224, 22, 0.9)"}"></i>
              <span class="reel-action-count">${compactCommentCount}</span>
            </button>
            
            <button class="reel-action-btn share-btn" type="button" aria-label="Share reel" data-post-id="${postId}">
              <i class="fa-solid fa-share-nodes" style="color: rgba(242, 224, 22, 0.9);"></i>
            </button>
          </div>

          <div class="reel-overlay">
            <div class="reel-user-row">
              <div class="reel-user-avatar">
                ${avatarMarkup}
              </div>
              <div class="reel-user-name">${verifiedMarkup}</div>
            </div>
            <div class="reel-caption" data-full-text="${normalizedCaption.replace(/"/g, '&quot;')}">
              <span class="reel-caption-text">${displayCaption.length > 90 ? truncatedCaption.replace(/\n/g, "<br>") : displayCaption}</span>
              ${normalizedCaption.length > 90 ? '<button class="reel-read-more-btn" type="button">Read more</button>' : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

    reelsContainer.querySelectorAll(".video-shell").forEach((videoShell, index) => {
      videoShell.dataset.autoplay = String(index === 0);
      const video = videoShell.querySelector("video");
      if (video) {
        video.muted = true;
        video.autoplay = index === 0;
        video.loop = true;
        video.playsInline = true;
      }
    });
    reelsContainer.querySelectorAll(".video-shell").forEach(bindVideoControls);

    if (targetVideoId) {
      const targetReel = reelsContainer.querySelector(`[data-post-id="${CSS.escape(String(targetVideoId))}"]`);
      if (targetReel) {
        setTimeout(() => {
          targetReel.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      }
    }

    reelsContainer.querySelectorAll(".reel-read-more-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const caption = button.closest(".reel-caption");
        const text = caption?.querySelector(".reel-caption-text");
        if (!caption || !text) return;

        const fullText = caption.dataset.fullText || "";
        const isExpanded = caption.classList.contains("expanded");

        if (isExpanded) {
          const truncated = `${fullText.replace(/^\s+/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").slice(0, 90).trim()}...`;
          text.innerHTML = truncated.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
          button.textContent = "Read more";
          caption.classList.remove("expanded");
        } else {
          const safeFullText = fullText.replace(/^\s+/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
          text.innerHTML = safeFullText.replace(/\n{2,}/g, "<br><br>").replace(/\n/g, "<br>");
          button.textContent = "Read less";
          caption.classList.add("expanded");
        }
      });
    });
  } catch (error) {
    console.error("Reels load error:", error);
    reelsContainer.innerHTML = '<div class="reel-empty">Unable to load videos.</div>';
  }
}

function getSavedPostIds() {
  try {
    const rawValue = localStorage.getItem("bookme-saved-posts");
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (error) {
    return [];
  }
}

function setSavedPostIds(postIds = []) {
  localStorage.setItem("bookme-saved-posts", JSON.stringify(Array.from(new Set(postIds.map(String)))));
}

async function toggleSavedPost(postId = "") {
  if (!postId) return;

  const currentUserId = getCurrentUserId();
  if (!currentUserId || currentUserId === "guest") {
    alert("Please sign in to save posts.");
    return;
  }

  const savedSet = new Set(getSavedPostIds());
  const isSaved = savedSet.has(String(postId));

  if (isSaved) {
    savedSet.delete(String(postId));
  } else {
    savedSet.add(String(postId));
  }

  setSavedPostIds([...savedSet]);
  document.querySelectorAll(`.save-btn[data-post-id="${CSS.escape(String(postId))}"]`).forEach((button) => {
    const icon = button.querySelector("i");
    const isNowSaved = savedSet.has(String(postId));
    button.dataset.saved = String(isNowSaved);
    button.classList.toggle("saved", isNowSaved);
    if (icon) {
      icon.className = isNowSaved ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark";
      icon.style.color = isNowSaved ? "rgb(242, 224, 22)" : "rgb(123, 117, 117)";
    }
  });

  if (Array.isArray(window.__feedPostsCache)) {
    const cachedPost = window.__feedPostsCache.find((entry) => String(entry.id) === String(postId));
    if (cachedPost) {
      cachedPost.saved_by_current_user = !isSaved;
      cachedPost.saved = !isSaved;
    }
  }

  showUploadToast(isSaved ? "Removed from saved" : "Saved");
}

async function sharePost(postId = "") {
  if (!postId) return;

  const url = `${window.location.origin}/reels.html?videoId=${encodeURIComponent(postId)}`;
  const currentUserId = getCurrentUserId();

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Bookme reel",
        text: "Watch this reel on Bookme",
        url
      });
    }

    if (currentUserId && currentUserId !== "guest") {
      try {
        await apiFetch(`/api/posts/${encodeURIComponent(postId)}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUserId,
            name: getCurrentUserDisplayNameForApi()
          })
        });
      } catch (error) {
        console.warn("Share notification request failed:", error);
      }
    }

    if (navigator.share) {
      showUploadToast("Shared");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      showUploadToast("Link copied");
      return;
    }

    window.prompt("Copy this link:", url);
  } catch (error) {
    console.warn("Share failed:", error);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        showUploadToast("Link copied");
      } catch (copyError) {
        console.warn("Clipboard copy failed:", copyError);
      }
    }
  }
}

saveLastNonReelsPage();

if (document.getElementById("reelsContainer")) {
  const reelsBackBtn = document.getElementById("reelsBackBtn");
  if (reelsBackBtn) {
    reelsBackBtn.addEventListener("click", () => {
      goBackToLastPage();
    });
  }

  const reelsContainer = document.getElementById("reelsContainer");
  reelsContainer.addEventListener("click", async (event) => {
    const shareButton = event.target.closest(".share-btn");
    if (shareButton) {
      event.stopPropagation();
      await sharePost(shareButton.dataset.postId || "");
      return;
    }

    const saveButton = event.target.closest(".save-btn");
    if (saveButton) {
      event.stopPropagation();
      await toggleSavedPost(saveButton.dataset.postId || "");
      return;
    }

    const commentButton = event.target.closest(".comment-btn");
    if (commentButton) {
      event.stopPropagation();
      openCommentsSheet(commentButton.dataset.postId || "");
      return;
    }

    const likeButton = event.target.closest(".like-btn");
    if (likeButton) {
      event.stopPropagation();

      const postId = likeButton.dataset.postId;
      const currentUserId = getCurrentUserId();
      if (!postId) return;
      if (!currentUserId || currentUserId === "guest") {
        alert("Please sign in to like posts.");
        return;
      }

      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUserId,
            name: getCurrentUserDisplayNameForApi()
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to update like.");
        }

        const icon = likeButton.querySelector("i");
        const countEl = likeButton.querySelector(".reel-action-count");
        const isLiked = Boolean(data?.liked);
        await loadNotificationCount();
        if (icon) {
          icon.className = isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
          icon.style.color = isLiked ? "rgb(255, 93, 93)" : "rgba(242, 224, 22, 0.9)";
        }
        if (countEl) {
          countEl.textContent = formatCompactCount(data?.likeCount ?? 0);
        }
        likeButton.dataset.liked = String(isLiked);
        likeButton.classList.toggle("liked", isLiked);

      } catch (error) {
        console.error("Reel like toggle error:", error);
        alert(error.message || "Unable to update like.");
      }
      return;
    }

    const clickedVideoShell = event.target.closest(".video-shell");
    if (clickedVideoShell && clickedVideoShell.dataset.postId) {
      const postId = clickedVideoShell.dataset.postId;
      const targetUrl = `reels.html?videoId=${encodeURIComponent(postId)}`;
      window.location.href = targetUrl;
    }
  });

  loadReels();
}

if (document.getElementById("searchResults")) {
  initializeHomeFeed();
}

window.addEventListener("focus", () => {
  if (document.visibilityState === "visible" && feedPosts) {
    loadPosts();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && feedPosts) {
    loadPosts();
  }
});

/* ===========================
   UPLOAD MEDIA SECTION
=========================== */
const uploadMediaBtn = document.getElementById("uploadMediaBtn");
const uploadSheet = document.getElementById("uploadSheet");
const closeUploadSheet = document.getElementById("closeUploadSheet");
const mediaInput = document.getElementById("mediaInput");
const uploadFilesBtn = document.getElementById("uploadFilesBtn");
const submitFilesBtn = document.getElementById("submitFilesBtn");
const uploadDescription = document.getElementById("uploadDescription");
const previewContainer = document.getElementById("previewContainer");
const uploadSettingsBtn = document.getElementById("uploadSettingsBtn");
const uploadSettingsMenu = document.getElementById("uploadSettingsMenu");
const uploadSettingsOptions = Array.from(document.querySelectorAll(".upload-setting-option"));
let isUploadSettingsMenuOpen = false;

const uploadSettingsState = {
  followersOnly: false,
  commentsDisabled: false,
  followersCommentsOnly: false
};

if (uploadDescription) {
  initHashtagSuggestions(uploadDescription);
}

function toggleUploadSettingsMenu(forceOpen) {
  if (!uploadSettingsMenu || !uploadSettingsBtn) return;

  if (typeof forceOpen === "boolean") {
    isUploadSettingsMenuOpen = forceOpen;
  } else {
    isUploadSettingsMenuOpen = !isUploadSettingsMenuOpen;
  }

  uploadSettingsMenu.hidden = !isUploadSettingsMenuOpen;
  uploadSettingsBtn.setAttribute("aria-expanded", String(isUploadSettingsMenuOpen));
}

function updateUploadSettingButtons() {
  uploadSettingsOptions.forEach((option) => {
    const settingName = option.dataset.setting;
    const isActive = Boolean(uploadSettingsState[settingName]);
    option.classList.toggle("active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });
}

if (uploadSettingsBtn && uploadSettingsMenu) {
  uploadSettingsMenu.hidden = true;
  isUploadSettingsMenuOpen = false;
  uploadSettingsBtn.setAttribute("aria-expanded", "false");

  uploadSettingsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isUploadSettingsMenuOpen) {
      isUploadSettingsMenuOpen = false;
      uploadSettingsMenu.hidden = true;
      uploadSettingsBtn.setAttribute("aria-expanded", "false");
      return;
    }

    isUploadSettingsMenuOpen = true;
    uploadSettingsMenu.hidden = false;
    uploadSettingsBtn.setAttribute("aria-expanded", "true");
  });

  uploadSettingsOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const settingName = option.dataset.setting;
      if (!settingName) return;

      uploadSettingsState[settingName] = !uploadSettingsState[settingName];
      updateUploadSettingButtons();
      isUploadSettingsMenuOpen = false;
      uploadSettingsMenu.hidden = true;
      uploadSettingsBtn.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", (event) => {
    const clickedInsideButton = event.target.closest("#uploadSettingsBtn");
    const clickedInsideMenu = event.target.closest("#uploadSettingsMenu");

    if (!clickedInsideButton && !clickedInsideMenu) {
      isUploadSettingsMenuOpen = false;
      uploadSettingsMenu.hidden = true;
      uploadSettingsBtn.setAttribute("aria-expanded", "false");
    }
  });
}

function resetUploadForm() {
  if (mediaInput) mediaInput.value = "";
  if (uploadDescription) uploadDescription.value = "";
  if (previewContainer) previewContainer.innerHTML = "";

  Object.keys(uploadSettingsState).forEach((key) => {
    uploadSettingsState[key] = false;
  });
  updateUploadSettingButtons();
  toggleUploadSettingsMenu(false);
}

updateUploadSettingButtons();

const MAX_UPLOAD_ITEMS = 6;
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;

function validateUploadFiles(files = []) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) {
    return { valid: false, error: "Please choose a file first." };
  }

  const oversizedFile = selectedFiles.find((file) => Number(file.size || 0) > MAX_FILE_SIZE_BYTES);
  if (oversizedFile) {
    const readableLimit = "25MB";
    return { valid: false, error: `Each file must be under ${readableLimit}. ${oversizedFile.name} is too large.` };
  }

  const imageCount = selectedFiles.filter((file) => file.type.startsWith("image/")).length;
  const videoCount = selectedFiles.filter((file) => file.type.startsWith("video/")).length;

  if (videoCount > 1) {
    return { valid: false, error: "You can upload only 1 video per post." };
  }

  if (imageCount + videoCount > MAX_UPLOAD_ITEMS) {
    return { valid: false, error: `You can upload up to ${MAX_UPLOAD_ITEMS} items per post. Choose up to 6 images or 1 video.` };
  }

  return { valid: true, files: selectedFiles };
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("video/")) {
      resolve(0);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Number(video.duration) : 0;
      cleanup();
      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to read video duration."));
    };

    video.src = objectUrl;
  });
}

async function prepareUploadFiles(files = []) {
  const selectedFiles = Array.from(files || []);
  if (!selectedFiles.length) {
    return { valid: false, error: "Please choose a file first." };
  }

  const preparedFiles = [...selectedFiles];

  const oversizedFile = preparedFiles.find((file) => Number(file.size || 0) > MAX_FILE_SIZE_BYTES);
  if (oversizedFile) {
    return { valid: false, error: `Each file must be under 25MB. ${oversizedFile.name} is too large.` };
  }

  const imageCount = preparedFiles.filter((file) => file.type.startsWith("image/")).length;
  const videoCount = preparedFiles.filter((file) => file.type.startsWith("video/")).length;

  if (videoCount > 1) {
    return { valid: false, error: "You can upload only 1 video per post." };
  }

  if (imageCount + videoCount > MAX_UPLOAD_ITEMS) {
    return { valid: false, error: `You can upload up to ${MAX_UPLOAD_ITEMS} items per post. Choose up to 6 images or 1 video.` };
  }

  const videoFiles = preparedFiles.filter((file) => file.type.startsWith("video/"));
  for (const file of videoFiles) {
    try {
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        return { valid: false, error: `Videos are capped at ${MAX_VIDEO_DURATION_SECONDS} seconds.` };
      }
    } catch (error) {
      console.warn("Could not verify video duration:", error);
    }
  }

  return { valid: true, files: preparedFiles };
}

function renderSelectedPreviews(files = []) {
  if (!previewContainer) return;

  const normalizedFiles = Array.from(files || []);
  if (!normalizedFiles.length) {
    previewContainer.innerHTML = "";
    return;
  }

  const validation = validateUploadFiles(normalizedFiles);
  if (!validation.valid) {
    previewContainer.innerHTML = "";
    if (mediaInput) mediaInput.value = "";
    alert(validation.error);
    return;
  }

  previewContainer.innerHTML = validation.files
    .map((file, index) => {
      const objectUrl = URL.createObjectURL(file);
      const previewMarkup = file.type.startsWith("image/")
        ? `<img src="${objectUrl}" alt="${file.name}" />`
        : file.type.startsWith("video/")
          ? `<video src="${objectUrl}" muted loop playsinline></video>`
          : `<div class="preview-item file-preview"></div>`;

      return `
        <div class="preview-item ${file.type.startsWith("image/") ? "image-preview" : file.type.startsWith("video/") ? "video-preview video-shell" : "file-preview"}" style="position: relative;">
          <button
            type="button"
            class="preview-remove-btn"
            data-remove-index="${index}"
            aria-label="Remove selected media"
            title="Remove"
            style="position: absolute; top: 8px; right: 8px; z-index: 2; width: 28px; height: 28px; border: none; border-radius: 50%; background: rgba(17, 17, 17, 0.72); color: #fff; font-size: 18px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(17,17,17,0.2);"
          >
            ×
          </button>
          ${previewMarkup}
        </div>
      `;
    })
    .join("");

  previewContainer.querySelectorAll(".video-shell").forEach(bindVideoControls);
}

function handleMediaSelection() {
  if (!mediaInput || !previewContainer) return;

  const files = Array.from(mediaInput.files || []);
  renderSelectedPreviews(files);
}

previewContainer?.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".preview-remove-btn");
  if (!removeButton || !mediaInput) return;

  const indexToRemove = Number(removeButton.dataset.removeIndex);
  const currentFiles = Array.from(mediaInput.files || []);
  const nextFiles = currentFiles.filter((_, index) => index !== indexToRemove);

  const dataTransfer = new DataTransfer();
  nextFiles.forEach((file) => dataTransfer.items.add(file));
  mediaInput.files = dataTransfer.files;

  if (!nextFiles.length) {
    previewContainer.innerHTML = "";
    return;
  }

  renderSelectedPreviews(nextFiles);
});

async function submitUploadedFiles() {
  if (!mediaInput) {
    alert("Please choose a file first.");
    return;
  }

  const files = Array.from(mediaInput.files || []);
  const validation = validateUploadFiles(files);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  const prepared = await prepareUploadFiles(files);
  if (!prepared.valid) {
    alert(prepared.error);
    return;
  }

  const description = uploadDescription ? uploadDescription.value.trim() : "";
  const caption = description;

  const formData = new FormData();
  const currentUserId = getCurrentUserId();
  prepared.files.forEach((file) => {
    formData.append("file", file);
  });
  formData.append("content", caption);
  formData.append("user_id", currentUserId);
  formData.append("followers_only", String(Boolean(uploadSettingsState.followersOnly)));
  formData.append("comments_disabled", String(Boolean(uploadSettingsState.commentsDisabled)));
  formData.append("followers_comments_only", String(Boolean(uploadSettingsState.followersCommentsOnly)));

  try {
    if (submitFilesBtn) {
      submitFilesBtn.disabled = true;
      submitFilesBtn.innerHTML = '<i class="fa-solid fa-circle-arrow-right fa-lg" style="color: rgb(255, 255, 255);"></i>';
    }

    const response = await apiFetch("/api/posts", {
      method: "POST",
      body: formData
    });

    const responseText = await response.text();
    let data = {};

    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (error) {
        const snippet = responseText.slice(0, 250).replace(/\s+/g, " ").trim();
        console.error("Upload response was not valid JSON:", snippet);
        const reason = /<html|<!doctype/i.test(responseText) ? "The server returned an HTML page instead of JSON." : "The server returned an unexpected response.";
        throw new Error(`Upload failed: ${reason}`);
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || "Upload failed");
    }

    const uploadedPost = data.post || (Array.isArray(data.posts) ? data.posts[0] : null);
    const uploadedCount = Array.isArray(uploadedPost?.media_urls) ? uploadedPost.media_urls.length : 1;
    const label = uploadedCount > 1 ? `${uploadedCount}-slide upload` : (uploadedPost?.content || caption || "uploaded file");
    showUploadToast(label ? `Uploaded: ${label}` : "Upload successful");

    resetUploadForm();
    await loadPosts();
  } catch (error) {
    console.error("Upload error:", error);
    alert(error.message || "Upload failed");
  } finally {
    if (submitFilesBtn) {
      submitFilesBtn.disabled = false;
      submitFilesBtn.innerHTML = '<i class="fa-solid fa-circle-arrow-right fa-lg" style="color: rgb(255, 255, 255);"></i>';
    }
  }
}

if (uploadMediaBtn && uploadSheet) {
  uploadMediaBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    if (footerIconMenu) {
      footerIconMenu.classList.remove("show");
    }

    openSheet(uploadSheet);
  });
}

const uploadSheetCloseButtons = document.querySelectorAll(".upload-close-btn, #closeUploadSheet");

uploadSheetCloseButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSheet(uploadSheet);
    resetUploadForm();
  });
});

if (mediaInput) {
  mediaInput.addEventListener("change", handleMediaSelection);
}

if (uploadFilesBtn && mediaInput) {
  uploadFilesBtn.addEventListener("click", () => {
    mediaInput.click();
  });
}

if (submitFilesBtn && uploadSheet) {
  submitFilesBtn.addEventListener("click", submitUploadedFiles);
}

/* ============================================================
   VIDEO CONTROLS + PLAYBACK
   Handles video timers, play/pause, and mute controls.
   ============================================================ */

function formatVideoTime(totalSeconds) {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function bindVideoControls(videoShell) {
  if (!videoShell) return;

  const video = videoShell.querySelector("video");
  const toggleBtn = videoShell.querySelector(".video-toggle");
  const muteBtn = videoShell.querySelector(".video-mute-toggle");
  const timer = videoShell.querySelector(".video-timer");
  const progressTrack = videoShell.querySelector(".video-progress");

  if (!video || !toggleBtn) return;

  const shouldAutoplay = videoShell.dataset.autoplay === "true";
  video.muted = true;
  video.volume = 0;
  video.autoplay = shouldAutoplay;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("loop", "");
  if (shouldAutoplay) {
    video.setAttribute("autoplay", "");
  }

  const progressBar = videoShell.querySelector(".video-progress-bar");

  const syncPlayButton = () => {
    toggleBtn.innerHTML = video.paused ? '<i class="fa-solid fa-play fa-lg" style="color: rgb(255, 255, 255);"></i>' : '<i class="fa-solid fa-pause fa-lg" style="color: rgb(255, 255, 255);"></i>';
    toggleBtn.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    toggleBtn.title = video.paused ? "Play video" : "Pause video";
  };

  const syncMuteButton = () => {
    if (!muteBtn) return;
    muteBtn.innerHTML = video.muted
      ? '<i class="fa-solid fa-volume-low fa-lg" style="color: rgb(255, 255, 255);"></i>'
      : '<i class="fa-solid fa-volume-xmark fa-lg" style="color: rgb(255, 255, 255);"></i>';
    muteBtn.setAttribute("aria-label", video.muted ? "Unmute video" : "Mute video");
    muteBtn.title = video.muted ? "Unmute video" : "Mute video";
  };

  const syncTimer = () => {
    if (!timer) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    timer.textContent = `${formatVideoTime(current)} / ${formatVideoTime(duration)}`;

    if (progressBar) {
      const percent = duration > 0 ? (current / duration) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  };

  const seekVideoToPointer = (clientX) => {
    if (!progressTrack || !video.duration) return;
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    syncTimer();
  };

  if (progressTrack) {
    progressTrack.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      seekVideoToPointer(event.clientX);

      const handlePointerMove = (moveEvent) => seekVideoToPointer(moveEvent.clientX);
      const stopScrubbing = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", stopScrubbing);
        document.removeEventListener("pointercancel", stopScrubbing);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", stopScrubbing, { once: true });
      document.addEventListener("pointercancel", stopScrubbing, { once: true });
    });
  }

  video.addEventListener("loadedmetadata", syncTimer);
  video.addEventListener("timeupdate", syncTimer);
  video.addEventListener("play", () => {
    syncPlayButton();
    syncMuteButton();
  });
  video.addEventListener("pause", () => {
    syncPlayButton();
    syncMuteButton();
  });

  toggleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }

    syncPlayButton();
  });

  if (muteBtn) {
    muteBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      video.muted = !video.muted;
      video.volume = video.muted ? 0 : 1;
      syncMuteButton();
    });
  }

  syncTimer();
  syncPlayButton();
  syncMuteButton();

  if (shouldAutoplay) {
    const tryAutoplay = () => {
      video.play().catch(() => {
        requestAnimationFrame(() => {
          video.play().catch(() => {});
        });
      });
    };

    if (video.readyState >= 2) {
      tryAutoplay();
    } else {
      video.addEventListener("loadeddata", tryAutoplay, { once: true });
    }
  }
}

function normalizeMediaList(post) {
  if (Array.isArray(post?.media_urls) && post.media_urls.length) {
    return post.media_urls.filter(Boolean);
  }

  if (post?.media_url) {
    return [post.media_url];
  }

  return [];
}

function bindMediaGalleryControls(gallery) {
  if (!gallery) return;

  const slides = Array.from(gallery.querySelectorAll(".gallery-slide"));
  if (slides.length <= 1) return;

  let currentIndex = 0;
  let startX = 0;

  const updateGallery = (nextIndex) => {
    currentIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === currentIndex);
    });

    const dots = gallery.querySelectorAll(".gallery-dot");
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentIndex);
    });
  };

  const prevBtn = gallery.querySelector(".gallery-prev");
  const nextBtn = gallery.querySelector(".gallery-next");

  if (prevBtn) {
    prevBtn.remove();
  }

  if (nextBtn) {
    nextBtn.remove();
  }

  const dots = Array.from({ length: slides.length }, (_, index) => {
    const dot = document.createElement("span");
    dot.className = `gallery-dot${index === 0 ? " active" : ""}`;
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    return dot;
  });

  const controls = gallery.querySelector(".gallery-controls");
  if (controls) {
    dots.forEach((dot) => controls.appendChild(dot));
  }

  const hideCounter = gallery.querySelector(".gallery-counter");
  if (hideCounter) {
    hideCounter.style.display = "none";
  }

  gallery.addEventListener("touchstart", (event) => {
    startX = event.touches[0].clientX;
  }, { passive: true });

  gallery.addEventListener("touchend", (event) => {
    const endX = event.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) > 50) {
      updateGallery(diff < 0 ? currentIndex + 1 : currentIndex - 1);
    }
  }, { passive: true });

  updateGallery(0);
}

/* ============================================================
   FEED + USER SHEET + POSTS
   Loads post data, renders feed cards, and handles user profile sheets.
   ============================================================ */

function buildOptimizedCloudinaryImageUrl(url, { width = 240, height = 240, crop = "fill", quality = "auto", format = "auto" } = {}) {
  if (!url || typeof url !== "string") return url;
  const trimmedUrl = url.trim();

  if (!/cloudinary\.com|res\.cloudinary\.com/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (/\/upload\/(?:w_|h_|c_|q_|f_)/i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return trimmedUrl.replace(/\/upload\//i, `/upload/w_${width},h_${height},c_${crop},q_${quality},f_${format}/`);
}

function getCacheBustedImageUrl(url) {
  if (!url) return url;
  const optimizedUrl = buildOptimizedCloudinaryImageUrl(url, { width: 240, height: 240, crop: "fill", quality: "auto", format: "auto" });
  return `${optimizedUrl}${optimizedUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function getCurrentUserAvatarMarkup(userId = getCurrentUserId()) {
  const avatarUrl = getProfilePicForUser(userId);

  if (avatarUrl) {
    return `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="Profile picture" />`;
  }

  return '<i class="fa-solid fa-circle-user fa-lg" style="color: rgb(108, 108, 105);"></i>';
}

function formatRelativeDateLabel(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const diffWeeks = Math.max(0, Math.round(diffDays / 7));
  const diffMonths = Math.max(0, (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()) + (now.getDate() < date.getDate() ? -1 : 0));
  const diffYears = Math.max(0, now.getFullYear() - date.getFullYear() - (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate()) ? 1 : 0));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
  }

  if (diffHours < 24) {
    return "Today";
  }

  if (diffDays === 1) {
    return "Yesterday";
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  if (diffWeeks === 1) {
    return "1 week ago";
  }

  if (diffWeeks < 5) {
    return `${diffWeeks} weeks ago`;
  }

  if (diffMonths === 1) {
    return "1 month ago";
  }

  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }

  if (diffYears === 1) {
    return "1 year ago";
  }

  return `${diffYears} years ago`;
}

function formatPostDateLabel(dateValue) {
  if (!dateValue) return "";

  const relativeLabel = formatRelativeDateLabel(dateValue);
  if (relativeLabel) {
    return relativeLabel;
  }

  return "";
}

async function refreshFollowStatus(targetUserId = getCurrentUserId()) {
  if (!followUserBtn) return;

  const currentUserId = getCurrentUserId();
  const resolvedTargetId = targetUserId || currentUserId || "guest";

  if (!resolvedTargetId || resolvedTargetId === "guest") {
    followUserBtn.innerHTML = '<i class="fa-solid fa-plus fa-lg" style="color: rgb(0, 0, 0);"></i> Follow';
    followUserBtn.setAttribute("aria-pressed", "false");
    if (userFollowCount) {
      userFollowCount.textContent = "0 followers";
    }
    return;
  }

  try {
    const response = await fetch(`/api/users/${encodeURIComponent(resolvedTargetId)}/follow-status?user_id=${encodeURIComponent(currentUserId || "")}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load follow status");
    }

    const data = await response.json().catch(() => ({}));
    const followerCount = Number(data?.follower_count || 0);
    const isFollowing = Boolean(data?.isFollowing);

    followUserBtn.dataset.following = String(isFollowing);
    followUserBtn.setAttribute("aria-pressed", String(isFollowing));
    followUserBtn.innerHTML = `<i class="fa-solid ${isFollowing ? "fa-check" : "fa-plus"} fa-lg" style="color: rgb(0, 0, 0);"></i> ${isFollowing ? "Following" : "Follow"}`;

    if (userFollowCount) {
      userFollowCount.textContent = `${followerCount} follower${followerCount === 1 ? "" : "s"}`;
    }
  } catch (error) {
    console.warn("Follow status unavailable:", error);
  }
}

async function openUserProfileSheet(userId = getCurrentUserId()) {
  const targetUserId = userId || getCurrentUserId();

  if (targetUserId && targetUserId !== "guest") {
    await loadUserProfileDataFromServer(targetUserId);
    await refreshFollowStatus(targetUserId);
  }

  const profileImage = getProfilePicForUser(targetUserId) || (auth?.currentUser?.uid === targetUserId ? auth.currentUser.photoURL : null);

  const profileNameDisplay = document.getElementById("profileNameDisplay");
  if (profileNameDisplay) {
    profileNameDisplay.dataset.userId = String(targetUserId || "");
  }
  if (followUserBtn) {
    followUserBtn.dataset.userId = String(targetUserId || "");
  }

  setExclusiveSheetState({ userSheetOpen: true, settingsSheetOpen: false });

  if (profilePicBtn) {
    if (profileImage) {
      setProfilePicPreview(profileImage, targetUserId);
    } else {
      setProfilePicPreview(null, targetUserId);
    }

    const isCurrentUser = targetUserId === getCurrentUserId();
    profilePicBtn.disabled = !isCurrentUser;
    profilePicBtn.style.pointerEvents = isCurrentUser ? "auto" : "none";
    profilePicBtn.style.opacity = isCurrentUser ? "1" : "0.7";
  }

  updateSideMenuProfileAvatar();
  updateSideMenuUserName();
  updateProfileNameDisplay(targetUserId);
  renderUserSheetMedia(targetUserId, activeUserSheetFilter);
}

function bindProfileAvatarButtons(root = document) {
  if (!root) return;

  const buttons = root.querySelectorAll(".profile-avatar-trigger");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const userId = button.dataset.userId || getCurrentUserId();
      openUserProfileSheet(userId);
    });
  });
}

function renderFeedPost(post) {
  const mediaList = normalizeMediaList(post);
  const mediaUrl = mediaList[0] || post?.media_url;
  const currentLang = getPreferredLanguage();
  const deviceLang = getDeviceLanguage();
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  const translateText = dict.translate || "Translate";
  const videoText = dict.video || "Video";
  const originalName = (post?.original_name || post?.saved_filename || "Uploaded file").replace(/\.[^/.]+$/, "");
  const content = (post?.content || "").trim();
  const translatedContent = translateTextForCurrentLocale(content);
  const normalizedContent = content.replace(/\.[^/.]+$/, "");
  const isLikelyNumericCaption = /^\d+$/.test(content);
  const isLikelyFilenameCaption = Boolean(content) && (
    normalizedContent === originalName ||
    /^(IMG|VID|VIDEO|PHOTO|PXL|Screenshot|Screenshot_)/i.test(content) ||
    /^[A-Za-z0-9_\-() ]{3,80}$/.test(content) && /(?:IMG|VID|PHOTO|PXL|Screenshot|DCIM|image|video)/i.test(content)
  );
  const originalCaptionText = content && !isLikelyNumericCaption && !isLikelyFilenameCaption ? content : "";
  const caption = originalCaptionText;
  const translatedCaptionText = translatedContent && originalCaptionText ? translatedContent : originalCaptionText;
  const isViewerDiscretionRestricted = Number(post?.viewer_discretion || 0) === 1;
  const isVideo = isVideoMediaUrl(mediaUrl);
  const isGallery = mediaList.length > 1;
  const isTextOnly = !mediaUrl && !!caption;
  const ownerUserId = post?.user_id || getCurrentUserId();
  const displayName = getDisplayNameForUser(ownerUserId) || "User";
  const postDateLabel = formatPostDateLabel(post?.created_at);
  const isOwner = Boolean(post?.user_id) && String(post.user_id) === String(getCurrentUserId());
  const likeCount = Number(post?.likes_count ?? post?.like_count ?? 0);
  const commentCount = Number(post?.comment_count ?? post?.comments_count ?? post?.commentCount ?? 0);
  const compactLikeCount = formatCompactCount(likeCount);
  const compactCommentCount = formatCompactCount(commentCount);
  const isLikedByCurrentUser = Boolean(post?.liked_by_current_user || post?.liked === true);
  const commentsDisabled = Number(post?.comments_disabled || 0) === 1;
  const followersCommentsOnly = Number(post?.followers_comments_only || 0) === 1;
  const currentUserId = getCurrentUserId();
  const isCurrentUserAuthor = Boolean(post?.user_id) && String(post.user_id) === String(currentUserId);
  const isCurrentUserFollowing = Boolean(post?.followed_creator || post?.followedCreator || false);
  const commentsLocked = commentsDisabled || (followersCommentsOnly && currentUserId && currentUserId !== "guest" && !isCurrentUserAuthor && !isCurrentUserFollowing);
  const captionPreviewLimit = 80;

  const encodeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

  const encodeAttribute = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const formatCaptionTextForDisplay = (value, usePreview = false) => {
    const normalizedText = String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const previewText = usePreview && normalizedText.length > 90
      ? `${normalizedText.slice(0, 90).trim()}...`
      : normalizedText;

    const escapedText = encodeHtml(previewText)
      .replace(/\n{2,}/g, "<br><br>")
      .replace(/\n/g, "<br>");

    return escapedText
      .replace(/(^|[\s>])(#(?:[a-zA-Z0-9_]+))/g, '$1<span class="hashtag-highlight">$2</span>');
  };

  const renderCaptionMarkup = (text) => {
    if (!text) return "";

    const normalizedText = String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const captionPreviewLimit = 90;
    const isLongCaption = normalizedText.length > captionPreviewLimit;
    const previewText = isLongCaption ? `${normalizedText.slice(0, captionPreviewLimit).trim()}...` : normalizedText;
    const fullTextAttr = encodeAttribute(normalizedText);

    return `
      <div class="feed-caption" data-full-text="${fullTextAttr}" data-original-text="${encodeAttribute(originalCaptionText || normalizedText)}" data-translated-text="${encodeAttribute(translatedCaptionText || normalizedText)}">
        <span class="feed-caption-text">${formatCaptionTextForDisplay(previewText, false)}</span>
        ${isLongCaption ? '<button class="feed-read-more-btn" type="button" aria-expanded="false">Read more</button>' : ""}
      </div>
    `;
  };

  let mediaMarkup = "";

  if (isGallery) {
    mediaMarkup = `
      <div class="media-gallery" data-gallery="${post?.id || ""}">
        ${mediaList.map((url, index) => {
          const isMediaVideo = isVideoMediaUrl(url);
          const slideMarkup = isMediaVideo
            ? `
              <div class="gallery-slide ${index === 0 ? "active" : ""}">
                <div class="video-shell" data-post-id="${post?.id || ""}">
                  <video src="${url}" muted loop playsinline ${index === 0 ? "" : "preload=metadata"}></video>
                  <button class="video-toggle" type="button" aria-label="Play video"><i class="fa-solid fa-play fa-lg" style="color: rgb(255, 255, 255);"></i></button>
                  <button class="video-mute-toggle" type="button" aria-label="Unmute video"><i class="fa-solid fa-volume-low fa-lg" style="color: rgb(255, 255, 255);"></i></button>
                  <div class="video-progress"><span class="video-progress-bar"></span></div>
                  <div class="video-meta">
                    <span class="video-tag">${videoText}</span>
                    <span class="video-timer">0:00 / 0:00</span>
                  </div>
                </div>
              </div>
            `
            : `
              <div class="gallery-slide ${index === 0 ? "active" : ""}">
                <img src="${url}" alt="${originalName}" />
              </div>
            `;
          return slideMarkup;
        }).join("")}
        <div class="gallery-controls">
          <button class="gallery-prev" type="button" aria-label="Previous">‹</button>
          <span class="gallery-counter">1/${mediaList.length}</span>
          <button class="gallery-next" type="button" aria-label="Next">›</button>
        </div>
      </div>
    `;
  } else if (mediaUrl) {
    mediaMarkup = isVideo ? `
      <div class="video-shell" data-post-id="${post?.id || ""}">
        <video src="${mediaUrl}" muted loop playsinline></video>
        <button class="video-toggle" type="button" aria-label="Play video"><i class="fa-solid fa-play fa-lg" style="color: rgb(255, 255, 255);"></i></button>
        <button class="video-mute-toggle" type="button" aria-label="Unmute video"><i class="fa-solid fa-volume-low fa-lg" style="color: rgb(255, 255, 255);"></i></button>
        <div class="video-progress"><span class="video-progress-bar"></span></div>
        <div class="video-meta">
          <span class="video-tag">${videoText}</span>
          <span class="video-timer">0:00 / 0:00</span>
        </div>
      </div>
    ` : `<img src="${mediaUrl}" alt="${originalName}" />`;
  }

  const openReelUrl = post?.id ? `reels.html?videoId=${encodeURIComponent(post.id)}` : "reels.html";
  const openReelLabel = dict.openReels || "Open reels";
  const hasVideoMedia = Array.isArray(mediaList) ? mediaList.some((item) => isVideoMediaUrl(item)) : isVideoMediaUrl(mediaUrl);

  let mediaWrap = hasVideoMedia && post?.id ? `<a href="${openReelUrl}" class="video-open-link" aria-label="${openReelLabel}" data-post-id="${post?.id || ""}">${mediaMarkup}</a>` : mediaMarkup;

  if (isViewerDiscretionRestricted && mediaMarkup) {
    mediaWrap = `
      <div class="viewer-discretion-gate" data-post-id="${post?.id || ""}" style="position: relative; display: block; width: 100%; height: 100%; max-width: 100%; overflow: hidden; background: none; border-radius: 0;">
        <div class="viewer-discretion-media" style="display: block; width: 100%; height: 100%; max-width: 100%; filter: blur(16px) saturate(0.5); opacity: 0.6; pointer-events: none;">
          ${mediaWrap}
        </div>
        <div class="viewer-discretion-screen" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background: rgba(10,10,12,0.68); padding: 22px; text-align:center; z-index:2; width:100%; height:100%; box-sizing:border-box;">
          <div style="max-width: 290px; width:100%;">
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.76); font-weight: 700; font-family: sans-serif;">Viewer discretion</div>
            <div style="margin: 12px 0 18px; font-size: 1.15rem; font-weight: 700; color: #ffffff; line-height: 1.3;">This content may contain sensitive material.</div>
            <div style="display:flex; gap: 10px; justify-content:center; flex-wrap:wrap;">
              <button type="button" class="viewer-discretion-allow" data-post-id="${post?.id || ""}" style="background: #ffffff; color: #111111; border: 0; border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer;">Watch anyway</button>
              <button type="button" class="viewer-discretion-skip" data-post-id="${post?.id || ""}" style="background: transparent; color: #ffffff; border: 1px solid rgba(255,255,255,0.45); border-radius: 999px; padding: 10px 18px; font-weight: 700; cursor: pointer;">Keep scrolling</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  const isOwnPost = Boolean(post?.user_id) && String(post.user_id) === String(getCurrentUserId());
  const shouldShowTranslationButton = Boolean(originalCaptionText);
  const translationButtonMarkup = shouldShowTranslationButton ? `
    <button class="translate-btn" type="button" data-post-id="${post?.id || ""}" data-original-text="${escapeHtml(originalCaptionText)}" data-translated-text="${escapeHtml(translatedCaptionText || originalCaptionText)}" data-state="original">
      <span class="translate-label">Translate</span>
      <i class="fa-solid fa-language" style="color: rgb(8, 8, 8);"></i>
    </button>
  ` : "";
  const reportButtonMarkup = !isOwnPost ? `
    <button class="post-report-btn" type="button" data-post-id="${post?.id || ""}" data-action="report">
      <i class="fa-solid fa-flag fa-lg" style="color: rgb(109, 108, 111);"></i> Report this content
      
    </button>
    
  ` : "";
  const deleteButtonMarkup = isOwner ? `
    <button class="post-delete-btn" type="button" data-post-id="${post?.id || ""}" data-action="delete">
      <i class="fa-solid fa-trash fa-lg" style="color: rgb(109, 108, 111);"></i> Delete
    </button>
  ` : "";

  const menuMarkup = !isOwnPost ? `
    <div class="post-menu-wrapper">
      <div class="post-menu">
        <button class="post-menu-toggle" type="button" aria-label="More options">⋮</button>
        <div class="post-menu-options">
          ${reportButtonMarkup}
          ${deleteButtonMarkup}
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="feed-post-card ${isTextOnly ? "text-only-post" : ""}" data-post-id="${post?.id || ""}">
      ${menuMarkup}
      <div class="feed-post-header">
        <button type="button" class="post-avatar-bubble profile-avatar-trigger feed-header-avatar" data-user-id="${ownerUserId}" aria-label="View profile">
          ${getCurrentUserAvatarMarkup(ownerUserId)}
        </button>
        <div class="feed-post-user-block">
          <button type="button" class="feed-post-user profile-avatar-trigger" data-user-id="${ownerUserId}" aria-label="View ${displayName}'s profile">
            <span class="feed-post-user-name">${renderUserNameWithVerification(displayName, ownerUserId)}</span>
          </button>
          ${postDateLabel ? `<span class="feed-post-date">${postDateLabel}</span>` : ""}
        </div>
      </div>
      ${mediaWrap}
      ${renderCaptionMarkup(caption)}
      ${translationButtonMarkup}

      <div class="feed-actions actions">

      <button class="like-btn" type="button" data-post-id="${post?.id || ""}" data-liked="${isLikedByCurrentUser ? "true" : "false"}">
          <i class="${isLikedByCurrentUser ? "fa-solid fa-heart" : "fa-regular fa-heart"} fa-xl" style="color: ${isLikedByCurrentUser ? "rgb(255, 93, 93)" : "rgb(50, 50, 49)"};"></i>
          <span class="like-count">${compactLikeCount}</span>
        </button>

        <button class="comment-btn ${commentsLocked ? "comments-disabled" : ""}" type="button" aria-label="${commentsLocked ? "Comments disabled" : "Open comments"}" data-post-id="${post?.id || ""}" data-comments-disabled="${commentsLocked ? "true" : "false"}">
          <i class="${commentsLocked ? "fa-solid fa-comment-slash" : "fa-regular fa-comments"} fa-xl" style="color: ${commentsLocked ? "rgb(146, 146, 146)" : "rgb(76, 76, 76)"};"></i>
          <span class="comment-count">${compactCommentCount}</span>
        </button>

        

        <i class="fa-solid fa-retweet fa-xl" style="color: rgb(252, 218, 0);"></i>

        
      </div>
    </div>
  `;
}

function unwrapThreadWrappers() {
  if (!feedPosts) return;

  const threadWrappers = feedPosts.querySelectorAll(".post-thread");
  threadWrappers.forEach((threadWrapper) => {
    const card = threadWrapper.querySelector(".feed-post-card");
    if (card && threadWrapper.parentNode) {
      threadWrapper.replaceWith(card);
    }
  });
}

function saveLastNonReelsPage() {
  try {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}` || "index.html";
    if (!/reels\.html/i.test(currentPath)) {
      sessionStorage.setItem("bookme-last-page", currentPath || "index.html");
    }
  } catch (error) {
    console.warn("Unable to save last page:", error);
  }
}

function goBackToLastPage() {
  try {
    const lastPage = sessionStorage.getItem("bookme-last-page");
    if (lastPage && !/reels\.html/i.test(lastPage)) {
      window.location.href = lastPage;
      return;
    }
  } catch (error) {
    console.warn("Unable to read last page:", error);
  }

  if (document.referrer && document.referrer.startsWith(window.location.origin)) {
    window.location.href = document.referrer;
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "index.html";
}

function bindReadMoreButtons() {
  document.querySelectorAll(".feed-read-more-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const caption = button.closest(".feed-caption");
      const textEl = caption?.querySelector(".feed-caption-text");
      if (!caption || !textEl) return;

      const fullText = caption.dataset.fullText || textEl.textContent || "";
      const isExpanded = caption.classList.contains("expanded");

      if (isExpanded) {
        const truncated = `${fullText.slice(0, 90).trim()}...`;
        textEl.innerHTML = truncated.replace(/\n/g, "<br>");
        button.textContent = "Read more";
        button.setAttribute("aria-expanded", "false");
        caption.classList.remove("expanded");
      } else {
        textEl.innerHTML = fullText.replace(/\n/g, "<br>");
        button.textContent = "Read less";
        button.setAttribute("aria-expanded", "true");
        caption.classList.add("expanded");
      }
    });
  });
}

function bindTranslateButtons() {
  document.querySelectorAll(".translate-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = button.closest(".feed-post-card");
      const caption = card?.querySelector(".feed-caption");
      if (!caption) return;

      const textEl = caption.querySelector(".feed-caption-text");
      if (!textEl) return;

      const originalText = (button.dataset.originalText || caption.dataset.originalText || textEl.textContent || "").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
      const targetLanguage = getTranslationTargetLanguage();
      let translatedText = button.dataset.translatedText || caption.dataset.translatedText || "";

      if (!translatedText || translatedText === originalText) {
        translatedText = await resolveTranslatedTextForButton(originalText, targetLanguage);
        button.dataset.translatedText = translatedText;
        caption.dataset.translatedText = translatedText;
      }

      const isShowingOriginal = button.dataset.state === "original";
      const nextText = isShowingOriginal ? translatedText : originalText;
      const displayText = String(nextText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      textEl.innerHTML = displayText
        .replace(/\n{2,}/g, "<br><br>")
        .replace(/\n/g, "<br>")
        .replace(/(^|[\s>])(#(?:[a-zA-Z0-9_]+))/g, '$1<span class="hashtag-highlight">$2</span>');
      caption.dataset.fullText = displayText;
      button.dataset.state = isShowingOriginal ? "translated" : "original";

      const label = button.querySelector(".translate-label");
      if (label) {
        label.textContent = isShowingOriginal ? "View original language" : (TRANSLATIONS[targetLanguage]?.translate || "Translate");
      }
    });
  });
}

function bindViewerDiscretionGate() {
  document.querySelectorAll(".viewer-discretion-allow").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const gate = button.closest(".viewer-discretion-gate");
      if (!gate) return;

      const media = gate.querySelector(".viewer-discretion-media");
      if (media) {
        media.style.filter = "none";
        media.style.opacity = "1";
        media.style.pointerEvents = "auto";
      }

      const screen = gate.querySelector(".viewer-discretion-screen");
      if (screen) {
        screen.style.display = "none";
      }
    });
  });

  document.querySelectorAll(".viewer-discretion-skip").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const card = button.closest(".feed-post-card");
      if (card) {
        card.style.display = "none";
      }
    });
  });
}

function bindTextPostMenus() {
  if (!textMenuHandlerBound) {
    textMenuHandlerBound = true;

    document.addEventListener("click", (event) => {
      const clickedMenuToggle = event.target.closest(".text-post-menu-toggle");
      const clickedMenu = event.target.closest(".text-post-menu");

      if (!clickedMenuToggle && !clickedMenu) {
        document.querySelectorAll(".text-post-menu").forEach(menu => {
          menu.classList.remove("open");
        });
      }
    });
  }

  document.querySelectorAll(".text-post-menu-toggle, .post-menu-toggle").forEach(toggle => {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = toggle.closest(".text-post-menu, .post-menu");
      if (!menu) return;

      const isOpen = menu.classList.contains("open");
      document.querySelectorAll(".text-post-menu, .post-menu").forEach(item => item.classList.remove("open"));
      if (!isOpen) {
        menu.classList.add("open");
      }
    });
  });

  document.querySelectorAll(".text-post-delete-btn, .post-delete-btn, .post-report-btn").forEach(button => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();

      const action = button.dataset.action || "report";
      const postId = button.dataset.postId;

      if (action === "delete") {
        deletePostById(postId);
        return;
      }

      const reportSheet = document.getElementById("reportSheet");
      if (reportSheet) {
        reportSheet.dataset.postId = postId || "";
        reportSheet.classList.add("show");
      }
    });
  });
}

async function loadPosts() {
  try {
    const currentUserId = getCurrentUserId();
    const mode = currentUserId && currentUserId !== "guest" ? (activeFeedMode || "for_you") : "for_you";
    const url = currentUserId && currentUserId !== "guest"
      ? `/api/posts?user_id=${encodeURIComponent(currentUserId)}&feed_mode=${encodeURIComponent(mode)}`
      : "/api/posts";

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load posts");
    }

    const posts = await response.json();
    const validPosts = Array.isArray(posts) ? posts : [];
    window.__feedPostsCache = validPosts;

    const uniqueUserIds = [...new Set(validPosts
      .map((post) => String(post?.user_id || "").trim())
      .filter((userId) => userId && userId !== "guest"))];

    if (uniqueUserIds.length) {
      await Promise.all(uniqueUserIds.map((userId) => hydrateUserProfileFromServer(userId)));
    }

    if (feedPosts) {
      const currentUserId = getCurrentUserId();
      const visiblePosts = validPosts.filter((post) => {
        const isFlagged = Boolean(post.is_flagged) || Number(post.report_count || 0) >= 10;
        const isOwnPost = Boolean(post?.user_id) && String(post.user_id) === String(currentUserId);
        const hideOwnPostInFollowing = activeFeedMode === "following" && currentUserId && currentUserId !== "guest" && isOwnPost;
        return !isFlagged && !hideOwnPostInFollowing;
      });

      if (!visiblePosts.length) {
        feedPosts.innerHTML = '<div class="feed-empty-state">No posts yet. Start the first post to get the conversation going.</div>';
        renderSearchSheet([]);
        applyTranslations(getPreferredLanguage());
        return;
      }

      feedPosts.innerHTML = visiblePosts.map(renderFeedPost).join("");
      unwrapThreadWrappers();
      bindReadMoreButtons();
      bindTranslateButtons();
      bindViewerDiscretionGate();
      bindProfileAvatarButtons(feedPosts);
      feedPosts.querySelectorAll(".video-shell").forEach((videoShell, index) => {
        videoShell.dataset.autoplay = String(index === 0);
        const video = videoShell.querySelector("video");
        if (video) {
          video.muted = true;
          video.autoplay = index === 0;
          video.loop = true;
          video.playsInline = true;
        }
      });
      feedPosts.querySelectorAll(".video-shell").forEach(bindVideoControls);
      feedPosts.querySelectorAll(".media-gallery").forEach(bindMediaGalleryControls);
      bindTextPostMenus();
      applyTranslations(getPreferredLanguage());
    }

    renderSearchSheet(validPosts);
    if (searchResults) {
      bindProfileAvatarButtons(searchResults);
    }
  } catch (error) {
    console.error("loadPosts error:", error);
    if (feedPosts) {
      feedPosts.innerHTML = "";
    }
    renderSearchSheet([]);
  }
}

function getCurrentPostText() {
  const postContainer = document.getElementById("ipostText");
  if (!postContainer) return "";

  const paragraph = postContainer.querySelector("p");
  return (paragraph ? paragraph.textContent : postContainer.textContent).trim();
}

//comments js//

function openCommentsSheet(postId = "") {
  if (!commentsSheet || !commentsList) return;

  activeCommentsPostId = String(postId || "");
  clearCommentReplyMode();

  const currentUserId = getCurrentUserId();
  const postState = getPostCommentAccessState(activeCommentsPostId);
  const commentsDisabled = postState.commentsDisabled || (postState.followersCommentsOnly && currentUserId && currentUserId !== "guest" && !postState.isAuthor && !postState.isFollowing);

  if (commentsDisabled) {
    commentsSheet.classList.add("show");
    commentsSheet.style.pointerEvents = "auto";
    commentsList.innerHTML = '<div class="comment-empty">Comments are disabled for this post.</div>';
    if (commentInput) {
      commentInput.disabled = true;
      commentInput.value = "";
      commentInput.placeholder = "Comments are disabled";
    }
    if (submitCommentBtn) {
      submitCommentBtn.disabled = true;
    }
    return;
  }

  if (commentInput) {
    commentInput.disabled = false;
    commentInput.placeholder = "Write a comment...";
  }
  if (submitCommentBtn) {
    submitCommentBtn.disabled = false;
  }

  commentsSheet.classList.add("show");
  commentsSheet.style.pointerEvents = "auto";
  commentsList.innerHTML = '<div class="comment-empty">Loading comments...</div>';

  if (activeCommentsPostId) {
    loadCommentsForCurrentPost();
  } else {
    commentsList.innerHTML = '<div class="comment-empty">No comments yet.</div>';
  }
}

if (closeCommentsSheet && commentsSheet) {
  closeCommentsSheet.addEventListener("click", () => {
    commentsSheet.classList.remove("show");
    commentsSheet.style.pointerEvents = "none";
    clearCommentReplyMode();
    if (commentInput) commentInput.value = "";
  });
}

if (submitCommentBtn && commentInput && commentsSheet) {
  submitCommentBtn.addEventListener("click", async () => {
    if (!commentsSheet.classList.contains("show")) {
      return;
    }

    const postId = activeCommentsPostId;
    const postState = getPostCommentAccessState(postId);
    if (!postId || (postState.commentsDisabled || (postState.followersCommentsOnly && getCurrentUserId() && getCurrentUserId() !== "guest" && !postState.isAuthor && !postState.isFollowing))) {
      alert("Comments are disabled for this post.");
      return;
    }

    const commentText = commentInput.value.trim();
    if (!commentText) {
      return;
    }

    try {
      submitCommentBtn.disabled = true;

      const response = await apiFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          post_id: Number(postId),
          user_id: getCurrentUserId(),
          name: getCurrentUserDisplayNameForApi(),
          content: activeReplyCommentId ? `@${activeReplyCommentName}: ${commentText}` : commentText,
          reply_to: activeReplyCommentId ? Number(activeReplyCommentId) : null
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to add comment.");
      }

        if (activeReplyCommentId) {
        const currentState = getCommentLocalState(activeReplyCommentId);
        const currentReplyCount = Number(currentState.replyCount || 0);
        setCommentLocalState(activeReplyCommentId, {
          liked: Boolean(currentState.liked),
          likeCount: Number(currentState.likeCount || 0),
          replyCount: currentReplyCount + 1
        });
      }

      commentInput.value = "";
      clearCommentReplyMode();
      await loadNotificationCount();

      const commentCountBadge = document.querySelector(`.comment-btn[data-post-id="${CSS.escape(String(postId))}"] .comment-count`);
      if (commentCountBadge) {
        const currentCount = parseCompactCount(commentCountBadge.textContent.trim());
        commentCountBadge.textContent = formatCompactCount(currentCount + 1);
      }

      if (Array.isArray(window.__feedPostsCache)) {
        const cachedPost = window.__feedPostsCache.find((post) => String(post.id) === String(postId));
        if (cachedPost) {
          const newValue = Number(cachedPost.comment_count || cachedPost.comments_count || 0) + 1;
          cachedPost.comment_count = newValue;
          cachedPost.comments_count = newValue;
        }
      }

      await loadCommentsForCurrentPost();
    } catch (error) {
      console.error("Comment submit error:", error);
      alert(error.message || "Unable to add comment.");
    } finally {
      submitCommentBtn.disabled = false;
      syncCommentReplyInputState();
    }
  });
}

if (feedPosts) {
  initializeHomeFeed();

  feedPosts.addEventListener("click", async (event) => {
    const commentButton = event.target.closest(".comment-btn");
    if (commentButton) {
      event.stopPropagation();
      openCommentsSheet(commentButton.dataset.postId || "");
      return;
    }

    const likeButton = event.target.closest(".like-btn");
    if (likeButton) {
      event.stopPropagation();

      const postId = likeButton.dataset.postId;
      const currentUserId = getCurrentUserId();
      if (!postId) return;
      if (!currentUserId || currentUserId === "guest") {
        alert("Please sign in to like posts.");
        return;
      }

      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUserId,
            name: getCurrentUserDisplayNameForApi()
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to update like.");
        }

        const icon = likeButton.querySelector("i");
        const countEl = likeButton.querySelector(".like-count");
        const isLiked = Boolean(data?.liked);
        await loadNotificationCount();
        if (icon) {
          icon.className = isLiked ? "fa-solid fa-heart fa-xl" : "fa-regular fa-heart fa-xl";
          icon.style.color = isLiked ? "rgb(255, 93, 93)" : "rgb(101, 101, 100)";
        }
        if (countEl) {
          countEl.textContent = formatCompactCount(data?.likeCount ?? 0);
        }
        likeButton.dataset.liked = String(isLiked);
      } catch (error) {
        console.error("Like toggle error:", error);
        alert(error.message || "Unable to update like.");
      }
      return;
    }

    const clickedVideoShell = event.target.closest(".video-shell");
    if (clickedVideoShell && clickedVideoShell.dataset.postId) {
      const postId = clickedVideoShell.dataset.postId;
      const targetUrl = `reels.html?videoId=${encodeURIComponent(postId)}`;
      window.location.href = targetUrl;
    }
  });
}


/* ===========================
   REPORT SLIDE-UP SHEET
=========================== */

const reportSheetBtn = document.getElementById("reportSheetBtn");
const reportSheet = document.getElementById("reportSheet");

function ensureReportSheetContent() {
  if (!reportSheet || reportSheet.querySelector("#reportForm")) return;

  reportSheet.innerHTML = `
    <div class="sheet-header">
      <div class="sheet-header-text">
        <h2>Report this content</h2>
        <h3>Let us know what needs attention.</h3>
      </div>
      <button id="closeReportSheet" class="close-btn" type="button" aria-label="Close report sheet">×</button>
    </div>
    <span class="sheet-drag"></span>

    <div class="sheet-content">
      <form class="report-form" id="reportForm">
        <p class="report-form-title">Why are you reporting this?</p>
        <p class="report-form-subtitle">Choose the closest reason and add any extra details.</p>

        <div class="report-options">
          <label class="report-option"><input type="radio" name="reportReason" value="spam" checked> Spam</label>
          <label class="report-option"><input type="radio" name="reportReason" value="harassment"> Harassment</label>
          <label class="report-option"><input type="radio" name="reportReason" value="hate"> Hate speech</label>
          <label class="report-option"><input type="radio" name="reportReason" value="misinformation"> Misinformation</label>
          <label class="report-option"><input type="radio" name="reportReason" value="nudity"> Nudity or sexual content</label>
        </div>

        <textarea class="report-details" placeholder="Add more details (optional)"></textarea>
        <button type="submit" class="report-submit-btn">Submit report</button>
      </form>
    </div>
  `;

  const refreshedCloseReportSheet = document.getElementById("closeReportSheet");
  if (refreshedCloseReportSheet) {
    refreshedCloseReportSheet.addEventListener("click", () => {
      reportSheet.classList.remove("show");
    });
  }

  const reportForm = document.getElementById("reportForm");
  if (reportForm) {
    reportForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const postId = reportSheet.dataset.postId;
      const currentUserId = getCurrentUserId();
      const reasonInput = reportForm.querySelector('input[name="reportReason"]:checked');
      const detailsInput = reportForm.querySelector(".report-details");
      const targetPost = postId ? (Array.isArray(window.__feedPostsCache) ? window.__feedPostsCache.find((post) => String(post.id) === String(postId)) : null) : null;
      const isOwnPost = Boolean(targetPost?.user_id) && String(targetPost.user_id) === String(currentUserId);

      if (!postId) {
        alert("No content selected to report.");
        return;
      }

      if (!currentUserId) {
        alert("Please sign in before reporting content.");
        return;
      }

      if (isOwnPost) {
        reportSheet.classList.remove("show");
        alert("You cannot report your own content.");
        return;
      }

      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: currentUserId,
            reason: reasonInput ? reasonInput.value : "spam",
            details: detailsInput ? detailsInput.value : ""
          })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to submit report.");
        }

        reportSheet.classList.remove("show");
        if (data.flagged) {
          alert("This content has reached 10 reports and has been taken down.");
        } else {
          alert(`Thanks for reporting this content. Report count: ${data.reportCount || 0}`);
        }

        if (feedPosts) {
          loadPosts();
        }
      } catch (error) {
        console.error("Report submit error:", error);
        alert(error.message || "Unable to submit report.");
      }
    });
  }
}

ensureReportSheetContent();

if (reportSheetBtn && reportSheet) {
  reportSheetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    ensureReportSheetContent();
    reportSheet.classList.add("show");
  });
}

const closeReportSheet = document.getElementById("closeReportSheet");
if (closeReportSheet && reportSheet) {
  closeReportSheet.addEventListener("click", () => {
    reportSheet.classList.remove("show");
  });
}

if (reportSheet) {
  let startY = 0, currentY = 0, isDragging = false;

  reportSheet.addEventListener("touchstart", (e) => {
    if (e.target.closest(".close-btn")) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  });

  reportSheet.addEventListener("touchmove", (e) => {
    if (!isDragging) return;

    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) reportSheet.style.bottom = `-${diff}px`;
  });

  reportSheet.addEventListener("touchend", () => {
    isDragging = false;

    const diff = currentY - startY;
    if (diff > 120) reportSheet.classList.remove("show");

    reportSheet.style.bottom = "0";
  });
}

