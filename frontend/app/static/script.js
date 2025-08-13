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

  // Settings 페이지에서만 실행
  if (window.location.pathname.includes('settings.html')) {
    initializeSettingsPage();
  }
});

/**
 * 백엔드 응답 데이터를 로컬스토리지에 저장할 형식으로 변환
 */
function transformBackendData(backendData) {
  if (!backendData || typeof backendData !== 'object') {
    console.warn("Invalid backend data:", backendData);
    return { imageUrl: "", danger: [], caution: [], safe: [], _metadata: {} };
  }

  const danger = Array.isArray(backendData.found_forbidden) ? backendData.found_forbidden : [];
  const caution = Array.isArray(backendData.found_caution) ? backendData.found_caution : [];
  let safe = [];

  return {
    imageUrl: "",
    danger,
    caution,
    safe,
    _metadata: {
      date: backendData.Date || null,
      userType: backendData.user_type || null,
      isVegan: backendData.is_vegan ?? null,
      numberForbidden: backendData.number_forbidden ?? 0,
      isCaution: backendData.is_caution ?? null,
      numberCaution: backendData.number_caution ?? 0,
      ocrText: backendData.ocr_text || null,
      raw: backendData
    }
  };
}

/**
 * 업로드 상태 초기화 함수
 */
function resetUploadState() {
  console.log("resetUploadState 실행");
  isUploading = false;
  if (uploadController) {
    try {
      uploadController.abort();
    } catch (e) {
      console.warn("uploadController.abort 실패:", e);
    }
    uploadController = null;
  }
}

/**
 * 개선된 이미지 업로드 함수 - 빠른 로딩 페이지 전환
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
    console.error("파일 유효성 검사 실패: 빈 파일");
    alert("Please select a valid image file.");
    return;
  }

  // 파일 크기 제한 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  if (imageFile.size > MAX_FILE_SIZE) {
    console.error("파일 크기 초과:", imageFile.size);
    alert("File size is too large. Please select an image under 10MB.");
    return;
  }

  // 이미지 파일 타입 확인
  if (!imageFile.type.startsWith('image/')) {
    console.error("이미지 파일이 아님:", imageFile.type);
    alert("Please select an image file only.");
    return;
  }

  console.log("파일 유효성 검사 통과");
  
  // 핵심 개선: 즉시 로딩 페이지로 이동
  console.log("즉시 로딩 페이지로 이동");
  isUploading = true;
  
  // 이미지를 미리 Base64로 변환하여 localStorage에 임시 저장
  const reader = new FileReader();
  reader.onload = () => {
    const imageUrl = reader.result;
    
    // 임시 데이터를 먼저 저장
    const tempData = {
      imageUrl: imageUrl,
      status: 'processing',
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem("tempImageData", JSON.stringify(tempData));
    } catch (error) {
      console.warn("임시 데이터 저장 실패:", error);
    }
    
    // 즉시 로딩 페이지로 이동
    window.location.href = "loading.html";
    
    // 백그라운드에서 백엔드 요청 처리
    processImageInBackground(imageFile, imageUrl);
  };
  
  reader.onerror = (error) => {
    console.error("FileReader 에러:", error);
    resetUploadState();
    alert("Failed to process image. Please try again.");
  };
  
  reader.readAsDataURL(imageFile);
}

/**
 * 백그라운드에서 이미지 처리
 */
function processImageInBackground(imageFile, imageUrl) {
  const vegType = localStorage.getItem("vegType") || "Vegan";
  const formData = new FormData();
  formData.append("file", imageFile);

  uploadController = new AbortController();
  const timeoutId = setTimeout(() => {
    console.error("요청 타임아웃");
    uploadController.abort();
    handleBackgroundError("Request timeout. Please check your internet connection and try again.");
  }, 30000);

  if (!navigator.onLine) {
    console.error("네트워크 연결 없음");
    clearTimeout(timeoutId);
    handleBackgroundError("No internet connection. Please check your network and try again.");
    return;
  }

  const currentHost = window.location.hostname;
  const SERVER_URL = `http://${currentHost}:8000/Check_Vegan`;

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
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
      }

      return res.json();
    })
    .then((backendData) => {
      if (backendData.error || backendData.status === 'error') {
        throw new Error(backendData.message || backendData.error || "Backend processing failed");
      }

      if (!backendData || Object.keys(backendData).length === 0) {
        throw new Error("Empty response from backend");
      }
      
      const transformedData = transformBackendData(backendData);
      transformedData.imageUrl = imageUrl;
      
      try {
        localStorage.setItem("resultData", JSON.stringify(transformedData));
        localStorage.removeItem("tempImageData");
        console.log("백그라운드 처리 완료, 결과 데이터 저장됨");
      } catch (storageError) {
        console.error("localStorage 저장 실패:", storageError);
        handleBackgroundError("Failed to save results.");
      }
      
      resetUploadState();
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      console.error("백그라운드 처리 에러:", error);
      
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
      
      handleBackgroundError(errorMessage);
    });
}

/**
 * 백그라운드 처리 중 에러 발생 시 처리
 */
function handleBackgroundError(errorMessage) {
  resetUploadState();
  
  const errorData = {
    error: true,
    message: errorMessage,
    timestamp: Date.now()
  };
  
  try {
    localStorage.setItem("uploadError", JSON.stringify(errorData));
    localStorage.removeItem("tempImageData");
  } catch (error) {
    console.warn("에러 데이터 저장 실패:", error);
  }
}

// ========== Settings 페이지 전용 JavaScript ==========

/**
 * 식단 타입 표시명 변환 함수
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

  // 식단 타입 모달 처리
  if (dietTypeSelector && dietTypeModal) {
    dietTypeSelector.addEventListener('click', () => {
      dietTypeModal.classList.add('active');
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
          selectedType.textContent = formatDietTypeDisplay(selected.value);
          localStorage.setItem("vegType", selected.value);
          updateSettingsFoodGroups(selected.value);
          
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

    dietTypeModal.addEventListener('click', (e) => {
      if (e.target === dietTypeModal) {
        dietTypeModal.classList.remove('active');
      }
    });
  }

  // 이름 수정 모달 처리
  if (editNameBtn && nameModal && nameInput && userName) {
    editNameBtn.addEventListener('click', () => {
      nameInput.value = userName.textContent;
      nameModal.classList.add('active');
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

    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveName.click();
      }
    });

    nameModal.addEventListener('click', (e) => {
      if (e.target === nameModal) {
        nameModal.classList.remove('active');
      }
    });
  }

  // 프로필 이미지 처리
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

  loadSettingsData();
}

function loadSettingsData() {
  const savedType = localStorage.getItem("vegType");
  const savedName = localStorage.getItem("userName");
  const savedImage = localStorage.getItem("profileImage");

  const selectedType = document.getElementById('settingsSelectedType');
  const userName = document.getElementById('settingsUserName');
  const profileImage = document.getElementById('settingsProfileImage');

  if (savedType && selectedType) {
    selectedType.textContent = formatDietTypeDisplay(savedType);
    updateSettingsFoodGroups(savedType);
  } else {
    selectedType.textContent = "Vegan";
    updateSettingsFoodGroups('Vegan');
  }

  if (savedName && userName) {
    userName.textContent = savedName;
  }

  if (savedImage && profileImage) {
    profileImage.style.backgroundImage = `url(${savedImage})`;
    profileImage.classList.add('has-image');
  }
}

function updateSettingsFoodGroups(dietType) {
  const allItems = document.querySelectorAll('.settings-icon-item');
  
  allItems.forEach(item => {
    item.classList.remove('active');
    const icon = item.querySelector('.settings-food-icon');
    const foodType = item.dataset.food;
    if (icon && foodType) {
      icon.src = `/static/images/icons/${foodType}_gray.png`;
    }
  });

  const allowedFoods = getSettingsAllowedFoods(dietType);
  allowedFoods.forEach(food => {
    const item = document.querySelector(`.settings-icon-item[data-food="${food}"]`);
    if (item) {
      item.classList.add('active');
      const icon = item.querySelector('.settings-food-icon');
      if (icon) {
        if (food === 'meat') {
          icon.src = `/static/images/icons/meat_gray.png`;
        } else {
          icon.src = `/static/images/icons/${food}.png`;
        }
      }
    }
  });

  console.log(`식품군 업데이트 완료: ${dietType}`, allowedFoods);
}

function getSettingsAllowedFoods(dietType) {
  const allowedFoods = [];
  
  if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("vegetable");
  }
  
  if (["Lacto vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("dairy");
  }
  
  if (["Ovo vegetarian", "Lacto-ovo vegetarian", "Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("egg");
  }
  
  if (["Pesco-vegetarian", "Pollo-vegetarian"].includes(dietType)) {
    allowedFoods.push("fish");
  }
  
  if (dietType === "Pollo-vegetarian") {
    allowedFoods.push("chicken");
  }
  
  return allowedFoods;
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && window.location.pathname.includes('settings.html')) {
    const activeModals = document.querySelectorAll('.settings-modal.active');
    activeModals.forEach(modal => {
      modal.classList.remove('active');
    });
  }
});

function logSettingsState() {
  console.log('=== Settings 상태 확인 ===');
  console.log('저장된 식단 타입:', localStorage.getItem("vegType"));
  console.log('저장된 사용자 이름:', localStorage.getItem("userName"));
  console.log('저장된 프로필 이미지:', localStorage.getItem("profileImage") ? '있음' : '없음');
  
  const activeItems = document.querySelectorAll('.settings-icon-item.active');
  console.log('활성화된 식품군:', Array.from(activeItems).map(item => item.dataset.food));
}