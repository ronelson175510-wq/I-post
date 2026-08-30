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

const aiBtn = document.getElementById("aiBtn");
const aiSheet = document.getElementById("aiSheet");
const closeAiSheet = document.getElementById("closeAiSheet");
const aiSummaryResult = document.getElementById("aiSummaryResult");
const uploadMediaBtn = document.getElementById("uploadMediaBtn");
const uploadSheet = document.getElementById("uploadSheet");
const closeUploadSheet = document.getElementById("closeUploadSheet");
const mediaInput = document.getElementById("mediaInput");
const uploadFilesBtn = document.getElementById("uploadFilesBtn");
const submitFilesBtn = document.getElementById("submitFilesBtn");
const previewContainer = document.getElementById("previewContainer");

function getCurrentPostText() {
  const postContainer = document.getElementById("ipostText");
  if (!postContainer) return "";

  const paragraph = postContainer.querySelector("p");
  return (paragraph ? paragraph.textContent : postContainer.textContent).trim();
}

function setAiSummaryLoading() {
  if (!aiSummaryResult) return;

  aiSummaryResult.innerHTML = `
    <strong>Summary</strong>
    <div class="ai-summary-loading">
      <span class="summary-spinner"></span>
      <span>Generating summary...</span>
    </div>
  `;
}

async function populateAiSummary() {
  if (!aiSummaryResult) return;

  const content = getCurrentPostText();
  if (!content) {
    aiSummaryResult.innerHTML = "<strong>Summary</strong><div class='ai-summary-output'>No post text available.</div>";
    return;
  }

  setAiSummaryLoading();

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content })
    });

    const data = await response.json();
    const summary = data?.summary || "Unable to generate a summary.";

    aiSummaryResult.innerHTML = `
      <strong>Summary</strong>
      <div class="ai-summary-output">${summary}</div>
    `;
  } catch (error) {
    console.error("AI summary error:", error);
    aiSummaryResult.innerHTML = `
      <strong>Summary</strong>
      <div class="ai-summary-output">Unable to generate summary right now.</div>
    `;
  }
}

if (aiBtn && aiSheet) {
  aiBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    if (footerIconMenu) {
      footerIconMenu.classList.remove("show");
    }

    aiSheet.classList.add("show");
    populateAiSummary();
  });
}

if (closeAiSheet && aiSheet) {
  closeAiSheet.addEventListener("click", () => {
    aiSheet.classList.remove("show");
  });
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
  });
}

if (mediaInput && previewContainer) {
  mediaInput.addEventListener("change", () => {
    const files = Array.from(mediaInput.files || []);

    if (!files.length) {
      previewContainer.innerHTML = "";
      return;
    }

    previewContainer.innerHTML = files
      .map(file => `<div class="preview-item">${file.name}</div>`)
      .join("");
  });
}

if (uploadFilesBtn && mediaInput) {
  uploadFilesBtn.addEventListener("click", () => {
    mediaInput.click();
  });
}

if (submitFilesBtn && uploadSheet) {
  submitFilesBtn.addEventListener("click", () => {
    const files = mediaInput ? mediaInput.files : null;

    if (!files || files.length === 0) {
      alert("Please choose a file first.");
      return;
    }

    alert(`Selected ${files.length} file(s) ready to upload.`);
    uploadSheet.classList.remove("show");
  });
}


