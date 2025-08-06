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
 * 결과 데이터 유효성 검증 (개선)
 */
function validateResultData(data) {
  if (!data || typeof data !== 'object') {
    console.error("Data is not an object:", data);
    return false;
  }

  // 필수 필드 확인 및 기본값 설정
  const requiredFields = ['imageUrl', 'danger', 'caution', 'safe'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.warn(`Missing required field: ${field}, setting default empty array`);
      if (field === 'imageUrl') {
        data[field] = '';
      } else {
        data[field] = [];
      }
    }
  }

  // 배열 필드 검증 및 수정
  const arrayFields = ['danger', 'caution', 'safe'];
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      console.warn(`Field ${field} is not an array, converting:`, data[field]);
      data[field] = data[field] ? [data[field].toString()] : [];
    }
  }

  // 이미지 URL 기본 검증
  if (typeof data.imageUrl !== 'string') {
    console.warn("Invalid imageUrl, setting empty string");
    data.imageUrl = '';
  }

  // 금지 성분이 없을 때 안전 성분 자동 생성
  const dangerCount = data.danger.length;
  const cautionCount = data.caution.length;
  const safeCount = data.safe.length;
  const totalIngredients = dangerCount + cautionCount + safeCount;
  
  // OCR 텍스트에서 안전한 성분들을 추출하여 safe 배열에 추가
  if (data._metadata && data._metadata.ocrText && safeCount === 0 && dangerCount === 0 && cautionCount === 0) {
    const extractedIngredients = extractIngredientsFromOCR(data._metadata.ocrText);
    if (extractedIngredients.length > 0) {
      data.safe = extractedIngredients;
      console.log("자동으로 안전 성분 생성:", data.safe);
    }
  }

  if (totalIngredients === 0) {
    console.warn("No ingredients found in analysis result");
  }

  // 백엔드 에러 필드 확인
  if (data.error || data.status === 'error') {
    console.error("Backend analysis error:", data.error || data.message);
    return false;
  }

  return true;
}

/**
 * OCR 텍스트에서 재료 목록 추출 (개선된 버전)
 */
function extractIngredientsFromOCR(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') {
    return [];
  }

  try {
    // 다양한 언어의 "성분" 키워드 매칭
    const ingredientsMatch = ocrText.match(/(?:ingredients?|성분|원재료|구성품)[:\s]([^.]*)/i);
    
    let textToProcess = '';
    if (ingredientsMatch && ingredientsMatch[1]) {
      textToProcess = ingredientsMatch[1];
    } else {
      // 키워드가 없으면 전체 텍스트 사용
      textToProcess = ocrText;
    }

    const ingredients = textToProcess
      .split(/[,;()]/g)
      .map(ingredient => ingredient.trim())
      .filter(ingredient => 
        ingredient.length > 1 && 
        ingredient.length < 30 &&
        !/^\d+%?$/.test(ingredient) && // 숫자만 있는 것 제외
        !/^[%\d\s]+$/.test(ingredient) // 퍼센트나 숫자만 있는 것 제외
      )
      .slice(0, 15); // 최대 15개까지

    return ingredients;
    
  } catch (error) {
    console.warn('Error extracting ingredients from OCR:', error);
    return [];
  }
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
 * 이미지 렌더링 (로드 확인 포함)
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
      resolve(); // 이미지 로드 실패해도 계속 진행
    };
    img.src = imageUrl;
  });
}

/**
 * 이미지 URL 유효성 검사
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
 * URL 새니타이징
 */
function sanitizeUrl(url) {
  return url.replace(/[<>'"]/g, '');
}

/**
 * 결과 메시지 렌더링 (개선된 로직)
 */
function renderMessage(analysisResult) {
  const messageEl = document.getElementById("resultMessage");
  if (!messageEl) {
    console.error("Result message element not found");
    return;
  }

  const dangerCount = analysisResult.danger?.length || 0;
  const cautionCount = analysisResult.caution?.length || 0;
  const safeCount = analysisResult.safe?.length || 0;
  const totalIngredients = dangerCount + cautionCount + safeCount;

  let message = "Check your analysis results.";
  let messageClass = "info";

  if (totalIngredients === 0) {
    message = "No ingredients detected in the analysis.";
    messageClass = "info";
  } else if (dangerCount > 0) {
    message = "Not suitable for consumption.";
    messageClass = "danger";
  } else if (cautionCount > 0) {
    message = "Consume with caution.";
    messageClass = "caution";
  } else if (safeCount > 0) {
    // 핵심: 위험/주의 성분이 없고 안전 성분만 있으면 안전 메시지
    message = "Safe to consume!";
    messageClass = "safe";
  }

  messageEl.textContent = message;
  messageEl.className = `result-message ${messageClass}`;
}

/**
 * 결과 박스들 렌더링 (안전 성분 강조)
 */
function renderResultBoxes(analysisResult) {
  const boxes = [
    { id: "dangerBox", type: "danger", ingredients: analysisResult.danger },
    { id: "cautionBox", type: "caution", ingredients: analysisResult.caution },
    { id: "safeBox", type: "safe", ingredients: analysisResult.safe }
  ];

  // 위험/주의 성분이 없고 안전 성분만 있는 경우 체크
  const dangerCount = analysisResult.danger?.length || 0;
  const cautionCount = analysisResult.caution?.length || 0;
  const safeCount = analysisResult.safe?.length || 0;
  const isOnlySafe = dangerCount === 0 && cautionCount === 0 && safeCount > 0;

  boxes.forEach(box => {
    const element = document.getElementById(box.id);
    if (!element) {
      console.error(`Box element not found: ${box.id}`);
      return;
    }

    setupBox(element, box.type, box.ingredients, isOnlySafe);
  });
}

/**
 * 개별 박스 설정 (안전 성분 강조 기능 추가)
 */
function setupBox(element, type, ingredients, isOnlySafe = false) {
  // 기존 클래스 초기화
  element.className = "result-box";
  
  // ingredients가 undefined이거나 빈 배열인 경우 처리
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    element.classList.add("disabled");
    if (element._clickHandler) {
      element.removeEventListener("click", element._clickHandler);
    }
    return;
  }

  element.classList.add(type, "folded");

  // 안전 성분만 있을 때 강조 표시
  if (type === "safe" && isOnlySafe) {
    element.classList.add("highlighted");
  }
  
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
 * 타입별 표시명 반환
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

    // ESC 키로 모달 닫기
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        hideModal();
      }
    });

    // 모달 외부 클릭시 닫기
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

    // 툴팁 내부 클릭시 닫히지 않도록
    tooltip.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}

/**
 * 닫기 버튼 이벤트 설정
 */
function setupCloseButton() {
  const closeBtn = document.getElementById("closeBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      // 결과 데이터 정리
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
    
    // 접근성: 첫 번째 포커스 가능한 요소에 포커스
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
  // 기존 에러 메시지 제거
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
    // 5초 후 자동 리다이렉트
    setTimeout(() => {
      navigateToHome();
    }, 5000);
  }
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 홈으로 이동
 */
function navigateToHome() {
  window.location.href = "index.html";
}

// 전역 함수로 노출 (에러 오버레이에서 사용)
window.navigateToHome = navigateToHome;