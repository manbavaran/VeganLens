
// 허서경의 주석
document.addEventListener("DOMContentLoaded", () => {
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
  if (storedImage) profileImage.style.backgroundImage = `url(${storedImage})`;
  if (storedName) userName.textContent = storedName;

  if (profileImage) {
    profileImage.addEventListener("click", () => {
      profileInput.click();
    });

    profileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const imageUrl = reader.result;
        profileImage.style.backgroundImage = `url(${imageUrl})`;
        localStorage.setItem("profileImage", imageUrl);
      };
      if (file) reader.readAsDataURL(file);
    });
  }

  if (editNameBtn) {
    editNameBtn.addEventListener("click", () => {
      nameModal.classList.remove("hidden");
      nameInput.value = userName.textContent;
    });
  }

  if (saveName) {
    saveName.addEventListener("click", () => {
      const newName = nameInput.value.trim();
      if (newName) {
        userName.textContent = newName;
        localStorage.setItem("userName", newName);
      }
      nameModal.classList.add("hidden");
    });
  }

  if (cancelName) {
    cancelName.addEventListener("click", () => {
      nameModal.classList.add("hidden");
    });
  }

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

  function updateIcons(type) {
    const activeSet = new Set(["fruit"]); // always on
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
      if (activeSet.has(icon.id)) {
        icon.classList.add("active");
      } else {
        icon.classList.remove("active");
      }
    });
  }

  const icons = document.querySelectorAll(".nav-icon");
  icons.forEach((icon) =>
    icon.addEventListener("click", () => {
      icons.forEach((i) => i.classList.remove("active"));
      icon.classList.add("active");
      const target = icon.querySelector("i").getAttribute("data-lucide");
      if (target === "settings") {
        location.href = "settings.html";
      } else if (target === "home") {
        location.href = "index.html";
      }
    })
  );
});
