
// 허서경의 주석

// 이 코드는 웹페이지의 프로필 설정 기능을 담당해요.
// 사용자 프로필 사진, 이름, 그리고 채식 유형을 관리하고 저장하는 로직이 담겨있죠.
// 페이지가 로드되면 저장된 사용자 설정을 불러와 적용합니다.

document.addEventListener("DOMContentLoaded", () => {

  // DOMContentLoaded: 웹페이지의 모든 HTML 내용이 완전히 로드된 후에 이 코드를 실행하라는 뜻이에요.
  // 이미지가 로드되기 전에도 스크립트를 실행할 수 있어 빠르게 반응합니다.

  // --- HTML 요소들을 미리 찾아두기 (변수에 할당) ---
  // 이렇게 요소를 미리 찾아두면 코드 여기저기서 필요한 HTML 요소에 쉽게 접근할 수 있어요.

  const profileInput = document.getElementById("profileInput"); // 프로필 사진 변경을 위한 숨겨진 파일 입력 필드
  const profileImage = document.getElementById("profileImage"); // 현재 프로필 사진이 표시되는 영역
  const userName = document.getElementById("userName"); // 사용자 이름이 표시되는 텍스트 요소
  const editNameBtn = document.getElementById("editNameBtn"); // 이름 편집 버튼
  const nameModal = document.getElementById("nameModal"); // 이름 편집 시 나타나는 팝업(모달)
  const nameInput = document.getElementById("nameInput"); // 모달 안에서 이름을 입력하는 칸
  const saveName = document.getElementById("saveName"); // 모달 안에서 이름 저장 버튼
  const cancelName = document.getElementById("cancelName"); // 모달 안에서 이름 취소 버튼

  const storedImage = localStorage.getItem("profileImage"); // 저장된 프로필 이미지 URL 가져오기
  const storedName = localStorage.getItem("userName");// 저장된 사용자 이름 가져오기

  if (storedImage) profileImage.style.backgroundImage = `url(${storedImage})`; // 저장된 이미지가 있다면 배경으로 설정
  
  if (storedName) userName.textContent = storedName; // 저장된 이름이 있다면 표시
  


  // --- 프로필 사진 변경 기능 ---
  // profileImage (보이는 사진 영역)를 클릭하면, 실제 파일 선택창을 띄웁니다.
  if (profileImage) {
    profileImage.addEventListener("click", () => {
      profileInput.click(); // 프로필 이미지 클릭 시 숨겨진 파일 입력 필드 클릭 (파일 선택창 열기)
    });

    // 파일이 선택되었을 때 발생하는 'change' 이벤트 처리
    profileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];  // 선택된 파일 가져오기 (첫 번째 파일)
      const reader = new FileReader(); // 파일을 읽기 위한 FileReader 객체 생성
      reader.onload = () => {
        // 파일 읽기가 완료되었을 때 실행되는 함수
        const imageUrl = reader.result; // 읽어들인 파일의 데이터 URL (이미지를 표시할 수 있는 형식)
        profileImage.style.backgroundImage = `url(${imageUrl})`; // 새 이미지를 프로필 사진으로 설정
        localStorage.setItem("profileImage", imageUrl); // 새 이미지 URL을 localStorage에 저장하여 다음 방문 시에도 유지
      };
      if (file) reader.readAsDataURL(file); // 파일을 Data URL 형식으로 읽기 시작
    });
  }


  // --- 사용자 이름 편집 기능 ---
  if (editNameBtn) {
    editNameBtn.addEventListener("click", () => {
      nameModal.classList.remove("hidden"); // 'hidden' 클래스를 제거하여 이름 편집 모달을 보이게 함
      nameInput.value = userName.textContent; // 현재 표시된 이름을 입력 필드에 미리 채워줌
    });
  }


  // 이름 저장 버튼 클릭 시
  if (saveName) {
    saveName.addEventListener("click", () => {
      const newName = nameInput.value.trim(); // 입력된 새 이름 가져오기 (공백 제거)
      if (newName) {
        // 새 이름이 비어있지 않다면
        userName.textContent = newName; // 화면의 사용자 이름을 새 이름으로 업데이트
        localStorage.setItem("userName", newName); // 새 이름을 localStorage에 저장
      }
      nameModal.classList.add("hidden"); // 모달을 다시 숨김
    });
  }
  // 이름 편집 취소 버튼 클릭 시
  if (cancelName) {
    cancelName.addEventListener("click", () => {
      nameModal.classList.add("hidden"); // 모달을 숨김 (변경사항 저장 안 함)
    });
  }

  // --- 채식 유형 선택 기능 (식단 아이콘 변경 포함) ---
  const toggleSelector = document.getElementById("toggleSelector"); // 채식 유형 선택 팝업을 열고 닫는 버튼
  const typePopup = document.getElementById("typePopup"); // 채식 유형을 선택하는 팝업
  const selectedType = document.getElementById("selectedType"); // 현재 선택된 채식 유형이 표시되는 텍스트

  if (toggleSelector && typePopup && selectedType) {
    toggleSelector.addEventListener("click", () => {
      typePopup.classList.toggle("hidden"); // 'hidden' 클래스를 토글하여 팝업을 보이거나 숨김
    });

    // 채식 유형 팝업 안에서 라디오 버튼 선택 시 (change 이벤트는 라디오/체크박스에서 유용)
    typePopup.addEventListener("change", (e) => {
      const selected = e.target.value;// 선택된 라디오 버튼의 값 (예: "Vegan")
      selectedType.textContent = selected; // 화면에 선택된 유형을 표시
      typePopup.classList.add("hidden"); // 팝업 숨김
      localStorage.setItem("vegType", selected); // 선택된 유형을 localStorage에 저장
      updateIcons(selected); // 선택된 유형에 따라 아이콘들을 업데이트하는 함수 호출
    });

    // 페이지 로드 시 저장된 채식 유형이 있는지 확인하고 적용
    const savedType = localStorage.getItem("vegType");
    if (savedType) {
      selectedType.textContent = savedType; // 저장된 유형을 화면에 표시
      updateIcons(savedType); // 저장된 유형에 맞춰 아이콘 업데이트
      // 라디오 버튼도 저장된 값에 맞춰 체크 표시 (사용자가 이전에 선택한 것을 시각적으로 보여줌)
      const radios = document.querySelectorAll("input[name='vegtype']");
      radios.forEach((r) => {
        if (r.value === savedType) r.checked = true;
      });
    }
  }


  // --- 식단 아이콘 업데이트 함수 ---
  // 이 함수는 선택된 채식 유형에 따라 어떤 식재료 아이콘이 활성화될지 결정합니다.
  // (예: 비건이면 야채 아이콘 활성화, 락토-오보 베지테리언이면 유제품, 계란 아이콘 활성화)
  function updateIcons(type) {
    const activeSet = new Set(["fruit"]); // 기본적으로 '과일' 아이콘은 항상 활성화되어 있어요.
    // Set을 사용하는 이유는 중복 없이 빠르게 항목을 추가하고 확인할 수 있기 때문입니다.

    // 선택된 채식 유형에 따라 추가로 활성화할 아이콘들을 activeSet에 추가합니다
    if (["Vegan", "Lacto vegetarian", "Lacto-ovo vegetarian", "Ovo vegetarian"].includes(type)) {
      activeSet.add("vegetable"); // 비건, 락토, 락토오보, 오보 베지테리언은 '채소' 활성화
    }
    if (["Lacto vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
      activeSet.add("dairy"); // 락토, 락토오보 베지테리언은 '유제품' 활성화
    }
    if (["Ovo vegetarian", "Lacto-ovo vegetarian"].includes(type)) {
      activeSet.add("egg"); // 오보, 락토오보 베지테리언은 '계란' 활성화
    }
    if (type === "Pesco-vegetarian") {
      activeSet.add("fish"); // 페스코 베지테리언은 '생선' 활성화
    }
    if (type === "Pollo-vegetarian") {
      activeSet.add("chicken"); // 폴로 베지테리언은 '닭고기' 활성화
    }

    // 모든 식재료 아이콘을 순회하며 'active' 클래스를 적용하거나 제거합니다.
    document.querySelectorAll(".icon").forEach((icon) => {
      if (activeSet.has(icon.id)) {
        icon.classList.add("active"); // 활성화해야 할 아이콘이면 'active' 클래스 추가 (스타일 적용)
      } else {
        icon.classList.remove("active"); // 활성화하지 않을 아이콘이면 'active' 클래스 제거
      }
    });
  }

  // --- 하단 내비게이션 아이콘 기능 ---
  // '홈', '설정' 등 하단 바에 있는 아이콘들의 동작을 정의합니다.
  const icons = document.querySelectorAll(".nav-icon"); // 모든 내비게이션 아이콘 가져오기
  icons.forEach((icon) =>
    icon.addEventListener("click", () => {
      icons.forEach((i) => i.classList.remove("active")); // 다른 모든 아이콘의 'active' 클래스 제거 (현재 클릭된 것만 강조되도록)
      icon.classList.add("active"); // 클릭된 아이콘에 'active' 클래스 추가

      // 클릭된 아이콘이 어떤 페이지로 이동해야 하는지 확인합니다.
      const target = icon.querySelector("i").getAttribute("data-lucide");
      if (target === "settings") {
        location.href = "settings.html"; // '설정' 아이콘이면 settings.html로 이동
      } else if (target === "home") {
        location.href = "index.html"; // '홈' 아이콘이면 index.html로 이동
      }
    })
  );
});
