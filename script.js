const firebaseConfig = {
  apiKey: "AIzaSyBAnPo7WP5SeFoz-hSKWil6v0tWI1oUeCw",
  authDomain: "my-book-d3907.firebaseapp.com",
  projectId: "my-book-d3907",
  messagingSenderId: "376744576799",
  appId: "1:376744576799:web:f913314bbe68364f8b522a"
};

if (window.firebase && firebase.apps && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

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
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
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
    }

    body {
      background-color: var(--app-bg);
      color: var(--app-text);
      transition: background-color 0.2s ease, color 0.2s ease;
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

    body.dark-mode .sidemenu a,
    body.dark-mode .sidemenu .menu-settings-btn,
    body.dark-mode .theme-toggle-btn,
    body.dark-mode .menu-legal p,
    body.dark-mode .menu-auth-actions button,
    body.dark-mode .report-menu-label,
    body.dark-mode .report-menu-item,
    body.dark-mode .sidemenu-profile button,
    body.dark-mode .sidemenu-main a,
    body.dark-mode .sidemenu-main button {
      color: var(--menu-text);
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
      color: #ffffff !important;
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

    .theme-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      margin-top: 8px;
      padding: 10px 12px;
      border: 1px solid rgba(17, 17, 17, 0.08);
      border-radius: 14px;
      background: rgba(17, 17, 17, 0.04);
      color: #111111;
      cursor: pointer;
      text-align: left;
      font-size: 15px;
      font-weight: 600;
      transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    }

    .theme-toggle-btn:hover {
      transform: translateY(-1px);
    }

    .theme-toggle-label {
      flex: 1;
      color: inherit;
    }

    .theme-toggle-switch {
      position: relative;
      width: 46px;
      height: 26px;
      border-radius: 999px;
      background: rgba(17, 17, 17, 0.14);
      border: 1px solid rgba(17, 17, 17, 0.08);
      flex-shrink: 0;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .theme-toggle-knob {
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

    .theme-toggle-btn.is-dark {
      border-color: rgba(123, 92, 255, 0.45);
      background: rgba(123, 92, 255, 0.12);
    }

    .theme-toggle-btn.is-dark .theme-toggle-switch {
      background: linear-gradient(135deg, #8f7cff, #5c6cff);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .theme-toggle-btn.is-dark .theme-toggle-knob {
      transform: translateX(20px);
      background: #f7d14e;
    }

    body.dark-mode .theme-toggle-btn {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: #f3f4f6;
    }

    body.dark-mode .theme-toggle-switch {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.08);
    }

    body.dark-mode .theme-toggle-knob {
      background: #f5f5f5;
    }

    body.dark-mode .theme-toggle-btn.is-dark .theme-toggle-switch {
      background: linear-gradient(135deg, #8f7cff, #5c6cff);
    }
    
    body.dark-mode .feed-post-user-name,
body.dark-mode .side-menu-user-name-btn,
body.dark-mode #sideMenuUserName {
  color: #ffffff !important;
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
  const data = getCurrentUserProfileData(userId);
  const firstName = (data.firstName || "").trim();
  const lastName = (data.lastName || "").trim();
  const customName = [firstName, lastName].filter(Boolean).join(" ");

  if (customName) {
    sideMenuUserName.textContent = customName;
    return;
  }

  if (auth?.currentUser?.displayName) {
    sideMenuUserName.textContent = auth.currentUser.displayName;
    return;
  }

  if (auth?.currentUser?.email) {
    sideMenuUserName.textContent = auth.currentUser.email.split("@")[0];
    return;
  }

  sideMenuUserName.textContent = "User";
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

function saveCurrentUserProfileData(data, userId = getCurrentUserId()) {
  const currentData = getCurrentUserProfileData(userId);
  const merged = { ...currentData, ...data };
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

  fetch("/api/profile", {
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
    const response = await fetch("/api/profile", {
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

function renderUserNameWithVerification(displayName, userId = getCurrentUserId()) {
  const resolvedName = String(displayName || "User").trim() || "User";
  const verified = isUserVerified(userId);

  if (!verified) {
    return escapeHtml(resolvedName);
  }

  return `${escapeHtml(resolvedName)}${getVerifiedBadgeMarkup()}`;
}

function getDisplayNameForUser(userId = getCurrentUserId()) {
  const data = getCurrentUserProfileData(userId);
  const firstName = (data.firstName || "").trim();
  const lastName = (data.lastName || "").trim();
  const customDisplayName = [firstName, lastName].filter(Boolean).join(" ");

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

let count = 0;

function addNotification(message = "New simulated notification!") {
  if (!bubble || !notification) return;

  count++;

  if (count > 90) {
    bubble.textContent = "90+";
  } else {
    bubble.textContent = count;
  }

  bubble.style.display = "block";
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

if (bell && bubble) {
  bell.addEventListener("click", () => {
    count = 0;
    bubble.style.display = "none";
  });
}

if (bell || bubble || notification) {
  setInterval(() => {
    addNotification("Simulated booking alert!");
  }, 7000);
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
  return [searchSheet, writePostSheet, uploadSheet].filter(Boolean);
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
    noPosts: "No posts yet. Start the first post to get the conversation going.",
    openReels: "Open reels",
    commentsHeader: "Comments",
    noCommentsYet: "No comments yet.",
    uploadDescription: "Speak your mind or tag someone...",
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

function translateTextForCurrentLocale(text) {
  if (!text || !text.trim()) return text;

  const targetLang = getPreferredLanguage();
  if (!targetLang || targetLang === "en") return text;

  if (typeof window !== "undefined" && window.mlKitTranslate && typeof window.mlKitTranslate.translate === "function") {
    try {
      const translated = window.mlKitTranslate.translate(text, targetLang);
      if (translated && translated.trim()) return translated;
    } catch (error) {
      console.warn("ML Kit translation fallback failed:", error);
    }
  }

  const dictionary = LOCAL_CAPTION_TRANSLATIONS[targetLang] || {};
  const normalized = text.trim().toLowerCase();
  if (dictionary[normalized]) {
    return dictionary[normalized];
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const translatedWords = words.map((word) => dictionary[word] || word);
  const translated = translatedWords.join(" ");

  return translated === normalized ? text : translated;
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
      const response = await fetch("/api/profile-picture", {
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

function initializeMessagePage() {
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
  const pageHeader = document.querySelector(".header");
  const pageHeaderTitle = document.querySelector(".header-title");
  const pageHeaderIcons = document.querySelector(".header-icons");
  const pageHeaderBack = document.querySelector(".header-back-icon");

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
          if (userId && userId !== "guest") users.add(userId);
        }

        if (key.startsWith("bookme_display_name_")) {
          const userId = key.replace("bookme_display_name_", "");
          if (userId && userId !== "guest") users.add(userId);
        }
      });
    } catch (error) {
      console.warn("Unable to inspect local storage for message users:", error);
    }

    ["guest", "michael"].forEach((user) => {
      if (user) users.add(user);
    });

    return [...users];
  };

  const existingMessages = (() => {
    try {
      const raw = localStorage.getItem(sessionKey);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  })();

  const conversations = Object.fromEntries(
    getKnownUsers().map((user) => [
      user,
      Array.isArray(existingMessages[user]) ? existingMessages[user] : [
        user === currentUserId ? { text: "Hi there! How can I help?", mine: false } : null
      ].filter(Boolean)
    ])
  );

  if (!conversations[currentUserId]) {
    conversations[currentUserId] = [{ text: "Hi there! How can I help?", mine: false }];
  }

  if (!conversations.guest) {
    conversations.guest = [{ text: "Welcome back.", mine: false }];
  }

  if (!conversations.michael) {
    conversations.michael = [{ text: "Let me know when you are ready.", mine: false }];
  }

  let activeConversation = null;

  function getConversationAvatarMarkup(userKey) {
    let avatarUrl = null;

    if (typeof getProfilePicForUser === "function") {
      avatarUrl = getProfilePicForUser(userKey)
        || getProfilePicForUser(currentUserId)
        || (window.firebase && firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.photoURL)
        || null;
    }

    if (avatarUrl) {
      return `<span class="conversation-avatar"><img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${userKey} profile picture" /></span>`;
    }

    return `
      <span class="conversation-avatar">
        <span class="conversation-avatar-fallback"><i class="fa-solid fa-circle-user fa-lg" style="color: rgb(108, 108, 105);"></i></span>
      </span>
    `;
  }

  function syncView() {
    const isListOnly = !activeConversation;
    const isMobile = window.innerWidth <= 640;

    if (pageHeader) {
      pageHeader.style.display = isListOnly ? "block" : "none";
    }

    if (pageHeaderIcons) {
      pageHeaderIcons.style.display = isListOnly ? "flex" : "none";
    }

    if (pageHeaderBack) {
      pageHeaderBack.style.display = isListOnly ? "block" : "none";
    }

    if (pageHeaderTitle) {
      pageHeaderTitle.textContent = isListOnly ? "Chats" : ((typeof getDisplayNameForUser === "function" ? getDisplayNameForUser(activeConversation) : "") || activeConversation || "Conversation");
    }

    if (isListOnly) {
      conversationPanel.style.display = "block";
      conversationPanel.style.width = "100%";
      chatWindow.style.display = "none";
      if (chatBackBtn) {
        chatBackBtn.style.display = "none";
      }
      if (chatRecipientName) {
        chatRecipientName.textContent = "Select a conversation";
      }
      return;
    }

    conversationPanel.style.display = "none";
    chatWindow.style.display = "flex";
    chatWindow.style.width = "100%";

    if (chatBackBtn) {
      chatBackBtn.style.display = "block";
    }

    if (conversationPanel) {
      conversationPanel.style.width = "34%";
    }
  }

  function renderConversations() {
    const users = Object.keys(conversations);
    conversationList.innerHTML = users.map((user) => {
      const fallbackLabel = user === currentUserId ? currentUserDisplayName : (typeof getDisplayNameForUser === "function" ? getDisplayNameForUser(user) : user);
      const label = fallbackLabel || user;
      return `
        <button class="conversation-item ${user === activeConversation ? "active" : ""}" type="button" data-user="${user}">
          <span class="meta">
            ${getConversationAvatarMarkup(user)}
            <span>${label}</span>
          </span>
        </button>
      `;
    }).join("");

    conversationList.querySelectorAll(".conversation-item").forEach((button) => {
      button.addEventListener("click", () => {
        activeConversation = button.dataset.user;
        chatRecipientName.textContent = activeConversation;
        renderConversations();
        renderMessages();
        syncView();
        messageInput?.focus();
      });
    });
  }

  function renderMessages() {
    if (!activeConversation) {
      messageList.innerHTML = "";
      if (chatRecipientName) {
        chatRecipientName.textContent = "Select a conversation";
      }
      return;
    }

    const thread = conversations[activeConversation] || [];
    messageList.innerHTML = thread.map((entry) => `
      <div class="message-bubble ${entry.mine ? "mine" : ""}">${entry.text}</div>
    `).join("");

    if (chatRecipientName) {
      const label = (typeof getDisplayNameForUser === "function" ? getDisplayNameForUser(activeConversation) : "") || activeConversation;
      chatRecipientName.textContent = label;
    }
  }

  function appendMessage(text, isMine = false) {
    const thread = conversations[activeConversation] || [];
    thread.push({ text, mine: isMine });
    conversations[activeConversation] = thread;
    try {
      localStorage.setItem(sessionKey, JSON.stringify(conversations));
    } catch (error) {
      console.warn("Unable to save message thread:", error);
    }
    renderMessages();
  }

  if (messagePlusBtn && messageFooterMenu) {
    messagePlusBtn.addEventListener("click", () => {
      messageFooterMenu.classList.toggle("show");
    });
  }

  if (newMessageBtn && messageInput) {
    newMessageBtn.addEventListener("click", () => {
      messageFooterMenu.classList.remove("show");
      const user = prompt("Who would you like to message?", "guest");
      if (!user) return;

      if (!conversations[user]) {
        conversations[user] = [];
      }

      activeConversation = user;
      renderConversations();
      renderMessages();
      syncView();
      messageInput.focus();
    });
  }

  if (sendMessageBtn && messageInput) {
    sendMessageBtn.addEventListener("click", () => {
      const text = messageInput.value.trim();
      if (!text) return;

      appendMessage(text, true);
      messageInput.value = "";
      messageInput.focus();
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

  renderConversations();
  renderMessages();
  syncView();
  if (chatRecipientName) {
    chatRecipientName.textContent = "Select a conversation";
  }
  if (chatBackBtn) {
    chatBackBtn.style.display = "none";
  }
  if (pageHeaderTitle) {
    pageHeaderTitle.textContent = "Chats";
  }
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
        body: JSON.stringify({ user_id: currentUserId })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to update follow state.");
      }

      const followerCount = Number(data?.follower_count || 0);
      const isFollowing = Boolean(data?.isFollowing);

      followUserBtn.dataset.following = String(isFollowing);
      followUserBtn.setAttribute("aria-pressed", String(isFollowing));
      followUserBtn.innerHTML = `<i class="fa-solid ${isFollowing ? "fa-check" : "fa-plus"} fa-lg" style="color: rgb(0, 0, 0);"></i> ${isFollowing ? "Following" : "Follow"}${followerCount > 0 ? ` • ${followerCount}` : ""}`;

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

    const payload = {
      firstName: document.getElementById("firstNameInput")?.value || "",
      lastName: document.getElementById("lastNameInput")?.value || "",
      dob: document.getElementById("dobInput")?.value || "",
      email: document.getElementById("emailInput")?.value || ""
    };

    saveCurrentUserProfileData(payload);
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
        sideMenu.style.width = "350px";
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
            sideMenu.style.width = "250px";
          } else {
            sideMenu.style.width = "0";
          }
          return;
        }

        if (sideMenu.dataset.state === "open") {
          sideMenu.style.width = "250px";
          return;
        }

        sideMenu.style.width = "0";
    }

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

      const response = await fetch("/api/text-post", {
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
    submitCommentBtn.textContent = "Reply";
    commentInput.setAttribute("aria-label", `Reply to ${activeReplyCommentName}`);
  } else {
    commentInput.placeholder = "Write a comment...";
    submitCommentBtn.textContent = "Post";
    commentInput.setAttribute("aria-label", "Write a comment");
  }
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
  const isLiked = Boolean(existingState.liked);
  const repliedToThisComment = activeReplyCommentId === String(commentId);
  const indentStyle = depth > 0 ? `style="margin-left: ${Math.min(depth * 18, 36)}px;"` : "";

  const avatarMarkup = profilePic
    ? `<img src="${escapeHtml(profilePic)}" alt="${escapeHtml(author)} profile" class="comment-avatar-img" />`
    : `<span class="comment-avatar-fallback"><i class="fa-solid fa-circle-user fa-lg" style="color: rgb(108, 108, 105);"></i></span>`;

  const childReplies = Array.isArray(comment?.replies) && comment.replies.length
    ? `<div class="comment-replies">${comment.replies.map((child) => renderCommentNode(child, depth + 1)).join("")}</div>`
    : "";

  return `
    <div class="comment-thread ${depth > 0 ? "is-reply" : ""}" ${indentStyle}>
      <div class="comment-item ${repliedToThisComment ? "replying" : ""} ${depth > 0 ? "is-reply-item" : ""}" data-comment-id="${escapeHtml(commentId)}" data-author-name="${escapeHtml(author)}">
        <div class="comment-user-row">
          <div class="comment-avatar profile-avatar-trigger" data-user-id="${escapeHtml(authorId || getCurrentUserId())}">${avatarMarkup}</div>
          <div class="comment-user-meta profile-avatar-trigger" data-user-id="${escapeHtml(authorId || getCurrentUserId())}">
            <strong>${escapeHtml(author)}</strong>
            <span class="comment-date">${escapeHtml(formattedDate)}</span>
          </div>
        </div>
        <div class="comment-text">${escapeHtml(text)}</div>
        <div class="comment-action-row">
          <button type="button" class="comment-action-btn comment-like-btn ${isLiked ? "liked" : ""}" data-comment-id="${escapeHtml(commentId)}" data-like-count="${Number(baseLikeCount)}" aria-label="Like comment">
            <i class="${isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"}"></i>
            <span>${baseLikeCount}</span>
          </button>
          <button type="button" class="comment-action-btn comment-reply-btn" data-comment-id="${escapeHtml(commentId)}" data-author-name="${escapeHtml(author)}" aria-label="Reply to comment">
            <i class="fa-regular fa-comment"></i>
            <span>${baseReplyCount}</span>
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
        const authorName = commentItem.dataset.authorName || "this user";
        if (!commentId) return;

        if (activeReplyCommentId === String(commentId)) {
          clearCommentReplyMode();
          return;
        }

        setCommentReplyMode(commentId, authorName);
      });
    });

    commentsList.querySelectorAll(".comment-like-btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const commentId = button.dataset.commentId;
        if (!commentId) return;

        const currentState = getCommentLocalState(commentId);
        const currentLikeCount = Number(button.dataset.likeCount || currentState.likeCount || 0);
        const nextLiked = !currentState.liked;
        const nextLikeCount = Math.max(0, nextLiked ? currentLikeCount + 1 : currentLikeCount - 1);

        setCommentLocalState(commentId, {
          liked: nextLiked,
          likeCount: nextLikeCount,
          replyCount: currentState.replyCount || 0
        });

        const icon = button.querySelector("i");
        const count = button.querySelector("span");
        if (icon) {
          icon.className = nextLiked ? "fa-solid fa-heart" : "fa-regular fa-heart";
        }
        if (count) {
          count.textContent = String(nextLikeCount);
        }
        button.dataset.likeCount = String(nextLikeCount);
        button.classList.toggle("liked", nextLiked);
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
let textMenuHandlerBound = false;
let activeUserSheetFilter = "all";

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
    const response = await fetch("/api/posts");
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
  const itemsToRender = validPosts.slice(0, 8);

  if (!itemsToRender.length) {
    searchResults.innerHTML = "";
    return;
  }

  searchResults.innerHTML = itemsToRender.map(renderSearchCard).join("");
  bindProfileAvatarButtons(searchResults);
  searchResults.querySelectorAll(".search-post-card video").forEach((video) => {
    video.muted = true;
    video.autoplay = false;
    video.loop = true;
    video.playsInline = true;
  });
  searchResults.querySelectorAll(".search-post-card").forEach((card, index) => {
    const video = card.querySelector("video");
    if (video) {
      video.autoplay = index === 0;
    }
    const shell = card.closest(".video-shell") || card;
    if (shell) {
      shell.dataset.autoplay = String(index === 0);
    }
  });
}

function renderUserSearchCard(user = {}) {
  const userId = user?.user_id || user?.id || "";
  const displayName = (user?.name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User").trim();
  const avatarUrl = user?.profile_pic || getProfilePicForUser(userId);

  return `
    <button type="button" class="search-post-card search-user-result profile-avatar-trigger" data-user-id="${escapeHtml(String(userId))}" aria-label="Open ${escapeHtml(displayName)} profile">
      <div class="search-caption-row">
        <span class="search-user-avatar">${avatarUrl ? `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="${escapeHtml(displayName)} profile" />` : getDefaultUserAvatarMarkup({ size: 24, color: "rgb(108, 108, 105)" })}</span>
        <span class="search-caption">${renderUserNameWithVerification(displayName, userId)}</span>
      </div>
    </button>
  `;
}

async function runSearch(query = "") {
  if (!searchResults) return;

  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    try {
      const response = await fetch("/api/search?q=");
      if (!response.ok) {
        throw new Error("Failed to load default search results");
      }
      const data = await response.json();
      const posts = Array.isArray(data?.posts) ? data.posts : [];
      renderSearchSheet(posts);
      return;
    } catch (error) {
      console.warn("Default search render failed:", error);
      renderSearchSheet([]);
      return;
    }
  }

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
    if (!response.ok) {
      throw new Error("Search request failed");
    }

    const data = await response.json();
    const users = Array.isArray(data?.users) ? data.users : [];
    const posts = Array.isArray(data?.posts) ? data.posts : [];

    const userCards = users.slice(0, 8).map(renderUserSearchCard).join("");
    const postCards = posts.slice(0, 8).map(renderSearchCard).join("");
    const userListMarkup = userCards ? `<div class="search-user-results-list">${userCards}</div>` : "";
    const postGridMarkup = postCards ? `<div class="search-video-grid">${postCards}</div>` : "";
    const combinedCards = [userListMarkup, postGridMarkup].filter(Boolean).join("");

    if (!combinedCards) {
      searchResults.innerHTML = '<div class="search-empty-state">No people or posts found.</div>';
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

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      triggerSearchFromPage(event.target.value || "");
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        triggerSearchFromPage(searchInput.value || "");
      }
    });
  }

  if (searchPageButton && searchInput) {
    searchPageButton.addEventListener("click", () => {
      triggerSearchFromPage(searchInput.value || "");
    });
  }

  runSearch("");
}

// Load and render video reels
async function loadReels() {
  const reelsContainer = document.getElementById("reelsContainer");
  if (!reelsContainer) return;

  try {
    const response = await fetch("/api/posts");
    if (!response.ok) {
      throw new Error("Failed to load reels");
    }

    const posts = await response.json();
    const reelPosts = Array.isArray(posts)
      ? posts.filter((post) => getMediaTypeForPost(post) === "video")
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
      const ownerUserId = post?.user_id || getCurrentUserId();
      const avatarMarkup = getCurrentUserAvatarMarkup(ownerUserId);
      const displayName = getDisplayNameForUser(ownerUserId);
      const verifiedMarkup = renderUserNameWithVerification(displayName, ownerUserId);
      const truncatedCaption = caption.length > 90 ? `${caption.slice(0, 90)}...` : caption;
      const postId = post?.id || "";

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
            <button class="reel-action-btn like-btn" type="button" aria-label="Like reel">
              <i class="fa-solid fa-thumbs-up" style="color: rgba(242, 224, 22, 0.9);"></i>
            </button>
            <button class="reel-action-btn comment-btn" type="button" aria-label="Open comments" data-post-id="${postId}">
              <i class="fa-regular fa-comment" style="color: rgba(242, 224, 22, 0.9)"></i>
            </button>
            <button class="reel-action-btn comment-btn" type="button" aria-label="Open comments" data-post-id="${postId}">
             <i class="fa-regular fa-bookmark" style="color: rgb(123, 117, 117);"></i>
            </button>
            <button class="reel-action-btn menu-btn post-menu-toggle" type="button" aria-label="More options">
              <i class="fa-solid fa-ellipsis" style="color: rgba(242, 224, 22, 0.9);"></i>
            </button>
          </div>

          <div class="reel-overlay">
            <div class="reel-user-row">
              <div class="reel-user-avatar">
                ${avatarMarkup}
              </div>
              <div class="reel-user-name">${verifiedMarkup}</div>
            </div>
            <div class="reel-caption" data-full-text="${caption.replace(/"/g, '&quot;')}">
              <span class="reel-caption-text">${truncatedCaption}</span>
              ${caption.length > 90 ? '<button class="reel-read-more-btn" type="button">Read more</button>' : ""}
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
          const truncated = `${fullText.slice(0, 90).trim()}...`;
          text.textContent = truncated;
          button.textContent = "Read more";
          caption.classList.remove("expanded");
        } else {
          text.textContent = fullText;
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

if (document.getElementById("reelsContainer")) {
  loadReels();
}

if (document.getElementById("searchResults")) {
  loadPosts();
}

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

function resetUploadForm() {
  if (mediaInput) mediaInput.value = "";
  if (uploadDescription) uploadDescription.value = "";
  if (previewContainer) previewContainer.innerHTML = "";
}

function handleMediaSelection() {
  if (!mediaInput || !previewContainer) return;

  const files = Array.from(mediaInput.files || []);

  if (!files.length) {
    previewContainer.innerHTML = "";
    return;
  }

  previewContainer.innerHTML = files
    .map(file => {
      const objectUrl = URL.createObjectURL(file);

      if (file.type.startsWith("image/")) {
        return `
          <div class="preview-item image-preview">
            <img src="${objectUrl}" alt="${file.name}" />
          </div>
        `;
      }

      if (file.type.startsWith("video/")) {
        return `
          <div class="preview-item video-preview video-shell">
            <video src="${objectUrl}" muted loop playsinline></video>
          </div>
        `;
      }

      return `<div class="preview-item file-preview"></div>`;
    })
    .join("");

  previewContainer.querySelectorAll(".video-shell").forEach(bindVideoControls);
}

async function submitUploadedFiles() {
  if (!mediaInput) {
    alert("Please choose a file first.");
    return;
  }

  const files = Array.from(mediaInput.files || []);
  if (!files.length) {
    alert("Please choose a file first.");
    return;
  }

  const description = uploadDescription ? uploadDescription.value.trim() : "";
  const caption = description;

  const formData = new FormData();
  const currentUserId = getCurrentUserId();
  files.forEach((file) => {
    formData.append("file", file);
  });
  formData.append("content", caption);
  formData.append("user_id", currentUserId);

  try {
    if (submitFilesBtn) {
      submitFilesBtn.disabled = true;
      submitFilesBtn.innerHTML = '<i class="fa-solid fa-circle-arrow-right fa-lg" style="color: rgb(255, 255, 255);"></i>';
    }

    const response = await fetch("/api/posts", {
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
    alert(`Upload successful: ${label}`);

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
    video.play().catch(() => {});
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

function getCacheBustedImageUrl(url) {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
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
    followUserBtn.innerHTML = `<i class="fa-solid ${isFollowing ? "fa-check" : "fa-plus"} fa-lg" style="color: rgb(0, 0, 0);"></i> ${isFollowing ? "Following" : "Follow"}${followerCount > 0 ? ` • ${followerCount}` : ""}`;

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
  const caption = content && !isLikelyNumericCaption && !isLikelyFilenameCaption ? translatedContent : "";
  const isVideo = isVideoMediaUrl(mediaUrl);
  const isGallery = mediaList.length > 1;
  const isTextOnly = !mediaUrl && !!caption;
  const ownerUserId = post?.user_id || getCurrentUserId();
  const displayName = getDisplayNameForUser(ownerUserId) || "User";
  const postDateLabel = formatPostDateLabel(post?.created_at);
  const isOwner = Boolean(post?.user_id) && String(post.user_id) === String(getCurrentUserId());
  const likeCount = Number(post?.likes_count ?? post?.like_count ?? 0);
  const commentCount = Number(post?.comment_count ?? post?.comments_count ?? post?.commentCount ?? 0);
  const isLikedByCurrentUser = Boolean(post?.liked_by_current_user || post?.liked === true);
  const captionPreviewLimit = 80;

  const renderCaptionMarkup = (text) => {
    if (!text) return "";

    const normalizedText = String(text)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");

    const encodeHtml = (value) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/\n/g, "<br>");

    const encodeAttribute = (value) => value
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const captionPreviewLimit = 90;
    const isLongCaption = normalizedText.length > captionPreviewLimit;
    const previewText = isLongCaption ? `${normalizedText.slice(0, captionPreviewLimit).trim()}...` : normalizedText;
    const safeText = encodeHtml(previewText);
    const fullTextAttr = encodeAttribute(normalizedText);

    return `
      <div class="feed-caption" data-full-text="${fullTextAttr}">
        <span class="feed-caption-text">${safeText}</span>
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
  const mediaWrap = hasVideoMedia && post?.id ? `<a href="${openReelUrl}" class="video-open-link" aria-label="${openReelLabel}" data-post-id="${post?.id || ""}">${mediaMarkup}</a>` : mediaMarkup;
  const isOwnPost = Boolean(post?.user_id) && String(post.user_id) === String(getCurrentUserId());
  const reportButtonMarkup = !isOwnPost ? `
    <button class="post-report-btn" type="button" data-post-id="${post?.id || ""}" data-action="report">
      <i class="fa-solid fa-flag fa-lg" style="color: rgb(109, 108, 111);"></i> Report this content
      
    </button>
    <button class="see-more-like-this" type="button" data-post-id="${post?.id || ""}" data-action="see-more-like-this">
      <i class="fa-solid fa-star" style="color: rgb(1, 1, 1);"></i> See more like this
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
      ${renderCaptionMarkup(caption)}
      ${mediaWrap}

      <div class="feed-actions actions">

      <button class="like-btn" type="button" data-post-id="${post?.id || ""}" data-liked="${isLikedByCurrentUser ? "true" : "false"}">
          <i class="${isLikedByCurrentUser ? "fa-solid fa-heart" : "fa-regular fa-heart"} fa-xl" style="color: ${isLikedByCurrentUser ? "rgb(255, 93, 93)" : "rgb(50, 50, 49)"};"></i>
          <span class="like-count">${likeCount}</span>
        </button>
        

        

      

        <button class="comment-btn" type="button" aria-label="Open comments" data-post-id="${post?.id || ""}">
          <i class="fa-regular fa-comments fa-xl" style="color: rgb(76, 76, 76);"></i>
          <span class="comment-count">${commentCount}</span>
        </button>

        <i class="fa-regular fa-bookmark" style="color: rgb(123, 117, 117);"></i>

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
    const url = currentUserId && currentUserId !== "guest"
      ? `/api/posts?user_id=${encodeURIComponent(currentUserId)}`
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
      const visiblePosts = validPosts.filter((post) => !Boolean(post.is_flagged) && Number(post.report_count || 0) < 10);

      if (!visiblePosts.length) {
        feedPosts.innerHTML = '<div class="feed-empty-state">No posts yet. Start the first post to get the conversation going.</div>';
        renderSearchSheet([]);
        applyTranslations(getPreferredLanguage());
        return;
      }

      feedPosts.innerHTML = visiblePosts.map(renderFeedPost).join("");
      unwrapThreadWrappers();
      bindReadMoreButtons();
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

    const commentText = commentInput.value.trim();
    if (!commentText) {
      return;
    }

    const postId = activeCommentsPostId;
    if (!postId) {
      return;
    }

    try {
      submitCommentBtn.disabled = true;
      submitCommentBtn.textContent = activeReplyCommentId ? "Replying..." : "Posting...";

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          post_id: Number(postId),
          user_id: getCurrentUserId(),
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
        clearCommentReplyMode();
      }

      const commentCountBadge = document.querySelector(`.comment-btn[data-post-id="${CSS.escape(String(postId))}"] .comment-count`);
      if (commentCountBadge) {
        const currentCount = Number(commentCountBadge.textContent.trim()) || 0;
        commentCountBadge.textContent = String(currentCount + 1);
      }

      if (Array.isArray(window.__feedPostsCache)) {
        const cachedPost = window.__feedPostsCache.find((post) => String(post.id) === String(postId));
        if (cachedPost) {
          const newValue = Number(cachedPost.comment_count || cachedPost.comments_count || 0) + 1;
          cachedPost.comment_count = newValue;
          cachedPost.comments_count = newValue;
        }
      }

      commentInput.value = "";
      if (feedPosts) {
        await loadPosts();
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
  loadPosts();

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
          body: JSON.stringify({ user_id: currentUserId })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Unable to update like.");
        }

        const icon = likeButton.querySelector("i");
        const countEl = likeButton.querySelector(".like-count");
        const isLiked = Boolean(data?.liked);
        if (icon) {
          icon.className = isLiked ? "fa-solid fa-heart fa-xl" : "fa-regular fa-heart fa-xl";
          icon.style.color = isLiked ? "rgb(255, 93, 93)" : "rgb(101, 101, 100)";
        }
        if (countEl) {
          countEl.textContent = String(data?.likeCount ?? 0);
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

