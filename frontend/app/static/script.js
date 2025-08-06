// 전역 변수로 업로드 상태 추적
let isUploading = false;
let uploadController = null;

document.addEventListener("DOMContentLoaded", () => {
  // 최초 앱 실행 시 식단 유형 선택 팝업 처리
  const onboardingPopup = document.getElementById("onboardingPopup");

  if (!localStorage.getItem("vegType") && onboardingPopup) {
    onboardingPopup.classList.remove("hidden");

    const form = document.getElementById("popupForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const selected = document.querySelector("input[name='vegtype']:checked").value;
      localStorage.setItem("vegType", selected);
      onboardingPopup.classList.add("hidden");
    });
  }

  // 프로필 이미지 및 이름 관련 요소 참조
  const profileInput = document.getElementById("profileInput");
  const profileImage = document.getElementById("profileImage");
  const userName = document.getElementById("userName");
  const editNameBtn = document.getElementById("editNameBtn");
  const nameModal = document.getElementById("nameModal");
  const nameInput = document.getElementById("nameInput");
  const saveName = document.getElementById("saveName");
  const cancelName = document.getElementById("cancelName");

  // 프로필 저장된 값 불러오기
  const storedImage = localStorage.getItem("profileImage");
  const storedName = localStorage.getItem("userName");
  if (storedImage && profileImage) profileImage.style.backgroundImage = `url(${storedImage})`;
  if (storedName && userName) userName.textContent = storedName;

  // 프로필 이미지 클릭 시 파일 선택
  if (profileImage && profileInput) {
    profileImage.addEventListener("click", () => profileInput.click());
    profileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result;
        profileImage.style.backgroundImage = `url(${imageUrl})`;
        localStorage.setItem("profileImage", imageUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  // 닉네임 수정 모달 열기 및 저장
  if (editNameBtn && nameModal && nameInput && userName) {
    editNameBtn.addEventListener("click", () => {
      nameModal.classList.remove("hidden");
      nameInput.value = userName.textContent;
    });
  }

  if (saveName && nameModal && nameInput && userName) {
    saveName.addEventListener("click", () => {
      const newName = nameInput.value.trim();
      if (newName) {
        userName.textContent = newName;
        localStorage.setItem("userName", newName);
      }
      nameModal.classList.add("hidden");
    });
  }

  if (cancelName && nameModal) {
    cancelName.addEventListener("click", () => {
      nameModal.classList.add("hidden");
    });
  }

  // 식단 유형 선택 관련 처리
  const toggleSelector = document.getElementById("toggleSelector");
  const typePopup = document.getElementById("typePopup");
  const selectedType = document.getElementById("selectedType");

  if (toggleSelector && typePopup && selectedType) {
    toggleSelector.addEventListener("click", () => {
      typePopup.classList.toggle("hidden");
    });

    document.querySelectorAll("#typePopup input[name='vegtype']").forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const selected = e.target.value;
        selectedType.textContent = selected;
        typePopup.classList.add("hidden");
        localStorage.setItem("vegType", selected);
        updateIcons(selected);

        fetch('/api/update-user-type', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-type': selected
          },
          body: JSON.stringify({ type: selected })
        }).catch(err => console.warn("Failed to update user type:", err));
      });
    });

    // 저장된 식단 불러오기
    const savedType = localStorage.getItem("vegType");
    if (savedType) {
      selectedType.textContent = savedType;
      updateIcons(savedType);
      const radios = document.querySelectorAll("input[name='vegtype']");
      radios.forEach((r) => {
        if (r.value === savedType) r.checked = true;
      });
    }
  }

  // 식품군 아이콘 활성화 처리
  function updateIcons(type) {
    const activeSet = new Set();
    if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(type)) {
      activeSet.add("vegetable");
    }
    if (["Lacto vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(type)) {
      activeSet.add("dairy");
    }
    if (["Ovo vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(type)) {
      activeSet.add("egg");
    }
    if (["Pesco-vegetarian", "Pollo-vegetarian"].includes(type)) {
      activeSet.add("fish");
    }
    if (type === "Pollo-vegetarian") {
      activeSet.add("chicken");
    }

    document.querySelectorAll(".icon").forEach((icon) => {
      const id = icon.id;

      if (id === "meat") {
        icon.classList.remove("active");
        icon.src = `/static/images/icons/meat_gray.png`;
        return;
      }
      
      if (activeSet.has(id)) {
        icon.classList.add("active");
        icon.src = `/static/images/icons/${id}.png`;
      } else {
        icon.classList.remove("active");
        icon.src = `/static/images/icons/${id}_gray.png`;
      }
    });
  }

  document.querySelectorAll(".nav-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      const tab = icon.getAttribute("data-tab");
      if (tab === "settings") window.location.href = "settings.html";
      else if (tab === "home") window.location.href = "index.html";
      else if (tab === "grid") alert("Grid view not implemented yet.");
    });
  });

  // 이미지 전송 처리
  const cameraBtn = document.getElementById("cameraBtn");
  const cameraInput = document.getElementById("cameraInput");
  const galleryBtn = document.getElementById("galleryBtn");
  const galleryInput = document.getElementById("galleryInput");

  if (cameraBtn && cameraInput) {
    cameraBtn.addEventListener("click", () => {
      if (isUploading) {
        alert("Image analysis is already in progress. Please wait.");
        return;
      }
      cameraInput.click();
    });

    cameraInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && !isUploading) {
        sendImageToBackend(file);
      }
    });
  }

  if (galleryBtn && galleryInput) {
    galleryBtn.addEventListener("click", () => {
      if (isUploading) {
        alert("Image analysis is already in progress. Please wait.");
        return;
      }
      galleryInput.click();
    });

    galleryInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file && !isUploading) {
        sendImageToBackend(file);
      }
    });
  }

  // 구현되지 않은 기능 알림
  const liveCameraBtn = document.getElementById("liveCameraBtn");
  if (liveCameraBtn) {
    liveCameraBtn.addEventListener("click", () => {
      alert("This feature is coming soon.");
    });
  }

  // 아이콘 생성 라이브러리를 초기화
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

/**
 * 수정된 이미지 업로드 함수 - 동적 서버 URL 및 응답 처리 순서 개선
 * 
 * 주요 개선사항:
 * - 동적 서버 URL 감지로 하드코딩 문제 해결
 * - JSON 파싱 완료 후 페이지 이동으로 AbortError 방지
 * - 업로드 상태 추적으로 중복 요청 방지
 * - 타임아웃 설정으로 무한 대기 방지
 * 
 * @param {File} imageFile - 업로드할 이미지 파일
 */
function sendImageToBackend(imageFile) {
  console.log("sendImageToBackend 시작");
  
  // 중복 업로드 방지
  if (isUploading) {
    console.warn("업로드가 이미 진행 중입니다");
    alert("Image analysis is already in progress. Please wait.");
    return;
  }

  // 파일 유효성 검사
  if (!imageFile || imageFile.size === 0) {
    alert("Please select a valid image file.");
    return;
  }

  // 파일 크기 제한 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (imageFile.size > MAX_FILE_SIZE) {
    alert("File size is too large. Please select an image under 10MB.");
    return;
  }

  // 이미지 파일 타입 확인
  if (!imageFile.type.startsWith('image/')) {
    alert("Please select an image file only.");
    return;
  }

  console.log("업로드 시작");
  isUploading = true;

  const vegType = localStorage.getItem("vegType") || "Vegan";
  const formData = new FormData();
  formData.append("file", imageFile);

  // AbortController로 요청 취소 기능 추가
  uploadController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("요청 타임아웃");
    uploadController.abort();
    resetUploadState();
    alert("Request timeout. Please check your internet connection and try again.");
  }, 30000);

  console.log("Sending image to backend:", {
    vegType,
    fileSize: imageFile.size,
    fileName: imageFile.name,
    fileType: imageFile.type
  });

  const fetchStart = Date.now();

  // 네트워크 연결 상태 확인
  if (!navigator.onLine) {
    console.error("네트워크 연결 없음");
    clearTimeout(timeoutId);
    resetUploadState();
    alert("No internet connection. Please check your network and try again.");
    return;
  }

  // 동적 서버 URL 감지
  const currentHost = window.location.hostname;
  const SERVER_URL = `http://${currentHost}:8000/Check_Vegan`;
  console.log("동적 서버 URL:", SERVER_URL);

  fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "x-user-type": vegType
    },
    body: formData,
    signal: uploadController.signal
  })
    .then((res) => {
      clearTimeout(timeoutId);
      
      console.log("응답 수신:", {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
      }

      // JSON 파싱을 먼저 완료
      return res.json();
    })
    .then((backendData) => {
      console.log("백엔드 응답 데이터:", backendData);
      
      // 백엔드 에러 체크
      if (backendData.error || backendData.status === 'error') {
        throw new Error(backendData.message || backendData.error || "Backend processing failed");
      }

      if (!backendData || Object.keys(backendData).length === 0) {
        throw new Error("Empty response from backend");
      }
      
      const transformedData = transformBackendData(backendData);
      console.log("변환된 데이터:", transformedData);
      
      // 🔥 핵심 개선: 이미지 처리도 완료한 후 페이지 이동
      const reader = new FileReader();
      reader.onload = () => {
        transformedData.imageUrl = reader.result;
        
        try {
          localStorage.setItem("resultData", JSON.stringify(transformedData));
          console.log("localStorage에 데이터 저장 완료");
        } catch (storageError) {
          console.error("localStorage 저장 실패:", storageError);
        }

        // 최소 로딩 시간 보장
        const elapsed = Date.now() - fetchStart;
        const waitTime = Math.max(1500 - elapsed, 0);

        const goToLoading = () => {
          console.log("모든 처리 완료, 로딩 페이지로 이동");
          resetUploadState();
          window.location.href = "loading.html";
        };

        if (waitTime > 0) {
          setTimeout(goToLoading, waitTime);
        } else {
          goToLoading();
        }
      };
      
      reader.onerror = (readerError) => {
        console.error("FileReader 에러:", readerError);
        resetUploadState();
        alert("Failed to process image. Please try again.");
      };
      
      reader.readAsDataURL(imageFile);
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      resetUploadState();
      
      console.error("업로드 에러 상세:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let errorMessage = "Upload failed. ";
      
      if (error.name === 'AbortError') {
        errorMessage += "Request timeout. Please check your network connection.";
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage += "Cannot connect to server. Please check your internet connection.";
      } else if (error.message.includes('HTTP error')) {
        errorMessage += `Server error: ${error.message}`;
      } else if (error.message.includes('Backend processing failed')) {
        errorMessage += "Image analysis failed. Please try with a different image.";
      } else if (error.message.includes('Empty response')) {
        errorMessage += "Server returned empty response. Please try again.";
      } else {
        errorMessage += "Please try again.";
      }
      
      alert(errorMessage);
    });
}

/**
 * 업로드 상태 초기화 함수
 */
function resetUploadState() {
  console.log("업로드 상태 초기화");
  isUploading = false;
  if (uploadController) {
    uploadController.abort();
    uploadController = null;
  }
}

/**
 * 백엔드 데이터 변환 함수
 */
function transformBackendData(backendData) {
  try {
    if (!backendData || typeof backendData !== 'object') {
      throw new Error('Invalid backend data structure');
    }

    const forbiddenIngredients = Array.isArray(backendData.found_forbidden) 
      ? backendData.found_forbidden 
      : [];

    // OCR 텍스트에서 전체 재료 목록 추출
    const allIngredients = extractIngredientsFromOCR(backendData.ocr_text || '');
    
    // 금지된 재료가 없으면 모든 재료를 안전으로 분류
    const safeIngredients = forbiddenIngredients.length === 0 
      ? allIngredients 
      : allIngredients.filter(ingredient => 
          !forbiddenIngredients.some(forbidden => 
            ingredient.toLowerCase().includes(forbidden.toLowerCase())
          )
        );

    const transformedData = {
      danger: forbiddenIngredients,
      caution: [],
      safe: safeIngredients,
      _metadata: {
        date: backendData.Date,
        userType: backendData.user_type,
        isVegan: backendData.is_vegan,
        numberForbidden: backendData.number_forbidden,
        ocrText: backendData.ocr_text
      }
    };

    return transformedData;
    
  } catch (error) {
    console.error('백엔드 데이터 변환 에러:', error);
    
    return {
      danger: [],
      caution: [],
      safe: [],
      _error: 'Data transformation failed',
      _originalData: backendData
    };
  }
}

/**
 * OCR 텍스트에서 재료 목록 추출
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
    console.warn('OCR에서 재료 추출 에러:', error);
    return [];
  }
}

// 페이지 이탈 시 업로드 상태 초기화
window.addEventListener('beforeunload', () => {
  resetUploadState();
});

// 로딩 페이지에서 뒤로 가기 감지
if (window.location.pathname.includes('loading.html')) {
  window.addEventListener('popstate', () => {
    console.log("로딩 페이지에서 뒤로 가기 감지");
    resetUploadState();
    window.location.href = 'index.html';
  });
}

// 전역 함수로 노출 (loading.html에서 사용)
window.resetUploadState = resetUploadState;

// ========== Settings 페이지 전용 JavaScript ==========

document.addEventListener("DOMContentLoaded", () => {
  // Settings 페이지에서만 실행
  if (window.location.pathname.includes('settings.html')) {
    initializeSettingsPage();
  }
});

/**
 * 식단 타입 표시명 변환 함수
 * value 값을 하이픈 없는 깔끔한 표시명으로 변환
 */
function formatDietTypeDisplay(value) {
  const displayMap = {
    "Vegan": "Vegan",
    "Lacto vegetarian": "Lacto Vegetarian", 
    "Ovo vegetarian": "Ovo Vegetarian",
    "Lacto-ovo vegetarian": "Lacto Ovo Vegetarian",
    "Pesco-vegetarian": "Pesco Vegetarian", 
    "Pollo-vegetarian": "Pollo Vegetarian"
  };
  return displayMap[value] || value;
}

function initializeSettingsPage() {
  console.log("Settings 페이지 초기화 시작");

  // Settings 전용 요소들 참조 (충돌 방지를 위해 고유한 ID 사용)
  const dietTypeSelector = document.getElementById('settingsDietTypeSelector');
  const dietTypeModal = document.getElementById('settingsDietTypeModal');
  const cancelDietType = document.getElementById('settingsCancelDietType');
  const confirmDietType = document.getElementById('settingsConfirmDietType');
  const selectedType = document.getElementById('settingsSelectedType');
  
  const editNameBtn = document.getElementById('settingsEditNameBtn');
  const nameModal = document.getElementById('settingsNameModal');
  const nameInput = document.getElementById('settingsNameInput');
  const saveName = document.getElementById('settingsSaveName');
  const cancelName = document.getElementById('settingsCancelName');
  const userName = document.getElementById('settingsUserName');
  
  const profileInput = document.getElementById('settingsProfileInput');
  const profileImage = document.getElementById('settingsProfileImage');

  // ========== 식단 타입 모달 처리 ==========
  if (dietTypeSelector && dietTypeModal) {
    dietTypeSelector.addEventListener('click', () => {
      dietTypeModal.classList.add('active');
      // 현재 선택된 값 체크 - 표시명이 아닌 실제 저장된 value로 체크
      const currentValue = localStorage.getItem("vegType") || "Vegan";
      const radio = document.querySelector(`input[name="settingsVegtype"][value="${currentValue}"]`);
      if (radio) radio.checked = true;
    });

    if (cancelDietType) {
      cancelDietType.addEventListener('click', () => {
        dietTypeModal.classList.remove('active');
      });
    }

    if (confirmDietType) {
      confirmDietType.addEventListener('click', () => {
        const selected = document.querySelector('input[name="settingsVegtype"]:checked');
        if (selected) {
          // 수정된 부분: formatDietTypeDisplay 사용하여 하이픈 없는 표시명으로 변환
          selectedType.textContent = formatDietTypeDisplay(selected.value);
          localStorage.setItem("vegType", selected.value);
          updateSettingsFoodGroups(selected.value);
          
          // 백엔드에 업데이트 전송
          fetch('/api/update-user-type', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-type': selected.value
            },
            body: JSON.stringify({ type: selected.value })
          }).catch(err => console.warn("Failed to update user type:", err));
        }
        dietTypeModal.classList.remove('active');
      });
    }

    // 모달 바깥 클릭시 닫기
    dietTypeModal.addEventListener('click', (e) => {
      if (e.target === dietTypeModal) {
        dietTypeModal.classList.remove('active');
      }
    });
  }

  // ========== 이름 수정 모달 처리 ==========
  if (editNameBtn && nameModal && nameInput && userName) {
    editNameBtn.addEventListener('click', () => {
      nameInput.value = userName.textContent;
      nameModal.classList.add('active');
      // 입력 필드에 포커스
      setTimeout(() => nameInput.focus(), 100);
    });

    if (saveName) {
      saveName.addEventListener('click', () => {
        const newName = nameInput.value.trim();
        if (newName) {
          userName.textContent = newName;
          localStorage.setItem("userName", newName);
        }
        nameModal.classList.remove('active');
      });
    }

    if (cancelName) {
      cancelName.addEventListener('click', () => {
        nameModal.classList.remove('active');
      });
    }

    // Enter 키로 저장
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveName.click();
      }
    });

    // 모달 바깥 클릭시 닫기
    nameModal.addEventListener('click', (e) => {
      if (e.target === nameModal) {
        nameModal.classList.remove('active');
      }
    });
  }

  // ========== 프로필 이미지 처리 ==========
  if (profileImage && profileInput) {
    profileImage.addEventListener('click', () => {
      profileInput.click();
    });
    
    profileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result;
        profileImage.style.backgroundImage = `url(${imageUrl})`;
        profileImage.classList.add('has-image');
        localStorage.setItem("profileImage", imageUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  // ========== 저장된 데이터 불러오기 ==========
  loadSettingsData();
}

// Settings 데이터 불러오기 함수
function loadSettingsData() {
  const savedType = localStorage.getItem("vegType");
  const savedName = localStorage.getItem("userName");
  const savedImage = localStorage.getItem("profileImage");

  const selectedType = document.getElementById('settingsSelectedType');
  const userName = document.getElementById('settingsUserName');
  const profileImage = document.getElementById('settingsProfileImage');

  // 식단 타입 설정
  if (savedType && selectedType) {
    // 수정된 부분: formatDietTypeDisplay 사용하여 하이픈 없는 표시명으로 변환
    selectedType.textContent = formatDietTypeDisplay(savedType);
    updateSettingsFoodGroups(savedType);
  } else {
    // 기본값으로 Vegan 설정
    selectedType.textContent = "Vegan";
    updateSettingsFoodGroups('Vegan');
  }

  // 사용자 이름 설정
  if (savedName && userName) {
    userName.textContent = savedName;
  }

  // 프로필 이미지 설정
  if (savedImage && profileImage) {
    profileImage.style.backgroundImage = `url(${savedImage})`;
    profileImage.classList.add('has-image');
  }
}

// Settings 전용 식품군 아이콘 업데이트 함수
function updateSettingsFoodGroups(dietType) {
  const allItems = document.querySelectorAll('.settings-icon-item');
  
  // 모든 아이템 비활성화
  allItems.forEach(item => {
    item.classList.remove('active');
    const icon = item.querySelector('.settings-food-icon');
    const foodType = item.dataset.food;
    if (icon && foodType) {
      icon.src = `/static/images/icons/${foodType}_gray.png`;
    }
  });

  // 허용된 식품군 활성화
  const allowedFoods = getSettingsAllowedFoods(dietType);
  allowedFoods.forEach(food => {
    const item = document.querySelector(`.settings-icon-item[data-food="${food}"]`);
    if (item) {
      item.classList.add('active');
      const icon = item.querySelector('.settings-food-icon');
      if (icon) {
        if (food === 'meat') {
          // 고기는 항상 비활성화 상태 유지
          icon.src = `/static/images/icons/meat_gray.png`;
        } else {
          icon.src = `/static/images/icons/${food}.png`;
        }
      }
    }
  });

  console.log(`식품군 업데이트 완료: ${dietType}`, allowedFoods);
}

// Settings 전용 허용 식품군 가져오기 함수
function getSettingsAllowedFoods(dietType) {
  const allowedFoods = [];
  
  // 모든 채식 유형은 채소 포함
  if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("vegetable");
  }
  
  // 유제품 허용 유형
  if (["Lacto vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("dairy");
  }
  
  // 달걀 허용 유형
  if (["Ovo vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("egg");
  }
  
  // 생선 허용 유형
  if (["Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("fish");
  }
  
  // 가금류 허용 유형
  if (dietType === "Pollo-vegetarian") {
    allowedFoods.push("chicken");
  }
  
  // 고기는 모든 채식 유형에서 제외 (표시만 하고 활성화하지 않음)
  
  return allowedFoods;
}

// ========== ESC 키로 모달 닫기 ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && window.location.pathname.includes('settings.html')) {
    // 열린 모달들 찾아서 닫기
    const activeModals = document.querySelectorAll('.settings-modal.active');
    activeModals.forEach(modal => {
      modal.classList.remove('active');
    });
  }
});

// ========== 디버깅용 로그 함수 ==========
function logSettingsState() {
  console.log('=== Settings 상태 확인 ===');
  console.log('저장된 식단 타입:', localStorage.getItem("vegType"));
  console.log('저장된 사용자 이름:', localStorage.getItem("userName"));
  console.log('저장된 프로필 이미지:', localStorage.getItem("profileImage") ? '있음' : '없음');
  
  const activeItems = document.querySelectorAll('.settings-icon-item.active');
  console.log('활성화된 식품군:', Array.from(activeItems).map(item => item.dataset.food));
}