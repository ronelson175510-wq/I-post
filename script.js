// notification.js
const bell = document.getElementById("notifyBell");
const bubble = document.getElementById("notifyCount");

let count = 0;

function addNotification() {
  if (!bubble) return;

  count++;

  if (count > 90) {
    bubble.textContent = "90+";
  } else {
    bubble.textContent = count;
  }

  bubble.style.display = "block";
}

if (bell && bubble) {
  bell.addEventListener("click", () => {
    count = 0;
    bubble.style.display = "none";
  });
}

if (bell || bubble) {
  setInterval(() => {
    addNotification();
  }, 7000);
}

// search.js
const searchBtn = document.getElementById("searchBtn");
const searchSheet = document.getElementById("searchSheet");
const closeSearchSheet = document.getElementById("closeSearchSheet");

if (searchBtn && searchSheet) {
  searchBtn.addEventListener("click", () => {
    searchSheet.classList.add("show");
  });
}

if (closeSearchSheet && searchSheet) {
  closeSearchSheet.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (e.target.closest(".close-btn")) return;
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

const searchInput = document.getElementById("searchInput");
const placeholderTexts = [
  "search for users...",
  "search for contents...",
  "search your favorite subjects...",
];

let pIndex = 0;
let charIndex = 0;

if (searchInput) {
  function typePlaceholder() {
    const current = placeholderTexts[pIndex];
    const partial = current.substring(0, charIndex);

    searchInput.setAttribute("placeholder", partial);
    charIndex++;

    if (charIndex <= current.length) {
      setTimeout(typePlaceholder, 80);
    } else {
      setTimeout(() => {
        charIndex = 0;
        pIndex = (pIndex + 1) % placeholderTexts.length;
        typePlaceholder();
      }, 1200);
    }
  }

  typePlaceholder();
}

//side menu js
  function openNav() {
        document.getElementById("mysidemenu").style.width = "250px";
    }

    function closeNav() {
        document.getElementById("mysidemenu").style.width = "0";
    }

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

// language js
const langBtn = document.getElementById("langBtn");
const langDropdown = document.getElementById("langDropdown");

if (langBtn && langDropdown) {
  langBtn.addEventListener("click", () => {
    langDropdown.style.display = langDropdown.style.display === "block" ? "none" : "block";
  });

  langDropdown.querySelectorAll("div").forEach(item => {
    item.addEventListener("click", () => {
      const selectedLang = item.dataset.lang;
      console.log("Selected language:", selectedLang);
      langDropdown.style.display = "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
      langDropdown.style.display = "none";
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
  closeWritePostSheet.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    writePostSheet.classList.remove("show");
  });
}

// Drag-to-close
let postStartY = 0, postCurrentY = 0, postIsDragging = false;

if (writePostSheet) {
  writePostSheet.addEventListener("touchstart", (e) => {
    if (e.target.closest(".close-btn")) return;
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
  postSubmitBtn.addEventListener("click", () => {
    const text = postTextArea.value.trim();
    if (text === "") return;

    alert("Post submitted: " + text); // Replace with your own posting logic

    postTextArea.value = "";
    writePostSheet.classList.remove("show");
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

//ai sheet js//


const aiBtn = document.getElementById("aiBtn");
const aiSheet = document.getElementById("aiSheet");
const closeAiSheet = document.getElementById("closeAiSheet");
const aiSummaryResult = document.getElementById("aiSummaryResult");

function reduceRepeatedSummaryPhrases(text) {
  if (!text) return "";

  return text
    .replace(/\breaders people\b/gi, 'readers')
    .replace(/(the author(?:'s)? favorite sport)\s+(?:the author(?:'s)? favorite sport\s+)+/gi, '$1 ')
    .replace(/(the author(?:'s)? favorite sport)\s+the author would like to introduce readers to\s+/gi, '$1, which the author would like to introduce readers to ')
    .replace(/(the author(?:'s)? favorite sport)\s+the author has been playing it since\b/gi, '$1, and the author has been playing it since')
    .replace(/\bthe author was a child\b/gi, 'childhood')
    .replace(/\bit has always been the author's favorite way\b/gi, 'it has always remained the author\'s favorite pastime')
    .replace(/\bthe author(?:'s)? main focus is\b/gi, 'the content focuses on')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

function normalizeSentenceForSummary(sentence) {
  let result = sentence
    .replace(/\s+/g, ' ')
    .replace(/"/g, '')
    .replace(/^\s*(well|so|basically|actually|just)\s*[,;:-]*\s*/i, '')
    .replace(/\bI\s*[- ]\s*post\b/gi, 'the platform')
    .replace(/\bI\s*post\b/gi, 'the platform')
    .replace(/\bI\b(?!\s*[-])/gi, 'the author')
    .replace(/\bme\b/gi, 'the author')
    .replace(/\bmy\b/gi, 'the author\'s')
    .replace(/\bwe\b/gi, 'the community')
    .replace(/\byou\b/gi, 'readers')
    .replace(/\by\'all\b/gi, 'the community')
    .replace(/\bwell\b/gi, '')
    .replace(/\btherefore\b/gi, '')
    .replace(/\bjust\b/gi, '')
    .replace(/\bpretty\b/gi, 'quite')
    .replace(/\bkind of\b/gi, 'somewhat')
    .replace(/\bcreated\s+(this|a|the)\s+platform\s+called\s+.*$/gi, 'created a platform for sharing ideas and discussion')
    .replace(/\bcalled\s+['\"]?[A-Za-z0-9-]+['\"]?/gi, 'created as a platform')
    .replace(/\bnamed\s+['\"]?[A-Za-z0-9-]+['\"]?/gi, 'developed as a platform')
    .replace(/\bthis\s+platform\b/gi, 'a platform')
    .replace(/\bthe\s+platform\s+for\s+sharing\s+ideas\s+and\s+discussion\b/gi, 'a platform for sharing ideas and discussion')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/(^|[.!?]\s+)[,;:-]+\s*/g, '$1')
    .trim();

  if (!result) return result;

  return result.charAt(0).toUpperCase() + result.slice(1);
}

function trimSummaryToWholeWords(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text ? text.trim() : "";
  }

  const trimmed = text.slice(0, maxLength).trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\s+[A-Za-z0-9-]+$/, '').trim();
}

function finalizeSummaryText(text) {
  if (!text) return "";

  let result = reduceRepeatedSummaryPhrases(
    text
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/\bThe author have\b/gi, 'The author has')
      .replace(/\bthe author have\b/gi, 'the author has')
      .replace(/\bI\s+have\b/gi, 'the author has')
      .trim()
  );

  const sentences = result.match(/[^.!?]+[.!?]?/g) || [result];
  const cleaned = sentences
    .map(sentence => sentence.trim())
    .filter(Boolean)
    .map((sentence, index) => {
      const trimmed = sentence.replace(/^[\s\-]+|[\s\-]+$/g, '');
      if (!trimmed) return "";

      const sentenceText = trimmed.replace(/\s+/g, ' ');
      const firstLetter = sentenceText.charAt(0);
      const rest = sentenceText.slice(1);
      const normalized = `${firstLetter.toUpperCase()}${rest.toLowerCase()}`;

      return index === 0 ? normalized : normalized.replace(/^\s*[A-Z]/, match => match.toUpperCase());
    })
    .filter(Boolean)
    .join(' ');

  const finalResult = cleaned.replace(/\s+/g, ' ').trim();
  return /[.!?]$/.test(finalResult) ? finalResult : `${finalResult}.`;
}

function buildFocusedSummaryFromText(text) {
  const lower = text.toLowerCase();

  if (!lower.includes('favorite sport') && !lower.includes('sport')) {
    return null;
  }

  const subjectSentence = "This content focuses on the author's favorite sport.";

  if (/since\s+(?:the author\s+was\s+)?a\s+child|childhood/i.test(text)) {
    return `${subjectSentence} The author has been playing it since childhood, and it has remained a lifelong passion.`;
  }

  if (/favorite\s+sport/i.test(text)) {
    return `${subjectSentence} The author is deeply committed to it and values it as a personal favorite.`;
  }

  return null;
}

function extractKeywords(text, maxKeywords = 5) {
  if (!text || !text.trim()) return [];

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
    "these", "those", "with", "without", "from", "into", "for", "on", "in", "at",
    "by", "of", "to", "is", "are", "was", "were", "be", "been", "being", "it",
    "its", "they", "them", "their", "he", "she", "we", "you", "i", "me", "my",
    "our", "your", "his", "her", "as", "so", "too", "very", "more", "most",
    "about", "after", "before", "over", "under", "through", "again", "also", "just",
    "not", "how", "why", "when", "what", "where", "who", "which", "while", "because",
    "throughout", "among", "between", "within", "outside", "inside", "during", "against",
    "around", "afterward", "beforehand", "either", "neither", "any", "all", "some", "many",
    "much", "few", "little", "have", "has", "had", "having", "make", "made", "makes",
    "do", "does", "did", "doing", "like", "likes", "liked", "want", "wants", "wanted",
    "need", "needs", "needed", "use", "uses", "used", "show", "shows", "showed", "tell",
    "tells", "told", "talk", "talks", "talked", "think", "thinks", "thought", "feel",
    "feels", "felt", "learn", "learns", "learned", "read", "reads", "write", "writes",
    "written", "focus", "focuses", "focused", "introduce", "introduces", "introduced",
    "remain", "remains", "remained", "become", "becomes", "became", "play", "plays",
    "played", "playing", "go", "goes", "went", "come", "comes", "came", "look", "looks",
    "looked", "keep", "keeps", "kept", "see", "sees", "saw", "understand", "understands",
    "understood", "help", "helps", "helped", "start", "starts", "started", "find", "finds",
    "found", "mean", "means", "meant", "take", "takes", "took", "bring", "brings", "brought",
    "build", "builds", "built", "create", "creates", "created", "continue", "continues",
    "continued", "always", "never", "often", "sometimes", "usually", "really", "quite",
    "instead", "however", "therefore", "otherwise", "still", "already", "soon", "later",
    "further", "early", "late", "away", "back", "forward", "together", "inside", "outside",
    "favorite", "active", "better", "stronger", "important", "different", "similar",
    "daily", "personal", "social", "public", "private", "formal", "modern", "popular",
    "common", "clear", "simple", "special", "overall", "practical", "mental", "certain",
    "possible", "actual", "main", "clearer", "strongest", "better"
  ]);

  const ignoredNouns = new Set([
    "author", "people", "person", "reader", "readers", "user", "users", "child",
    "children", "man", "woman", "girl", "boy", "friend", "family", "team", "community",
    "group", "member", "members", "others", "someone", "everyone", "anyone", "content",
    "article", "story", "post", "topic", "piece", "way", "thing", "things", "place", "time",
    "work", "works", "world", "today", "part", "parts", "life", "day", "days", "year",
    "years", "mind", "body", "idea", "ideas", "point", "points", "fact", "facts", "case",
    "cases", "question", "questions", "example", "examples", "issue", "issues"
  ]);

  const adjectiveVerbSuffixes = /(ing|ed|ly|ful|less|ous|ive|able|ible|al|ic|ish|ary|ory|ant|ent|ive|ly)$/;
  const commonNounPatterns = /(?:tion|ment|ness|ity|ism|ship|age|ence|ance|sion|sure|er|or)$/;

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => {
      if (word.length < 4) return false;
      if (stopWords.has(word) || ignoredNouns.has(word)) return false;
      if (adjectiveVerbSuffixes.test(word) && !commonNounPatterns.test(word)) return false;
      return true;
    });

  const counts = {};
  words.forEach(word => {
    counts[word] = (counts[word] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

function summarizeTextLocally(text) {
  if (!text || !text.trim()) {
    return "No post text found to summarize.";
  }

  const cleaned = text.replace(/\s+/g, ' ').trim();

  const focusedSummary = buildFocusedSummaryFromText(cleaned);
  if (focusedSummary) {
    return finalizeSummaryText(focusedSummary);
  }

  const sentences = cleaned
    .split(/[.!?]+/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);

  if (sentences.length === 0) {
    return "No usable text available for a summary.";
  }

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this",
    "these", "those", "with", "without", "from", "into", "for", "on", "in", "at",
    "by", "of", "to", "is", "are", "was", "were", "be", "been", "being", "it",
    "its", "they", "them", "their", "he", "she", "we", "you", "i", "me", "my",
    "our", "your", "his", "her", "as", "so", "too", "very", "more", "most",
    "about", "after", "before", "over", "under", "through", "again", "also", "just",
    "not", "how", "why", "when", "what", "where", "who", "which", "while"
  ]);

  const wordScores = {};

  cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .forEach(word => {
      wordScores[word] = (wordScores[word] || 0) + 1;
    });

  const scoredSentences = sentences.map(sentence => {
    const sentenceWords = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    const score = sentenceWords.reduce((total, word) => total + (wordScores[word] || 0), 0);
    return { sentence, score };
  });

  let selected = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => normalizeSentenceForSummary(item.sentence));

  if (selected.length === 0) {
    selected = sentences.slice(0, 2).map(normalizeSentenceForSummary);
  }

  let summary = selected
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!summary) {
    const introOptions = [
      'This content is about',
      'This topic focuses on',
      'In this content, the author\'s main focus is',
      'This piece explores',
      'This discussion centers on'
    ];

    const intro = introOptions[Math.floor(Math.random() * introOptions.length)];
    return finalizeSummaryText(`${intro} the key ideas and themes in a clear and thoughtful way.`);
  }

  let cleanSummary = summary.replace(/\s+([,.!?])/g, '$1');

  cleanSummary = reduceRepeatedSummaryPhrases(
    cleanSummary
      .replace(/\s+/g, ' ')
      .replace(/\s+(?=[,.!?])/g, '')
      .replace(/\bcommunity\b/gi, 'community')
      .replace(/\bguys\b/gi, 'people')
      .replace(/\bthe world today\b/gi, 'the modern world')
      .replace(/\bthe world\b/gi, 'the broader world')
      .replace(/\bworld today\b/gi, 'the modern world')
      .replace(/\btoday\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );

  if (!/[.!?]$/.test(cleanSummary)) {
    cleanSummary = cleanSummary + '.';
  }

  if (/with the world$/i.test(cleanSummary)) {
    cleanSummary = cleanSummary.replace(/with the world$/i, 'with the world.');
  }

  if (cleanSummary.length > 220) {
    cleanSummary = trimSummaryToWholeWords(cleanSummary, 220);
    if (!/[.!?]$/.test(cleanSummary)) {
      cleanSummary += '.';
    }
  }

  const introOptions = [
    'This content is about',
    'This topic focuses on',
    'In this content, the author\'s main focus is',
    'This piece explores',
    'This discussion centers on'
  ];

  const intro = introOptions[Math.floor(Math.random() * introOptions.length)];
  const finalParagraph = `${intro}. ${cleanSummary}`;
  return finalizeSummaryText(finalParagraph);
}

function renderSummaryLoading() {
  if (!aiSummaryResult) return;

  aiSummaryResult.innerHTML = `
    <strong>Summary</strong>
    <div class="ai-summary-loading">
      <span class="summary-spinner"></span>
      <span>Generating summary...</span>
    </div>
  `;
}

function populateAiSummary() {
  if (!aiSummaryResult) return;

  const pageTextElement = document.getElementById("ipostText");
  const value = pageTextElement ? pageTextElement.textContent.replace(/\s+/g, ' ').trim() : "";

  if (!value) {
    aiSummaryResult.innerHTML = "<strong>Summary</strong>No text content available to summarize.";
    return;
  }

  const summary = summarizeTextLocally(value);
  const keywords = extractKeywords(value, 1);
  const keywordsHtml = keywords.length
    ? `<div class="summary-keywords"><strong>Keywords</strong><ul><li>${keywords[0]}</li></ul></div>`
    : "";

  aiSummaryResult.innerHTML = `<strong>Summary</strong>${summary}${keywordsHtml}`;
}

if (aiBtn && aiSheet) {
  aiBtn.addEventListener("click", () => {
    aiSheet.classList.add("show");
    renderSummaryLoading();

    setTimeout(() => {
      populateAiSummary();
    }, 500);
  });
}

if (closeAiSheet && aiSheet) {
  closeAiSheet.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    aiSheet.classList.remove("show");
  });
}

// Drag-to-close
let aiStartY = 0, aiCurrentY = 0, aiIsDragging = false;

if (aiSheet) {
  aiSheet.addEventListener("touchstart", (e) => {
    if (e.target.closest(".close-btn")) return;
    aiStartY = e.touches[0].clientY;
    aiIsDragging = true;
  });

  aiSheet.addEventListener("touchmove", (e) => {
    if (!aiIsDragging) return;

    aiCurrentY = e.touches[0].clientY;
    const diff = aiCurrentY - aiStartY;

    if (diff > 0) aiSheet.style.bottom = `-${diff}px`;
  });

  aiSheet.addEventListener("touchend", () => {
    aiIsDragging = false;

    const diff = aiCurrentY - aiStartY;
    if (diff > 120) aiSheet.classList.remove("show");

    aiSheet.style.bottom = "0";
  });
}

// upload media sheet js//


const uploadMediaBtn = document.getElementById("uploadMediaBtn");
const uploadSheet = document.getElementById("uploadSheet");
const closeUploadSheet = document.getElementById("closeUploadSheet");

if (uploadMediaBtn && uploadSheet) {
  uploadMediaBtn.addEventListener("click", () => {
    uploadSheet.classList.add("show");
  });
}

if (closeUploadSheet && uploadSheet) {
  closeUploadSheet.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uploadSheet.classList.remove("show");
  });
}

// Drag-to-close
let uploadStartY = 0, uploadCurrentY = 0, uploadIsDragging = false;

if (uploadSheet) {
  uploadSheet.addEventListener("touchstart", (e) => {
    if (e.target.closest(".close-btn")) return;
    uploadStartY = e.touches[0].clientY;
    uploadIsDragging = true;
  });

  uploadSheet.addEventListener("touchmove", (e) => {
    if (!uploadIsDragging) return;
    uploadCurrentY = e.touches[0].clientY;
    const diff = uploadCurrentY - uploadStartY;
    if (diff > 0) uploadSheet.style.bottom = `-${diff}px`;
  });

  uploadSheet.addEventListener("touchend", () => {
    uploadIsDragging = false;
    const diff = uploadCurrentY - uploadStartY;
    if (diff > 120) uploadSheet.classList.remove("show");
    uploadSheet.style.bottom = "0";
  });
}

/* ===========================
   MULTIPLE FILE UPLOAD
=========================== */

const mediaInput = document.getElementById("mediaInput");
const uploadFilesBtn = document.getElementById("uploadFilesBtn");
const previewContainer = document.getElementById("previewContainer");

let selectedFiles = [];

if (uploadFilesBtn && mediaInput) {
  uploadFilesBtn.addEventListener("click", () => {
    mediaInput.click();
  });
}

if (mediaInput && previewContainer) {
  mediaInput.addEventListener("change", () => {
    selectedFiles = [...mediaInput.files];
    previewContainer.innerHTML = "";

    selectedFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const item = document.createElement("div");
      item.style.marginBottom = "10px";

      if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = url;
        img.style.width = "100%";
        img.style.maxHeight = "180px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "10px";
        item.appendChild(img);
      }

      if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.muted = false;
        video.volume = 1;
        video.playsInline = true;
        video.loop = true;
        video.style.width = "100%";
        video.style.maxHeight = "180px";
        video.style.objectFit = "cover";
        video.style.borderRadius = "10px";
        item.appendChild(video);

        const tryPlayVideo = () => {
          video.muted = false;
          video.volume = 1;
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        };

        video.addEventListener("loadedmetadata", tryPlayVideo);
        video.addEventListener("click", tryPlayVideo);
      }

      previewContainer.appendChild(item);
    });
  });
}

//user sheet js//

const userSheetBtn = document.getElementById("userSheetBtn");
const userSheet = document.getElementById("userSheet");
const closeUserSheet = document.getElementById("closeUserSheet");

// Open sheet
userSheetBtn.addEventListener("click", () => {
  userSheet.classList.add("show");
});

// Close sheet
closeUserSheet.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  userSheet.classList.remove("show");
});

// Drag-to-close
let startY = 0, currentY = 0, isDragging = false;

userSheet.addEventListener("touchstart", (e) => {
  if (e.target.closest(".close-btn")) return;
  startY = e.touches[0].clientY;
  isDragging = true;
});

userSheet.addEventListener("touchmove", (e) => {
  if (!isDragging) return;

  currentY = e.touches[0].clientY;
  const diff = currentY - startY;

  if (diff > 0) userSheet.style.bottom = `-${diff}px`;
});

userSheet.addEventListener("touchend", () => {
  isDragging = false;

  const diff = currentY - startY;
  if (diff > 120) userSheet.classList.remove("show");

  userSheet.style.bottom = "0";
});

//ad js//
//ads js//

const countdownBox = document.getElementById("adCountdown");
const adPopup = document.getElementById("adPopup");
const skipAdBtn = document.getElementById("skipAdBtn");
const adStatusLabel = document.getElementById("adStatusLabel");

if (adPopup) {
  let adInterval = 100;//seconds
  let adDuration = 36;
  let countdown = adInterval;

  function updateAdStatus() {
    if (!adStatusLabel) return;

    if (countdown <= 5 && countdown >= 0) {
      adStatusLabel.innerHTML = `Ad is coming in ${countdown}s <i class="fa-solid fa-bullhorn fa-sm" style="color: rgb(0, 0, 0);"></i>`;
      return;
    }

    adStatusLabel.innerHTML = `Contains ads <i class="fa-solid fa-bullhorn fa-sm" style="color: rgb(0, 0, 0);"></i>`;
  }

  function showAd() {
    adPopup.classList.add("show");

    if (!skipAdBtn) return;

    skipAdBtn.disabled = true;
    skipAdBtn.style.opacity = "0.6";
    skipAdBtn.textContent = "Skip in 5";

    let skipTimer = 5;
    if (window.adSkipInterval) clearInterval(window.adSkipInterval);

    window.adSkipInterval = setInterval(() => {
      skipTimer--;
      skipAdBtn.textContent = `Skip in ${skipTimer}`;

      if (skipTimer <= 0) {
        clearInterval(window.adSkipInterval);
        skipAdBtn.disabled = false;
        skipAdBtn.style.opacity = "1";
        skipAdBtn.textContent = "Skip";
      }
    }, 1000);

    if (window.adTimeout) clearTimeout(window.adTimeout);
    window.adTimeout = setTimeout(() => {
      adPopup.classList.remove("show");
      if (window.adSkipInterval) clearInterval(window.adSkipInterval);
    }, adDuration * 1000);
  }

  updateAdStatus();

  setInterval(() => {
    countdown--;

    if (countdownBox) {
      if (countdown <= 5 && countdown >= 0) {
        countdownBox.innerText = `Ad is coming in ${countdown} seconds`;
      } else {
        countdownBox.innerText = "";
      }
    }

    updateAdStatus();

    if (countdown <= 0) {
      showAd();
      countdown = adInterval;
      updateAdStatus();
    }
  }, 1000);

  if (skipAdBtn) {
    skipAdBtn.addEventListener("click", () => {
      if (!skipAdBtn.disabled) {
        adPopup.classList.remove("show");
        clearTimeout(window.adTimeout);
        clearInterval(window.adSkipInterval);
      }
    });
  }
}

