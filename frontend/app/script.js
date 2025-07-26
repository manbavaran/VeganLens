
// 허서경의 주석
document.addEventListener("DOMContentLoaded", () => {
  // 프로필 이미지 관련
  const profileInput = document.getElementById("profileInput");
  const profileImage = document.getElementById("profileImage");
  const userName = document.getElementById("userName");
  const editNameBtn = document.getElementById("editNameBtn");
  const nameModal = document.getElementById("nameModal");
  const nameInput = document.getElementById("nameInput");
  const saveName = document.getElementById("saveName");
  const cancelName = document.getElementById("cancelName");

  const storedImage = localStorage.getItem("profileImage");
  const storedName = localStorage.getItem("userName");
  if (storedImage && profileImage) profileImage.style.backgroundImage = `url(${storedImage})`;
  if (storedName && userName) userName.textContent = storedName;

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

  // 타입 선택 및 아이콘 활성화
  const toggleSelector = document.getElementById("toggleSelector");
  const typePopup = document.getElementById("typePopup");
  const selectedType = document.getElementById("selectedType");

  if (toggleSelector && typePopup && selectedType) {
    toggleSelector.addEventListener("click", () => {
      typePopup.classList.toggle("hidden");
    });

    typePopup.addEventListener("change", (e) => {
      const selected = e.target.value;
      selectedType.textContent = selected;
      typePopup.classList.add("hidden");
      localStorage.setItem("vegType", selected);
      updateIcons(selected);
    });

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

  // 픽토그램>이미지로 동작 수정
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

    document.querySelectorAll(".icon").forEach((icon) => {
      const id = icon.id;
      if (activeSet.has(id)) {
        icon.classList.add("active");
        icon.src = `images/icons/${id}.png`;  // 컬러 이미지
      } else {
        icon.classList.remove("active");
        icon.src = `images/icons/${id}_gray.png`;  // 흑백 이미지
      }
    });
  }


  // 기존 픽토그램 컬러 온/오프로 작동하던 방식
  // function updateIcons(type) {
  //   const activeSet = new Set(["fruit"]);
  //   if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian"].includes(type)) {
  //     activeSet.add("vegetable");
  //   }
  //   if (["Lacto vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
  //     activeSet.add("dairy");
  //   }
  //   if (["Ovo vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
  //     activeSet.add("egg");
  //   }
  //   if (type === "Pesco-vegetarian") {
  //     activeSet.add("fish");
  //   }
  //   if (type === "Pollo-vegetarian") {
  //     activeSet.add("chicken");
  //   }

  //   document.querySelectorAll(".icon").forEach((icon) => {
  //     if (activeSet.has(icon.id)) {
  //       icon.classList.add("active");
  //     } else {
  //       icon.classList.remove("active");
  //     }
  //   });
  // }

  // 하단 탭 클릭 시 페이지 이동
  document.querySelectorAll(".nav-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      const tab = icon.getAttribute("data-tab");
      if (tab === "settings") window.location.href = "settings.html";
      else if (tab === "home") window.location.href = "index.html";
      else if (tab === "grid") alert("Grid view not implemented yet.");
    });
  });

  // Lucide 아이콘 생성
  lucide.createIcons();
});
