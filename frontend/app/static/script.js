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
      onboardingPopup.classList.add("hidden"); // 07 28 팝업 닫히게끔 수정
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

    // 식단 선택 시 저장 및 UI/서버 반영
    // 07 28 이벤트 동작 방식 수정 (전송 양식은 이전과 동일)
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
        });
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

    // 하단 탭 내비게이션 기능
    document.querySelectorAll(".icon").forEach((icon) => {
      const id = icon.id;

      // meat 항상 비활성화
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

  let selectedGalleryImage = null;

  if (cameraBtn && cameraInput) {
    cameraBtn.addEventListener("click", () => {
      cameraInput.click();
    });

    cameraInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        sendImageToBackend(file);
      }
    });
  }

  if (galleryBtn && galleryInput) {
    galleryBtn.addEventListener("click", () => {
      galleryInput.click();
    });

    galleryInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedGalleryImage = file;
        sendImageToBackend(file);
        selectedGalleryImage = null;
      }
    });
  }

  /**
   * 이미지를 백엔드 서버로 전송하여 비건 호환성 분석을 요청하는 함수
   * 
   * 주요 변경사항 (2024.08.05):
   * - 백엔드 데이터 형식 변환 로직 추가
   * - fetch 요청 취소 문제 해결: 페이지 이동을 fetch 성공 후로 변경
   * - 상세한 에러 처리 및 로깅 추가
   * - 네트워크 연결 상태 확인 기능 강화
   * - FileReader 에러 처리 추가
   * 
   * @param {File} imageFile - 업로드할 이미지 파일
   */
  function sendImageToBackend(imageFile) {
    // 사용자의 채식 유형 가져오기 (기본값: Vegan)
    const vegType = localStorage.getItem("vegType") || "Vegan";
    const formData = new FormData();
    formData.append("file", imageFile);

    // 디버깅용: 전송할 데이터 정보 로깅
    console.log("Sending image to backend:", {
      vegType,
      fileSize: imageFile.size,
      fileName: imageFile.name,
      fileType: imageFile.type
    });

    // 응답 시간 측정을 위한 시작 시간 기록
    const fetchStart = Date.now();

    // 수정: fetch 요청을 먼저 시작하고, 성공 시에만 로딩 페이지로 이동
    // (이전에는 로딩 페이지로 먼저 이동해서 fetch 요청이 취소되는 문제가 있었음)
    fetch("http://192.168.22.22:8000/Check_Vegan", {
      method: "POST",
      headers: {
        "x-user-type": vegType
      },
      body: formData
    })
      .then((res) => {
        // 응답 상태 및 헤더 로깅 (디버깅용)
        console.log("Response status:", res.status);
        console.log("Response headers:", res.headers);
        
        // HTTP 에러 상태 확인
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        // fetch가 성공적으로 시작되면 로딩 페이지로 이동
        window.location.href = "loading.html";
        
        return res.json();
      })
      .then((backendData) => {
        console.log("Received backend data:", backendData);
        
        // 🔄 백엔드 데이터를 프론트엔드 형식으로 변환
        const transformedData = transformBackendData(backendData);
        console.log("Transformed data:", transformedData);
        
        // 최소 1초간 로딩 화면 표시를 위한 대기 시간 계산
        const elapsed = Date.now() - fetchStart;
        const waitTime = Math.max(1000 - elapsed, 0);

        // 이미지 파일을 Base64로 변환하여 결과 페이지에서 표시
        const reader = new FileReader();
        reader.onload = () => {
          // 변환된 데이터에 이미지 URL 추가
          transformedData.imageUrl = reader.result;
          localStorage.setItem("resultData", JSON.stringify(transformedData));

          const goToResult = () => {
            window.location.href = "result.html";
          };

          // 최소 로딩 시간 보장
          if (waitTime > 0) {
            setTimeout(goToResult, waitTime);
          } else {
            goToResult();
          }
        };
        
        // FileReader 에러 처리 추가
        reader.onerror = () => {
          console.error("FileReader error");
          alert("Failed to process image. Please try again.");
          window.location.href = "index.html";
        };
        
        reader.readAsDataURL(imageFile);
      })
      .catch((err) => {
        console.error("Upload error:", err);
        
        // 에러 유형별로 구체적인 메시지 제공
        let errorMessage = "Upload failed. ";
        
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          errorMessage += "Cannot connect to server. Please check your internet connection.";
        } else if (err.message.includes('HTTP error')) {
          errorMessage += `Server error: ${err.message}`;
        } else {
          errorMessage += "Please try again.";
        }
        
        alert(errorMessage);
        // 에러 발생 시 메인 페이지로 돌아가기
        window.location.href = "index.html";
      });
  }

  /**
   * 백엔드 데이터를 프론트엔드 형식으로 변환
   */
  function transformBackendData(backendData) {
    try {
      // 백엔드 데이터 구조 검증
      if (!backendData || typeof backendData !== 'object') {
        throw new Error('Invalid backend data structure');
      }

      // found_forbidden 배열을 안전하게 처리
      const forbiddenIngredients = Array.isArray(backendData.found_forbidden) 
        ? backendData.found_forbidden 
        : [];

      // OCR 텍스트에서 전체 재료 목록 추출 (옵션)
      const allIngredients = extractIngredientsFromOCR(backendData.ocr_text || '');
      
      // 금지된 재료와 안전한 재료 분류
      const safeIngredients = allIngredients.filter(ingredient => 
        !forbiddenIngredients.some(forbidden => 
          ingredient.toLowerCase().includes(forbidden.toLowerCase())
        )
      );

      // 프론트엔드 형식으로 변환
      const transformedData = {
        // 현재는 모든 금지 재료를 danger로 분류
        // 필요시 사용자 타입에 따라 caution으로 분류하는 로직 추가 가능
        danger: forbiddenIngredients,
        caution: [], // 현재는 빈 배열, 필요시 로직 추가
        safe: safeIngredients,
        
        // 추가 메타데이터 (디버깅용)
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
      console.error('Error transforming backend data:', error);
      
      // 변환 실패 시 기본 구조 반환
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
   * OCR 텍스트에서 재료 목록 추출 (간단한 버전)
   */
  function extractIngredientsFromOCR(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') {
      return [];
    }

    try {
      // "ingredients:" 또는 "성분:" 다음의 텍스트를 찾아서 재료 추출
      const ingredientsMatch = ocrText.match(/(?:ingredients?|성분)[:\s]([^.]*)/i);
      
      if (!ingredientsMatch || !ingredientsMatch[1]) {
        return [];
      }

      // 쉼표, 세미콜론, 괄호 등으로 분리하고 정리
      const ingredients = ingredientsMatch[1]
        .split(/[,;()]/g)
        .map(ingredient => ingredient.trim())
        .filter(ingredient => 
          ingredient.length > 1 && 
          !/^\d+%?$/.test(ingredient) && // 숫자만 있는 것 제외
          ingredient.length < 30 // 너무 긴 것 제외
        )
        .slice(0, 20); // 최대 20개까지만

      return ingredients;
      
    } catch (error) {
      console.warn('Error extracting ingredients from OCR:', error);
      return [];
    }
  }

  // 구현되지 않은 기능 알림
  const liveCameraBtn = document.getElementById("liveCameraBtn");
  if (liveCameraBtn) {
    liveCameraBtn.addEventListener("click", () => {
      alert("This feature is coming soon.");
    });
  }

  // 아이콘 생성 라이브러리를 초기화
  lucide.createIcons();

});