document.addEventListener("DOMContentLoaded", () => {
  const stored = localStorage.getItem("resultData");
  if (!stored) {
    alert("분석 결과가 없습니다.");
    window.location.href = "index.html";
    return;
  }

  const analysisResult = JSON.parse(stored);

  // 이미지 출력
  const imagePreview = document.getElementById("imagePreview");
  imagePreview.style.backgroundImage = `url('${analysisResult.imageUrl}')`;

  // 결과 메시지
  const messageEl = document.getElementById("resultMessage");
  if (analysisResult.danger?.length > 0) {
    messageEl.textContent = "섭취가 불가능합니다.";
  } else if (analysisResult.caution?.length > 0) {
    messageEl.textContent = "섭취에 주의가 필요합니다.";
  } else {
    messageEl.textContent = "섭취가 가능합니다.";
  }

  const setupBox = (id, type, ingredients) => {
    const el = document.getElementById(id);
    if (ingredients.length === 0) {
      el.classList.add("disabled");
      return;
    }
    el.classList.add(type, "folded");
    el.addEventListener("click", () => {
      showModal(`${type.toUpperCase()} 성분:\n${ingredients.join(", ")}`);
    });
  };

  setupBox("dangerBox", "danger", analysisResult.danger);
  setupBox("cautionBox", "caution", analysisResult.caution);
  setupBox("safeBox", "safe", analysisResult.safe);

  const modal = document.getElementById("ingredientModal");
  const modalContent = document.getElementById("modalContent");
  const closeModal = document.getElementById("closeModal");

  function showModal(text) {
    modalContent.textContent = text;
    modal.classList.remove("hidden");
  }

  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // ✅ 말풍선 툴팁 토글 처리
  const tooltip = document.getElementById("tooltip");
  const infoIcon = document.getElementById("infoIcon");

  infoIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = tooltip.classList.contains("hidden");
    document.querySelectorAll(".tooltip").forEach(t => t.classList.add("hidden"));
    if (isHidden) tooltip.classList.remove("hidden");
  });

  document.addEventListener("click", () => {
    tooltip.classList.add("hidden");
  });

  // 닫기 버튼
  document.getElementById("closeBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});
