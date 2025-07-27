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

      // 서버에 사용자 식단 유형을 등록
      fetch('/api/register-user-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-type': selected
        },
        body: JSON.stringify({ type: selected })
      }).then(() => {
        onboardingPopup.classList.add("hidden");
        location.reload();
      });
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
    typePopup.addEventListener("change", (e) => {
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
    const activeSet = new Set(["fruit"]);
    if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian"].includes(type)) {
      activeSet.add("vegetable");
    }
    if (["Lacto vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
      activeSet.add("dairy");
    }
    if (["Ovo vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
      activeSet.add("egg");
    }
    if (type === "Pesco-vegetarian") {
      activeSet.add("fish");
    }
    if (type === "Pollo-vegetarian") {
      activeSet.add("chicken");
    }

    // 하단 탭 내비게이션 기능
    document.querySelectorAll(".icon").forEach((icon) => {
      const id = icon.id;
      if (activeSet.has(id)) {
        icon.classList.add("active");
        icon.src = `images/icons/${id}.png`;
      } else {
        icon.classList.remove("active");
        icon.src = `images/icons/${id}_gray.png`;
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
        const confirmSend = confirm("이 이미지를 서버로 전송하시겠습니까?");
        if (confirmSend) {
          sendImageToBackend(file);
          selectedGalleryImage = null;
        } else {
          galleryInput.value = "";
        }
      }
    });
  }

  // 백엔드로 이미지 전송
  function sendImageToBackend(imageFile) {
    const vegType = localStorage.getItem("vegType") || "Vegan";
    const formData = new FormData();
    formData.append("image", imageFile);

    fetch("http://192.168.22.22:8000/Check_Vegan", {
      method: "POST",
      headers: {
        "x-user-type": vegType
      },
      body: formData
    })
      .then((res) => res.json())
      .then((data) => {
        alert("✅ 서버 응답: " + JSON.stringify(data));
      })
      .catch((err) => {
        alert("❌ 전송 실패: " + err.message);
      });
  }

  // 구현되지 않은 기능 알림
  const liveCameraBtn= document.getElementById("liveCameraBtn");
    if (liveCameraBtn) {
      liveCameraBtn.addEventListener("click", () => {
        alert("This feature is coming soon.");
      });
    }

  // 아이콘 생성 라이브러리를 초기화
  lucide.createIcons();
});
