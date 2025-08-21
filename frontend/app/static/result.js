document.addEventListener("DOMContentLoaded", () => {
  initializeResultPage();
});

/**
 * 결과 페이지 초기화
 */
async function initializeResultPage() {
  try {
    const analysisResult = await loadResultData();
    if (!analysisResult) return;

    await renderResults(analysisResult);
    setupEventListeners(analysisResult);
    
  } catch (error) {
    console.error("Failed to initialize result page:", error);
    showError("Failed to initialize the page.");
  }
}

/**
 * localStorage에서 결과 데이터 로드 및 검증
 */
async function loadResultData() {
  try {
    if (!window.localStorage) {
      throw new Error("LocalStorage not supported");
    }

    const stored = localStorage.getItem("resultData");
    if (!stored) {
      showError("No analysis results found.", true);
      return null;
    }

    const data = JSON.parse(stored);
    
    if (!validateResultData(data)) {
      throw new Error("Invalid result data format");
    }

    return data;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error("Invalid JSON in localStorage:", error);
      showError("Stored data is corrupted.", true);
    } else {
      console.error("Error loading result data:", error);
      showError("An error occurred while loading data.", true);
    }
    return null;
  }
}

/**
 * 결과 데이터 유효성 검증 (백엔드 데이터만)
 */
function validateResultData(data) {
  if (!data || typeof data !== 'object') {
    console.error("Data is not an object:", data);
    return false;
  }

  const requiredFields = ['imageUrl', 'danger', 'caution'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.warn(`Missing required field: ${field}, setting default value`);
      if (field === 'imageUrl') {
        data[field] = '';
      } else {
        data[field] = [];
      }
    }
  }

  const arrayFields = ['danger', 'caution'];
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      console.warn(`Field ${field} is not an array, converting:`, data[field]);
      data[field] = data[field] ? [data[field].toString()] : [];
    }
  }

  data.safe = [];

  if (typeof data.imageUrl !== 'string') {
    console.warn("Invalid imageUrl, setting empty string");
    data.imageUrl = '';
  }

  if (data.error || data.status === 'error') {
    console.error("Backend analysis error:", data.error || data.message);
    return false;
  }

  return true;
}

/**
 * 결과 렌더링
 */
async function renderResults(analysisResult) {
  try {
    await renderImage(analysisResult.imageUrl);
    renderMessage(analysisResult);
    renderResultBoxes(analysisResult);
    
  } catch (error) {
    console.error("Error rendering results:", error);
    showError("An error occurred while displaying results.");
  }
}

/**
 * 이미지 로드 체크와 함께 이미지 렌더링
 */
function renderImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) {
      reject(new Error("Image preview element not found"));
      return;
    }

    if (!isValidImageUrl(imageUrl)) {
      console.warn("Invalid image URL, using placeholder");
      imagePreview.classList.add("no-image");
      imagePreview.textContent = "Unable to load image";
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imagePreview.style.backgroundImage = `url('${sanitizeUrl(imageUrl)}')`;
      imagePreview.classList.remove("no-image");
      resolve();
    };
    img.onerror = () => {
      console.warn("Failed to load image:", imageUrl);
      imagePreview.classList.add("no-image");
      imagePreview.textContent = "Unable to load image";
      resolve();
    };
    img.src = imageUrl;
  });
}

/**
 * 이미지 URL 유효성 검증
 */
function isValidImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * URL 문자열 처리
 */
function sanitizeUrl(url) {
  return url.replace(/[<>'"]/g, '');
}

/**
 * 결과 메시지 렌더링
 */
function renderMessage(analysisResult) {
  const messageEl = document.getElementById("resultMessage");
  if (!messageEl) {
    console.error("Result message element not found");
    return;
  }

  const dangerCount = analysisResult.danger?.length || 0;
  const cautionCount = analysisResult.caution?.length || 0;

  let message = "Check your analysis results.";
  let messageClass = "info";

  if (dangerCount > 0) {
    message = "Not suitable for consumption.";
    messageClass = "danger";
  } else if (cautionCount > 0) {
    message = "Consume with caution.";
    messageClass = "caution";
  } else {
    message = "Safe to consume!";
    messageClass = "safe";
  }

  messageEl.textContent = message;
  messageEl.className = `result-message ${messageClass}`;
}

/**
 * 수정: 주의사항 텍스트가 통합된 결과 박스 렌더링
 */
function renderResultBoxes(analysisResult) {
  const boxes = [
    { id: "dangerBox", type: "danger", ingredients: analysisResult.danger },
    { id: "cautionBox", type: "caution", ingredients: analysisResult.caution },
    { id: "safeBox", type: "safe", ingredients: [] }
  ];

  const dangerCount = analysisResult.danger?.length || 0;
  const cautionCount = analysisResult.caution?.length || 0;
  const isSafe = dangerCount === 0 && cautionCount === 0;

  boxes.forEach(box => {
    const element = document.getElementById(box.id);
    if (!element) {
      console.error(`Box element not found: ${box.id}`);
      return;
    }

    setupBox(element, box.type, box.ingredients, isSafe, cautionCount > 0);
  });
}

/**
 * 수정: 주의사항 텍스트가 통합된 개별 박스 설정
 */
function setupBox(element, type, ingredients, isSafe = false, hasCautionIngredients = false) {
  // 기존 클래스 초기화
  element.className = "result-box";
  
  // 기존 콘텐츠 제거
  element.innerHTML = '';
  
  if (type === "safe") {
    // 안전 박스: 위험/주의 성분이 없을 때만 활성화, 클릭 불가
    const mainText = document.createElement('div');
    mainText.textContent = '✅ Safe Ingredients';
    element.appendChild(mainText);
    
    if (isSafe) {
      element.classList.add("safe", "highlighted");
    } else {
      element.classList.add("disabled");
    }
    
    // 기존 클릭 핸들러 제거
    if (element._clickHandler) {
      element.removeEventListener("click", element._clickHandler);
      element._clickHandler = null;
    }
    return;
  }

  // 위험/주의 박스 처리
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    const mainText = document.createElement('div');
    mainText.textContent = getBoxDisplayText(type);
    element.appendChild(mainText);
    
    element.classList.add("disabled");
    if (element._clickHandler) {
      element.removeEventListener("click", element._clickHandler);
      element._clickHandler = null;
    }
    return;
  }

  // 성분이 있는 활성 박스
  const mainText = document.createElement('div');
  mainText.textContent = getBoxDisplayText(type);
  element.appendChild(mainText);
  
  // 수정: 주의 박스에 통합된 주의사항 텍스트 추가
  if (type === "caution" && hasCautionIngredients) {
    const cautionText = document.createElement('div');
    cautionText.className = 'caution-integrated-text';
    cautionText.textContent = 'This product is made in a facility that handles animal ingredients, which may cause cross-contamination.';
    element.appendChild(cautionText);
  }

  element.classList.add(type, "folded");
  
  // 이전 이벤트 리스너 제거
  if (element._clickHandler) {
    element.removeEventListener("click", element._clickHandler);
  }
  
  // 새 이벤트 리스너 추가
  element._clickHandler = () => {
    const title = getTypeDisplayName(type);
    const content = `${title} Ingredients:\n${ingredients.join(", ")}`;
    showModal(content);
  };
  
  element.addEventListener("click", element._clickHandler);
}

/**
 * 박스 표시 텍스트 반환
 */
function getBoxDisplayText(type) {
  const displayTexts = {
    danger: "🚫 Unsafe Ingredients",
    caution: "⚠️ Caution Required",
    safe: "✅ Safe Ingredients"
  };
  return displayTexts[type] || type.toUpperCase();
}

/**
 * 모달용 타입 표시명 반환
 */
function getTypeDisplayName(type) {
  const typeNames = {
    danger: "Unsafe",
    caution: "Caution",
    safe: "Safe"
  };
  return typeNames[type] || type.toUpperCase();
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners(analysisResult) {
  setupModalEvents();
  setupTooltipEvents();
  setupCloseButton();
}

/**
 * 모달 이벤트 설정
 */
function setupModalEvents() {
  const closeModalBtn = document.getElementById("closeModal");
  const modal = document.getElementById("ingredientModal");
  
  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener("click", () => {
      hideModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        hideModal();
      }
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        hideModal();
      }
    });
  }
}

/**
 * 툴팁 이벤트 설정
 */
function setupTooltipEvents() {
  const tooltip = document.getElementById("tooltip");
  const infoIcon = document.getElementById("infoIcon");

  if (tooltip && infoIcon) {
    infoIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleTooltip();
    });

    document.addEventListener("click", () => {
      hideTooltip();
    });

    tooltip.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}

/**
 * 닫기 버튼 설정
 */
function setupCloseButton() {
  const closeBtn = document.getElementById("closeBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem("resultData");
      } catch (error) {
        console.warn("Failed to clear localStorage:", error);
      }
      
      navigateToHome();
    });
  }
}

/**
 * 모달 표시
 */
function showModal(text) {
  const modal = document.getElementById("ingredientModal");
  const modalContent = document.getElementById("modalContent");
  
  if (modal && modalContent) {
    modalContent.textContent = text;
    modal.classList.remove("hidden");
    
    const focusableElement = modal.querySelector("button, [tabindex]");
    if (focusableElement) {
      focusableElement.focus();
    }
  }
}

/**
 * 모달 숨기기
 */
function hideModal() {
  const modal = document.getElementById("ingredientModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

/**
 * 툴팁 토글
 */
function toggleTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (tooltip) {
    tooltip.classList.toggle("hidden");
  }
}

/**
 * 툴팁 숨기기
 */
function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}

/**
 * 에러 표시
 */
function showError(message, shouldRedirect = false) {
  const existingError = document.querySelector(".error-overlay");
  if (existingError) {
    existingError.remove();
  }

  const errorOverlay = document.createElement("div");
  errorOverlay.className = "error-overlay";
  errorOverlay.innerHTML = `
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <div class="error-message">${escapeHtml(message)}</div>
      <div class="error-actions">
        ${shouldRedirect ? 
          '<button class="error-btn primary" onclick="navigateToHome()">Back to Home</button>' :
          '<button class="error-btn" onclick="this.closest(\'.error-overlay\').remove()">OK</button>'
        }
      </div>
    </div>
  `;

  document.body.appendChild(errorOverlay);

  if (shouldRedirect) {
    setTimeout(() => {
      navigateToHome();
    }, 5000);
  }
}

/**
 * HTML 이스케이프 처리
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 홈 페이지로 이동
 */
function navigateToHome() {
  window.location.href = "index.html";
}

// 전역 함수 노출
window.navigateToHome = navigateToHome;