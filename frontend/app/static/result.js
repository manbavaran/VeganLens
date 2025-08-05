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
    // localStorage 지원 확인
    if (!window.localStorage) {
      throw new Error("LocalStorage not supported");
    }

    const stored = localStorage.getItem("resultData");
    if (!stored) {
      showError("No analysis results found.", true);
      return null;
    }

    const data = JSON.parse(stored);
    
    // 데이터 유효성 검증
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
 * 결과 데이터 유효성 검증
 */
function validateResultData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // 필수 필드 확인
  const requiredFields = ['imageUrl', 'danger', 'caution', 'safe'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  // 배열 필드 검증
  const arrayFields = ['danger', 'caution', 'safe'];
  for (const field of arrayFields) {
    if (!Array.isArray(data[field])) {
      console.error(`Field ${field} must be an array`);
      return false;
    }
  }

  // 이미지 URL 기본 검증
  if (typeof data.imageUrl !== 'string' || !data.imageUrl.trim()) {
    console.error("Invalid imageUrl");
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
 * 이미지 렌더링 (로드 확인 포함)
 */
function renderImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const imagePreview = document.getElementById("imagePreview");
    if (!imagePreview) {
      reject(new Error("Image preview element not found"));
      return;
    }

    // URL 기본 검증
    if (!isValidImageUrl(imageUrl)) {
      console.warn("Invalid image URL, using placeholder");
      imagePreview.classList.add("no-image");
      imagePreview.textContent = "Unable to load image";
      resolve();
      return;
    }

    // 이미지 로드 테스트
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
  // 기본적인 XSS 방지 (더 강력한 라이브러리 사용 권장)
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

  let message = "Check your analysis results.";
  let messageClass = "info";

  if (analysisResult.danger?.length > 0) {
    message = "Not suitable for consumption.";
    messageClass = "danger";
  } else if (analysisResult.caution?.length > 0) {
    message = "Consume with caution.";
    messageClass = "caution";
  } else if (analysisResult.safe?.length > 0) {
    message = "Safe to consume.";
    messageClass = "safe";
  }

  messageEl.textContent = message;
  messageEl.className = `result-message ${messageClass}`;
}

/**
 * 결과 박스들 렌더링
 */
function renderResultBoxes(analysisResult) {
  const boxes = [
    { id: "dangerBox", type: "danger", ingredients: analysisResult.danger },
    { id: "cautionBox", type: "caution", ingredients: analysisResult.caution },
    { id: "safeBox", type: "safe", ingredients: analysisResult.safe }
  ];

  boxes.forEach(box => {
    const element = document.getElementById(box.id);
    if (!element) {
      console.error(`Box element not found: ${box.id}`);
      return;
    }

    setupBox(element, box.type, box.ingredients);
  });
}

/**
 * 개별 박스 설정
 */
function setupBox(element, type, ingredients) {
  // 기존 클래스 초기화
  element.className = "result-box";
  
  if (!ingredients || ingredients.length === 0) {
    element.classList.add("disabled");
    element.removeEventListener("click", element._clickHandler);
    return;
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