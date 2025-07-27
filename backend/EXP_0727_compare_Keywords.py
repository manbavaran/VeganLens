# 필요한 라이브러리들을 임포트합니다.
import io # 파일 입출력을 다루기 위함 (바이트 스트림)
import os # 파일 경로 등을 다루기 위함
import matplotlib.pyplot as plt # 이미지 시각화를 위함
from google.cloud import vision # Google Cloud Vision API를 사용하기 위함
import json # JSON 파일을 읽기 위함

# --- 0. Google Cloud Vision API 인증 정보 설정 ---
# Google Cloud Platform에서 다운로드한 서비스 계정 키 파일의 경로를 환경 변수에 설정합니다.
# 이 파일은 Vision API를 호출할 때 여러분이 인증된 사용자임을 증명하는 '신분증' 역할을 합니다.
# **여기에 업로드한 서비스 계정 키 파일의 정확한 경로를 입력하세요!**
# 예시: '/content/ornate-hangar-467000-c4-ba593693476e.json' (Colab 환경 경로)
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/content/YOUR_SERVICE_ACCOUNT_KEY_FILE_NAME.json"

# Google Cloud Vision API 클라이언트 초기화
# 이제 'client' 객체를 통해 Vision API의 다양한 기능을 호출할 수 있습니다.
vision_client = vision.ImageAnnotatorClient()


# --- 비건 금지 성분 리스트 로드 (두 가지 JSON 파일에서 읽어옴) ---
# 'Strict Vegan'과 'Pesco' 사용자 유형별 금지 성분 규칙이 담긴 JSON 파일들의 경로를 정의합니다.
VEGAN_RULES_JSON_PATH = "/content/vegan_rules.json" 
PESCO_RULES_JSON_PATH = "/content/pesco_rules.json" 

# 각 사용자 유형별(예: "Strict Vegan", "Pesco") 금지 성분 키워드 리스트를 저장할 딕셔너리입니다.
# 딕셔너리의 '값'은 JSON 파일에서 읽어온 모든 금지 키워드를 합친 하나의 평탄화된 리스트가 됩니다.
FORBIDDEN_KEYWORDS_BY_TYPE = {}

# --- 'Strict Vegan' (비건) 규칙 로드 ---
# vegan_rules.json 파일을 읽어서 "Strict Vegan" 키워드 리스트를 로드합니다.
try:
    with open(VEGAN_RULES_JSON_PATH, "r", encoding="utf-8") as f:
        vegan_data = json.load(f)
        # JSON 파일이 {"Strict Vegan": [...] } 형태일 수도 있고, 바로 [...] 형태일 수도 있으므로,
        # .get("Strict Vegan", vegan_data)를 사용하여 유연하게 리스트를 가져옵니다.
        FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = [keyword for sublist in vegan_data.values() for keyword in sublist]
    print(f"vegan_rules.json 로드 성공: {VEGAN_RULES_JSON_PATH}")
except FileNotFoundError:
    print(f"오류: vegan_rules.json 파일을 찾을 수 없습니다. 경로를 확인해주세요: {VEGAN_RULES_JSON_PATH}")
    FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = [] # 파일 없을 시 기본값 (빈 리스트)
except json.JSONDecodeError:
    print(f"오류: vegan_rules.json 파일이 유효한 JSON 형식이 아닙니다.")
    FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = [] # JSON 오류 시 기본값


# --- 'Pesco' 규칙 로드 ---
# pesco_rules.json 파일을 읽어서 "Pesco" 키워드 리스트를 로드합니다.
try:
    with open(PESCO_RULES_JSON_PATH, "r", encoding="utf-8") as f:
        pesco_data = json.load(f)
        FORBIDDEN_KEYWORDS_BY_TYPE["Pesco"] = [keyword for sublist in pesco_data.values() for keyword in sublist]
    print(f"pesco_rules.json 로드 성공: {PESCO_RULES_JSON_PATH}")
except FileNotFoundError:
    print(f"오류: pesco_rules.json 파일을 찾을 수 없습니다. 경로를 확인해주세요: {PESCO_RULES_JSON_PATH}")
    FORBIDDEN_KEYWORDS_BY_TYPE["Pesco"] = []
except json.JSONDecodeError:
    print(f"오류: pesco_rules.json 파일이 유효한 JSON 형식이 아닙니다.")
    FORBIDDEN_KEYWORDS_BY_TYPE["Pesco"] = []


# --- '원재료명' 섹션 시작점 및 종료점 식별을 위한 키워드 ---
# Google Vision API가 인식한 텍스트에서 '원재료명' 섹션을 찾기 위한 단서들입니다.
INGREDIENT_START_KEYWORDS = ["원재료명", "원재료", "성분명", "성분", "INGREDIENTS", "원료명"]
# '원재료명' 섹션이 끝났음을 알리는 강력한 키워드들입니다. (예: 알레르기 표기, 제조사 정보, 영양 정보 등)
INGREDIENT_END_KEYWORDS = [
    "함유", "포함", "Contains", # 알레르기/포함 성분 표기
    "유통전문판매원", "제조원", "소비기한", "유통기한", "품목보고번호", # 제조사/유통 관련
    "영양정보", "영양성분", "Nutrition Facts", # 영양정보 시작
    "보관방법", "조리방법", "고객상담", "주의사항", "반품 및 교환", # 기타 안내
    "원산지", # 원산지 단독 표기 (때로는 성분표 뒤에 나옴)
    "칼로리", "단백질", "지방", "탄수화물", # 영양정보의 개별 항목도 종료 신호로 활용
    "총 내용량", "바코드", # 제품의 다른 정보 시작
]

# --- 헬퍼 함수 정의 ---

def contains_keyword(text_content: str, keywords: list) -> bool:
    """
    주어진 텍스트 내용(text_content)에 키워드 리스트(keywords) 중 하나라도 포함되어 있는지 판단합니다.
    - 텍스트와 키워드의 공백을 제거하고 모두 대문자로 변환하여 비교하므로, 대소문자나 띄어쓰기 오류에 강합니다.
    """
    text_upper_no_space = text_content.upper().replace(" ", "")
    for keyword in keywords:
        if keyword.upper().replace(" ", "") in text_upper_no_space:
            return True
    return False

def check_forbidden_ingredients(text: str, ban_list: list[str]) -> list[str]:
    """
    OCR로 추출된 전체 텍스트(text) 내에서 주어진 금지 키워드 리스트(ban_list)를 찾아 반환합니다.
    - 발견된 금지 성분들을 중복 없이 정렬된 리스트로 반환합니다.
    - 이 함수는 카테고리(확실한 금지, 주의 필요 등) 분류는 하지 않고, 단순히 ban_list에 있는 성분이 텍스트에 포함되었는지 여부만 확인합니다.
    """
    if not text or not ban_list: # 텍스트나 금지 리스트가 비어있으면 빈 리스트 반환
        return []
    
    text_clean = text.upper().replace(" ", "").replace("\n", "") # 텍스트에서 공백과 줄바꿈 제거하여 검색 효율 높임
    found_forbidden = []

    for keyword in ban_list: 
        if len(keyword.strip()) < 2: # 검색할 키워드가 너무 짧으면 오탐(잘못된 탐지) 방지를 위해 건너뜁니다.
            continue
        
        if keyword.upper().replace(" ", "") in text_clean: # 키워드를 대문자/공백 제거 후 텍스트에 포함되는지 확인
            found_forbidden.append(keyword) # 발견되면 리스트에 추가
            
    return sorted(list(set(found_forbidden))) # 중복 제거 후 알파벳 순으로 정렬하여 반환


def process_image_with_google_vision_only(image_path: str, user_type: str = "Strict Vegan"):
    """
    Google Cloud Vision API를 사용하여 이미지에서 텍스트를 탐지 및 인식하고,
    '원재료명' 섹션을 정교하게 추출한 후, 비건 금지 성분을 확인합니다.
    """
    print(f"\n--- 이미지: {image_path} 처리 시작 ---")

    if not os.path.exists(image_path):
        print(f"오류: 파일 '{image_path}'를 찾을 수 없습니다. 경로를 확인해주세요.")
        return "" # 파일이 없으면 빈 문자열 반환

    # 이미지 파일을 바이트(bytes) 형태로 읽어 Google Vision API의 Image 객체로 생성합니다.
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    try:
        # --- 1단계: Google Cloud Vision API 호출 (텍스트 감지 및 인식 동시 수행) ---
        # document_text_detection은 이미지 전체의 텍스트와 그 구조(블록, 문단 등)를 분석하여 반환합니다.
        response = vision_client.document_text_detection(image=image)
        
        # 이미지에서 추출된 전체 텍스트 (Raw)를 확인용으로 출력합니다. (길 경우 일부만)
        full_text_from_image = response.full_text_annotation.text if response.full_text_annotation else ""
        print("\n[이미지에서 추출된 전체 텍스트 (Raw, 일부만 출력)]: \n", full_text_from_image[:500], "...")

        extracted_ingredient_section_texts = [] # 최종 추출된 '원재료명' 섹션의 텍스트 줄들을 저장할 리스트
        in_ingredient_section = False # 현재 '원재료명' 섹션 안에 있는지 여부를 추적하는 플래그
        
        # Google Vision API가 탐지한 페이지 내의 블록들을 순회합니다.
        if response.full_text_annotation and response.full_text_annotation.pages:
            for page in response.full_text_annotation.pages:
                for block_idx, block in enumerate(page.blocks):
                    # 현재 블록의 모든 텍스트를 합쳐 하나의 문자열로 만듭니다.
                    block_text_content = ""
                    for paragraph in block.paragraphs:
                        para_text = ""
                        for word in paragraph.words:
                            word_text = ''.join([symbol.text for symbol in word.symbols])
                            para_text += word_text
                        if para_text:
                            block_text_content += para_text + " " # 단락 사이에 공백 추가
                    block_text_content = block_text_content.strip() # 최종 공백 제거

                    # 빈 블록이나 매우 짧은 블록은 유효한 내용으로 간주하지 않습니다.
                    if not block_text_content or len(block_text_content) < 3: 
                        if not in_ingredient_section: # 아직 성분표 시작 전이면 이런 블록은 건너뜁니다.
                            continue
                        # 성분표 섹션에 진입했다면, 짧은 블록도 포함할 수 있도록 함 (줄바꿈 등으로 인해 분리된 경우)

                    # 1. 성분표 시작점 탐지 (아직 '원재료명' 섹션에 진입하지 않은 상태)
                    if not in_ingredient_section:
                        if contains_keyword(block_text_content, INGREDIENT_START_KEYWORDS):
                            in_ingredient_section = True # 성분표 섹션 진입 플래그를 True로 설정
                            
                            # **시작 키워드 이후부터 텍스트를 수집하여 정확한 시작점을 잡습니다.**
                            # 예: "총 내용량 100g 원재료명: 설탕, 밀가루" 에서 "원재료명:" 이후부터 가져옴
                            start_index_in_block = -1
                            temp_block_text_no_space = block_text_content.upper().replace(" ", "")
                            
                            for keyword in INGREDIENT_START_KEYWORDS:
                                keyword_upper_no_space = keyword.upper().replace(" ", "")
                                if keyword_upper_no_space in temp_block_text_no_space:
                                    # 원본 블록 텍스트에서 해당 키워드의 시작 인덱스를 찾습니다.
                                    current_found_index = block_text_content.upper().replace(" ", "").find(keyword_upper_no_space)
                                    if start_index_in_block == -1 or current_found_index < start_index_in_block:
                                        start_index_in_block = current_found_index
                            
                            if start_index_in_block != -1:
                                # 시작 키워드 이후부터 블록 텍스트를 잘라냅니다.
                                sliced_block_text = block_text_content[start_index_in_block:].strip()
                                # 잘라낸 텍스트가 콜론으로 시작하면 콜론을 제거합니다 (예: "원재료명:설탕" -> "설탕")
                                if sliced_block_text.startswith(':'):
                                    sliced_block_text = sliced_block_text[1:].strip()
                                extracted_ingredient_section_texts.append(sliced_block_text)
                            else: # 시작 키워드를 찾았으나 슬라이싱 인덱스 문제 발생 시 전체 블록 추가 (예외 처리)
                                extracted_ingredient_section_texts.append(block_text_content)
                            
                            # (매우 드묾) 시작 블록에 이미 종료 키워드가 포함되어 있다면 즉시 섹션 종료
                            if contains_keyword(extracted_ingredient_section_texts[-1], INGREDIENT_END_KEYWORDS):
                                in_ingredient_section = False
                                break # 현재 페이지의 블록 순회 종료
                            continue # 시작점을 찾았으니 다음 블록으로 이동하여 계속 수집

                    # 2. 성분표 섹션 내에서 텍스트 블록 수집 및 종료 조건 확인 (이미 섹션에 진입한 상태)
                    if in_ingredient_section:
                        # 현재 블록이 종료 키워드를 포함하는지 확인합니다 (이 키워드가 나오면 성분표 끝으로 판단).
                        if contains_keyword(block_text_content, INGREDIENT_END_KEYWORDS):
                            extracted_ingredient_section_texts.append(block_text_content) # 종료 키워드가 있는 블록도 포함
                            in_ingredient_section = False # 성분표 섹션 종료 플래그 설정
                            break # 현재 페이지의 블록 순회 종료
                        
                        # 종료 키워드가 없으면 현재 블록을 성분표의 일부로 간주하고 추가합니다.
                        extracted_ingredient_section_texts.append(block_text_content)
                
                # 현재 페이지에서 성분표 섹션이 종료되었거나(in_ingredient_section = False)
                # 또는 성분표 섹션을 찾지 못했으나 이미 추출된 텍스트가 있다면, 다음 페이지는 더 이상 검사하지 않습니다.
                if not in_ingredient_section and extracted_ingredient_section_texts: 
                    break 

        # --- 3단계: 최종 '원재료명' 섹션 텍스트 조합 및 후처리 ---
        print("\n--- '원재료명'으로 추정되는 섹션에서 추출된 텍스트 ---")
        if extracted_ingredient_section_texts:
            final_ingredient_text_raw = "\n".join(extracted_ingredient_section_texts)
            
            final_refined_text = final_ingredient_text_raw
            lines = final_ingredient_text_raw.split('\n')
            
            # 텍스트의 마지막 부분에 불필요한 내용이 포함되지 않도록, 마지막 '유효한' 줄을 찾습니다.
            last_valid_line_index = -1
            for i in range(len(lines) - 1, -1, -1): # 마지막 줄부터 역순으로 탐색
                if contains_keyword(lines[i], INGREDIENT_END_KEYWORDS):
                    last_valid_line_index = i # 종료 키워드가 포함된 줄의 인덱스 저장
                    break # 가장 마지막에 발견된 종료 키워드가 있는 줄까지가 유효하다고 판단
            
            if last_valid_line_index != -1: # 종료 키워드를 찾았다면
                final_refined_text = "\n".join(lines[:last_valid_line_index + 1]) # 해당 줄까지 포함하여 잘라냄
            else: # 종료 키워드를 찾지 못했다면, 시작점부터 수집된 모든 텍스트를 사용
                final_refined_text = final_ingredient_text_raw 

            print(final_refined_text)
            
            # --- 비건 금지 성분 확인 ---
            # user_type에 따라 적절한 금지 성분 리스트를 FORBIDDEN_KEYWORDS_BY_TYPE에서 가져옵니다.
            ban_list_for_check = FORBIDDEN_KEYWORDS_BY_TYPE.get(user_type, [])
            
            # check_forbidden_ingredients 함수를 호출하여 금지 성분을 찾습니다.
            found_forbidden = check_forbidden_ingredients(final_refined_text, ban_list_for_check)
            
            # 결과 출력 및 비건 판정 메시지
            if found_forbidden:
                print("\n--- 비건 금지 성분 확인 결과 ---")
                print(f"경고: 비건 금지 성분 발견! ({len(found_forbidden)}개)")
                for kw in found_forbidden:
                    print(f"- {kw}")
                print("❌ 비건 아님")
            else:
                print("\n--- 비건 금지 성분 확인 결과 ---")
                print("축하합니다! 비건 금지 성분이 발견되지 않았습니다.")
                print("✅ 비건 OK")

            # 함수가 최종적으로 추출된 텍스트를 반환하도록 합니다.
            return final_refined_text 

        else:
            # '원재료명' 섹션을 찾지 못했거나 텍스트가 없는 경우
            print("이미지에서 '원재료명'으로 추정되는 섹션을 찾지 못했습니다.")
            print("전체 추출된 텍스트를 바탕으로 수동 확인이 필요할 수 있습니다.")
            return "원재료명 섹션을 인식할 수 없습니다."

    except Exception as e:
        # Google Cloud Vision API 호출 또는 처리 중 예외 발생 시
        print(f"Google Cloud Vision API 호출 중 오류 발생: {e}")
        return f"API 호출 또는 처리 중 오류 발생: {e}"

# --- 메인 실행 부분 ---
# 이 부분은 이 파이썬 스크립트가 직접 실행될 때 동작하는 테스트 코드입니다.
# 'user_type'을 변경하여 다른 비건 기준(예: "Pesco")으로 테스트할 수 있습니다.
if __name__ == "__main__":
    # 테스트할 사용자 유형을 설정합니다. ("Strict Vegan" 또는 "Pesco")
    test_user_type = "Strict Vegan" 
    
    # 분석할 이미지 파일 목록입니다. Colab 환경에 맞춰 /content/ 경로를 사용합니다.
    image_files_to_process = [
        "/content/KakaoTalk_20250721_190944820_02.jpg",
        "/content/KakaoTalk_20250721_190944820_04.jpg",
        "/content/KakaoTalk_20250721_190944820_06.jpg",
        "/content/KakaoTalk_20250721_190944820_09.jpg",
    ]
    
    # 각 이미지 파일을 순회하며 분석을 시작합니다.
    for img_file in image_files_to_process:
        process_image_with_google_vision_only(img_file, user_type=test_user_type)