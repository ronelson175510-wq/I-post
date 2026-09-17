const firebaseConfig = {
  apiKey: "AIzaSyBAnPo7WP5SeFoz-hSKWil6v0tWI1oUeCw",
  authDomain: "my-book-d3907.firebaseapp.com",
  projectId: "my-book-d3907",
  storageBucket: "my-book-d3907.firebasestorage.app",
  messagingSenderId: "376744576799",
  appId: "1:376744576799:web:f913314bbe68364f8b522a",
  measurementId: "G-M8PGSMBP97"
};

if (window.firebase && firebase.apps && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const auth = window.firebase ? firebase.auth() : null;
const signOutBtn = document.querySelector(".sign-out-btn");
const sideMenuProfileBtn = document.getElementById("sideMenuProfileBtn");
const sideMenuUserNameBtn = document.getElementById("sideMenuUserNameBtn");
const sideMenuProfileAvatar = document.getElementById("sideMenuProfileAvatar");
const sideMenuUserName = document.getElementById("sideMenuUserName");

function updateSideMenuProfileAvatar() {
  if (!sideMenuProfileAvatar) return;

  const avatarUrl = getProfilePicForUser(getCurrentUserId());

  if (avatarUrl) {
    sideMenuProfileAvatar.innerHTML = `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="Profile picture" />`;
    return;
  }

  sideMenuProfileAvatar.innerHTML = '<i class="fa-solid fa-circle-user" style="color: rgb(177, 151, 252);"></i>';
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
        profilePicBtn.innerHTML = '<i class="fa-solid fa-circle-user" style="color: rgb(177, 151, 252);"></i>';
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
  return merged;
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

  if (userId && userId !== "guest") {
    const storedName = localStorage.getItem(`bookme_display_name_${userId}`);
    if (storedName) {
      return storedName;
    }
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

  if (customDisplayName) {
    profileNameDisplay.textContent = customDisplayName;
    return;
  }

  if (auth?.currentUser?.displayName) {
    profileNameDisplay.textContent = auth.currentUser.displayName;
    return;
  }

  if (auth?.currentUser?.email) {
    profileNameDisplay.textContent = auth.currentUser.email.split("@")[0];
    return;
  }

  profileNameDisplay.textContent = "User";
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

if (headerBrandLink) {
  headerBrandLink.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.href = "message.html";
  });
}

if (searchBtn && searchSheet) {
  searchBtn.addEventListener("click", () => {
    searchSheet.classList.add("show");
  });
}

if (closeSearchSheet && searchSheet) {
  closeSearchSheet.addEventListener("click", () => {
    searchSheet.classList.remove("show");
  });
}

if (searchSheet) {
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#searchSheet") && !e.target.closest("#searchBtn")) {
      searchSheet.classList.remove("show");
    }
  });
}

let searchStartY = 0, searchCurrentY = 0, searchIsDragging = false;

if (searchSheet) {
  searchSheet.addEventListener("touchstart", (e) => {
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
const PROFILE_PIC_KEY = "bookme_profile_pic";
const LANGUAGE_KEY = "bookme_language";

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
    submit: "Submit",
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
    report: "Signaler",
    friends: "Amis",
    chat: "Chat",
    signOut: "Se déconnecter",
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

function getPreferredLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return Object.prototype.hasOwnProperty.call(TRANSLATIONS, saved) ? saved : "en";
}

function applyTranslations(lang = getPreferredLanguage()) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const languageSelect = document.getElementById("languageSelect");

  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const value = dict[key] || TRANSLATIONS.en[key];
    if (value) {
      element.textContent = value;
    }
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

    profilePicBtn.innerHTML = '<i class="fa-solid fa-circle-user" style="color: rgb(177, 151, 252);"></i>';
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
        <span class="conversation-avatar-fallback"><i class="fa-solid fa-circle-user"></i></span>
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
        sideMenu.style.width = "250px";
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

    writePostSheet.classList.add("show");
  });
}

if (closeWritePostSheet && writePostSheet) {
  closeWritePostSheet.addEventListener("click", () => {
    writePostSheet.classList.remove("show");
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

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadCommentsForCurrentPost() {
  if (!commentsList) return;

  if (!activeCommentsPostId) {
    commentsList.innerHTML = '<div class="comment-empty">No comments yet.</div>';
    return;
  }

  try {
    commentsList.innerHTML = '<div class="comment-empty">Loading comments...</div>';
    const response = await fetch(`/api/comments/${encodeURIComponent(activeCommentsPostId)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Unable to load comments.");
    }

    const comments = Array.isArray(data.comments) ? data.comments : [];
    if (!comments.length) {
      commentsList.innerHTML = '<div class="comment-empty">No comments yet.</div>';
      return;
    }

    commentsList.innerHTML = comments
      .map((comment) => {
        const author = comment?.user_name || "User";
        const text = comment?.comment || "";
        return `
          <div class="comment-item">
            <strong>${escapeHtml(author)}</strong>
            <div>${escapeHtml(text)}</div>
          </div>
        `;
      })
      .join("");
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

  if (mediaType === "text") {
    const isOwner = String(post?.user_id || "") === String(getCurrentUserId());
    const menuMarkup = isOwner ? `
      <div class="post-menu-wrapper user-sheet-post-menu-wrapper">
        <div class="post-menu">
          <button class="post-menu-toggle" type="button" aria-label="More options">⋮</button>
          <div class="post-menu-options">
            <button class="post-delete-btn delete-post-btn" type="button" data-post-id="${post?.id || ""}" data-action="delete"><i class="fa-solid fa-trash fa-lg" style="color: rgb(109, 108, 111);"></i> Delete</button>
          </div>
        </div>
      </div>
    ` : "";

    return `
      <div class="user-sheet-post-card user-sheet-text-card" data-post-id="${post?.id || ""}">
        ${menuMarkup}
        <i class="fa-solid fa-pen-clip user-sheet-text-icon" style="color: rgb(0, 0, 0);"></i>
        <div class="user-sheet-text-content">${textContent || "Text post"}</div>
      </div>
    `;
  }

  if (!mediaUrl || (mediaType !== "video" && mediaType !== "image")) {
    return "";
  }

  const isVideo = mediaType === "video";
  const isOwner = String(post?.user_id || "") === String(getCurrentUserId());
  const menuMarkup = isOwner ? `
    <div class="post-menu-wrapper user-sheet-post-menu-wrapper">
      <div class="post-menu">
        <button class="post-menu-toggle" type="button" aria-label="More options">⋮</button>
        <div class="post-menu-options">
          <button class="post-delete-btn delete-post-btn" type="button" data-post-id="${post?.id || ""}" data-action="delete"><i class="fa-solid fa-trash fa-lg" style="color: rgb(109, 108, 111);"></i> Delete</button>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="user-sheet-post-card" data-post-id="${post?.id || ""}">
      ${menuMarkup}
      ${isVideo ? `
        <div class="user-sheet-media-wrap">
          <i class="fa-solid fa-circle-play fa-sm" style="color: rgb(255, 255, 255);"></i>
          <video src="${mediaUrl}" autoplay muted loop playsinline></video>
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
      ? posts.filter((post) => String(post.user_id) === String(userId))
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
    userSheetPosts.querySelectorAll("video").forEach((video) => {
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {});
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
      <video src="${mediaUrl}" autoplay muted loop playsinline preload="metadata"></video>
      <div class="search-caption-row">
        <button type="button" class="search-user-avatar profile-avatar-trigger" data-user-id="${ownerUserId}" aria-label="View profile">
          ${getCurrentUserAvatarMarkup(ownerUserId)}
        </button>
        <div class="search-caption">${displayName}</div>
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
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(() => {});
  });
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
      const truncatedCaption = caption.length > 90 ? `${caption.slice(0, 90)}...` : caption;
      const postId = post?.id || "";

      return `
        <div class="reel-item" data-post-id="${postId}">
          <div class="video-shell" data-post-id="${postId}">
            <video src="${videoUrl}" autoplay muted loop playsinline preload="auto"></video>
            <button class="video-toggle" type="button" aria-label="Play video">▶</button>
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
             <i class="fa-regular fa-bookmark" style="color: rgba(242, 224, 22, 0.9);"></i>
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
              <div class="reel-user-name">${displayName}</div>
            </div>
            <div class="reel-caption" data-full-text="${caption.replace(/"/g, '&quot;')}">
              <span class="reel-caption-text">${truncatedCaption}</span>
              ${caption.length > 90 ? '<button class="reel-read-more-btn" type="button">Read more</button>' : ""}
            </div>
          </div>
        </div>
      `;
    }).join("");

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
          text.textContent = `${fullText.slice(0, 90)}...`;
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
            <video src="${objectUrl}" autoplay muted loop playsinline></video>
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
      submitFilesBtn.textContent = "Uploading...";
    }

    const response = await fetch("/api/posts", {
      method: "POST",
      body: formData
    });

    const responseText = await response.text();
    let data = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      console.error("Upload response was not valid JSON:", responseText.slice(0, 250));
      throw new Error("Upload failed: the server returned an invalid response.");
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
      submitFilesBtn.textContent = "Submit";
    }
  }
}

if (uploadMediaBtn && uploadSheet) {
  uploadMediaBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    if (footerIconMenu) {
      footerIconMenu.classList.remove("show");
    }

    uploadSheet.classList.add("show");

    if (mediaInput) {
      mediaInput.click();
    }
  });
}

if (closeUploadSheet && uploadSheet) {
  closeUploadSheet.addEventListener("click", () => {
    uploadSheet.classList.remove("show");
    resetUploadForm();
  });
}

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
  const timer = videoShell.querySelector(".video-timer");
  const progressTrack = videoShell.querySelector(".video-progress");

  if (!video || !toggleBtn) return;

  video.muted = true;
  video.volume = 0;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;

  const progressBar = videoShell.querySelector(".video-progress-bar");

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
    toggleBtn.textContent = "❚❚";
  });
  video.addEventListener("pause", () => {
    toggleBtn.textContent = "▶";
  });

  toggleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    video.muted = false;
    video.volume = 1;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  syncTimer();
  video.play().catch(() => {});
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
    const counter = gallery.querySelector(".gallery-counter");
    if (counter) {
      counter.textContent = `${currentIndex + 1}/${slides.length}`;
    }
  };

  const prevBtn = gallery.querySelector(".gallery-prev");
  const nextBtn = gallery.querySelector(".gallery-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      updateGallery(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      updateGallery(currentIndex + 1);
    });
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

function getCacheBustedImageUrl(url) {
  if (!url) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function getCurrentUserAvatarMarkup(userId = getCurrentUserId()) {
  const avatarUrl = getProfilePicForUser(userId);

  if (avatarUrl) {
    return `<img src="${getCacheBustedImageUrl(avatarUrl)}" alt="Profile picture" />`;
  }

  return '<i class="fa-solid fa-circle-user" style="color: rgb(177, 151, 252);"></i>';
}

function formatPostDateLabel(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return "Today";
  }

  if (diffHours < 48) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function openUserProfileSheet(userId = getCurrentUserId()) {
  const targetUserId = userId || getCurrentUserId();
  const profileImage = getProfilePicForUser(targetUserId) || (auth?.currentUser?.uid === targetUserId ? auth.currentUser.photoURL : null);

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
  const readMoreText = dict.readMore || "Read more";
  const readLessText = dict.readLess || "Read less";
  const translateText = dict.translate || "Translate";
  const videoText = dict.video || "Video";
  const originalName = (post?.original_name || post?.saved_filename || "Uploaded file").replace(/\.[^/.]+$/, "");
  const content = (post?.content || "").trim();
  const normalizedContent = content.replace(/\.[^/.]+$/, "");
  const isLikelyNumericCaption = /^\d+$/.test(content);
  const isLikelyFilenameCaption = Boolean(content) && (
    normalizedContent === originalName ||
    /^(IMG|VID|VIDEO|PHOTO|PXL|Screenshot|Screenshot_)/i.test(content) ||
    /^[A-Za-z0-9_\-() ]{3,80}$/.test(content) && /(?:IMG|VID|PHOTO|PXL|Screenshot|DCIM|image|video)/i.test(content)
  );
  const caption = content && !isLikelyNumericCaption && !isLikelyFilenameCaption ? content : "";
  const isVideo = isVideoMediaUrl(mediaUrl);
  const isGallery = mediaList.length > 1;
  const isTextOnly = !mediaUrl && !!caption;
  const ownerUserId = post?.user_id || getCurrentUserId();
  const displayName = getDisplayNameForUser(ownerUserId) || "User";
  const postDateLabel = formatPostDateLabel(post?.created_at);
  const isOwner = Boolean(post?.user_id) && String(post.user_id) === String(getCurrentUserId());
  const captionPreviewLimit = 80;

  const renderCaptionMarkup = (text) => {
    if (!text) return "";

    const encodeHtml = (value) => value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/\n/g, "<br>");

    const safeText = encodeHtml(text);
    const shouldTruncate = text.length > captionPreviewLimit || text.includes("\n");
    if (!shouldTruncate) {
      return `<p class="feed-caption-text">${safeText}</p>`;
    }

    const previewText = `${text.slice(0, captionPreviewLimit).trim()}...`;
    const safePreview = encodeHtml(previewText).replace(/<br>/g, " ");
    return `
      <div class="feed-caption" data-full-text="${encodeHtml(text).replace(/<br>/g, "\n")}">
        <span class="feed-caption-text">${safePreview}</span>
        <button class="feed-read-more-btn" type="button">${readMoreText}</button>
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
                  <video src="${url}" autoplay muted loop playsinline ${index === 0 ? "" : "preload=metadata"}></video>
                  <button class="video-toggle" type="button" aria-label="Play video">▶</button>
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
        <video src="${mediaUrl}" autoplay muted loop playsinline></video>
        <button class="video-toggle" type="button" aria-label="Play video">▶</button>
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
  const menuMarkup = isOwner ? `
    <div class="post-menu-wrapper">
      <div class="post-menu">
        <button class="post-menu-toggle" type="button" aria-label="More options">⋮</button>
        <div class="post-menu-options">
          <button class="post-delete-btn" type="button" data-post-id="${post?.id || ""}"><i class="fa-solid fa-flag fa-lg" style="color: rgb(109, 108, 111);"></i> Report</button>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div class="post-thread">
      <div class="feed-post-card ${isTextOnly ? "text-only-post" : ""}" data-post-id="${post?.id || ""}">
        ${menuMarkup}
        <div class="feed-post-header">
          <button type="button" class="post-avatar-bubble profile-avatar-trigger feed-header-avatar" data-user-id="${ownerUserId}" aria-label="View profile">
            ${getCurrentUserAvatarMarkup(ownerUserId)}
          </button>
          <div class="feed-post-user-block">
            <button type="button" class="feed-post-user profile-avatar-trigger" data-user-id="${ownerUserId}" aria-label="View ${displayName}'s profile">
              <span class="feed-post-user-name">${displayName}</span>
            </button>
            ${postDateLabel ? `<span class="feed-post-date">${postDateLabel}</span>` : ""}
          </div>
        </div>
        ${renderCaptionMarkup(caption)}
        ${mediaWrap}

        <div class="feed-actions actions">
          <div class="lang-wrapper">
            <button class="translate-btn" type="button">
              <span class="translate-label">${translateText}</span><i class="fa-solid fa-language" style="color: rgb(244, 228, 136);"></i>
            </button>
          </div>

         <i class="fa-solid fa-bookmark fa-lg" style="color: rgb(109, 106, 106);"></i>

          <button class="comment-btn" type="button" aria-label="Open comments" data-post-id="${post?.id || ""}">
            <i class="fa-regular fa-comments fa-xl" style="color: rgb(76, 76, 76);"></i>
          </button>

          <button class="like-btn" type="button">
            <i class="fa-solid fa-thumbs-up fa-lg" style="color: rgb(9, 9, 9);"></i>
            <i class="fa-solid fa-thumbs-down fa-lg" style="color: rgb(12, 12, 12);"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function bindReadMoreButtons() {
  document.querySelectorAll(".feed-read-more-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const caption = button.closest(".feed-caption");
      const text = caption?.querySelector(".feed-caption-text");
      if (!caption || !text) return;

      const langDict = TRANSLATIONS[getPreferredLanguage()] || TRANSLATIONS.en;
      const fullText = caption.dataset.fullText || text.textContent || "";
      const isExpanded = caption.classList.contains("expanded");
      const previewLimit = 80;

      if (isExpanded) {
        text.textContent = `${fullText.slice(0, previewLimit).trim()}...`;
        button.textContent = langDict.readMore || "Read more";
        caption.classList.remove("expanded");
      } else {
        text.textContent = fullText;
        button.textContent = langDict.readLess || "Read less";
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

  document.querySelectorAll(".text-post-delete-btn, .post-delete-btn").forEach(button => {
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
        reportSheet.classList.add("show");
      }
    });
  });
}

async function loadPosts() {
  try {
    const response = await fetch("/api/posts");
    if (!response.ok) {
      throw new Error("Failed to load posts");
    }

    const posts = await response.json();
    const validPosts = Array.isArray(posts) ? posts : [];

    if (feedPosts) {
      if (!validPosts.length) {
        feedPosts.innerHTML = '<div class="feed-empty-state">No posts yet. Start the first post to get the conversation going.</div>';
        renderSearchSheet([]);
        applyTranslations(getPreferredLanguage());
        return;
      }

      feedPosts.innerHTML = validPosts.map(renderFeedPost).join("");
      bindReadMoreButtons();
      bindProfileAvatarButtons(feedPosts);
      feedPosts.querySelectorAll(".video-shell video").forEach((video) => {
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.play().catch(() => {});
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
      submitCommentBtn.textContent = "Posting...";

      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: Number(postId),
          user_id: getCurrentUserId(),
          content: commentText
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Unable to add comment.");
      }

      commentInput.value = "";
      await loadCommentsForCurrentPost();
    } catch (error) {
      console.error("Comment submit error:", error);
      alert(error.message || "Unable to add comment.");
    } finally {
      submitCommentBtn.disabled = false;
      submitCommentBtn.textContent = "Post";
    }
  });
}

if (feedPosts) {
  loadPosts();

  feedPosts.addEventListener("click", (event) => {
    const commentButton = event.target.closest(".comment-btn");
    if (commentButton) {
      event.stopPropagation();
      openCommentsSheet(commentButton.dataset.postId || "");
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
const closeReportSheet = document.getElementById("closeReportSheet");

if (reportSheetBtn && reportSheet) {
  reportSheetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    reportSheet.classList.add("show");
  });
}

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

