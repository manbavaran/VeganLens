import io
import os
import matplotlib.pyplot as plt
from google.cloud import vision
import json # JSON 파일 로드를 위해 필요

# --- 0. Google Cloud Vision API 인증 정보 설정 ---
# **여기에 업로드한 서비스 계정 키 파일의 정확한 경로를 입력하세요!**
# 예시: '/content/ornate-hangar-467000-c4-ba593693476e.json'
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/content/YOUR_SERVICE_ACCOUNT_KEY_FILE_NAME.json"

# Google Cloud Vision API 클라이언트 초기화
vision_client = vision.ImageAnnotatorClient()


# --- 비건 금지 성분 리스트 로드 (두 가지 JSON 파일에서 읽어옴) ---
# **vegan_rules.json 및 pesco_rules.json 파일의 정확한 경로를 입력하세요!**
VEGAN_RULES_JSON_PATH = "/content/vegan_rules.json" 
PESCO_RULES_JSON_PATH = "/content/pesco_rules.json" 

# 각 사용자 유형별 금지 성분 리스트를 담을 전역 딕셔너리 (값은 키워드 리스트의 통합)
FORBIDDEN_KEYWORDS_BY_TYPE = {}

# 'Strict Vegan' 규칙 로드 (vegan_rules.json)
try:
    with open(VEGAN_RULES_JSON_PATH, "r", encoding="utf-8") as f:
        vegan_data = json.load(f)
        # 딕셔너리의 모든 값(리스트)을 하나의 평탄화된 리스트로 만듦
        # 예: {"쇠고기": ["beef", "쇠고기"]} -> ["beef", "쇠고기"]
        FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = [keyword for sublist in vegan_data.values() for keyword in sublist]
    print(f"vegan_rules.json 로드 성공: {VEGAN_RULES_JSON_PATH}")
except FileNotFoundError:
    print(f"오류: vegan_rules.json 파일을 찾을 수 없습니다. 경로를 확인해주세요: {VEGAN_RULES_JSON_PATH}")
    FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = []
except json.JSONDecodeError:
    print(f"오류: vegan_rules.json 파일이 유효한 JSON 형식이 아닙니다.")
    FORBIDDEN_KEYWORDS_BY_TYPE["Strict Vegan"] = []


# 'Pesco' 규칙 로드 (pesco_rules.json)
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
INGREDIENT_START_KEYWORDS = ["원재료명", "원재료", "성분명", "성분", "INGREDIENTS", "원료명"]
INGREDIENT_END_KEYWORDS = [
    "함유", "포함", "Contains", "유통전문판매원", "제조원",
    "소비기한", "유통기한", "영양정보", "영양성분", "Nutrition Facts",
    "보관방법", "조리방법", "고객상담", "주의사항", "반품 및 교환",
    "원산지", "칼로리", "단백질", "지방", "탄수화물",
    "총 내용량", "바코드",
]

# --- 헬퍼 함수 정의 ---
def contains_keyword(text_content: str, keywords: list) -> bool:
    """주어진 텍스트가 키워드 리스트 중 하나를 포함하는지 판단하는 함수 (공백 제거 후 대소문자 무시)"""
    text_upper_no_space = text_content.upper().replace(" ", "")
    for keyword in keywords:
        if keyword.upper().replace(" ", "") in text_upper_no_space:
            return True
    return False

def check_forbidden_ingredients(text: str, ban_list: list[str]) -> list[str]:
    """
    텍스트 내에서 주어진 금지 키워드(ban_list)를 찾아 리스트로 반환합니다.
    (카테고리 분류 없이 단순히 발견된 금지 성분만 반환)
    """
    if not text or not ban_list:
        return []
    
    text_clean = text.upper().replace(" ", "").replace("\n", "")
    found_forbidden = []

    for keyword in ban_list: 
        if len(keyword.strip()) < 2: # 짧은 키워드 제외 (오탐 방지)
            continue
        
        if keyword.upper().replace(" ", "") in text_clean:
            found_forbidden.append(keyword)
            
    return sorted(list(set(found_forbidden))) # 중복 제거 및 정렬


def process_image_with_google_vision_only(image_path: str, user_type: str = "Strict Vegan"):
    """
    Google Cloud Vision API로 텍스트 탐지 및 인식 (단일 API 호출)
    그리고 '원재료명' 섹션 정교하게 추출 및 비건 성분 확인
    """
    print(f"\n--- 이미지: {image_path} 처리 시작 ---")

    if not os.path.exists(image_path):
        print(f"오류: 파일 '{image_path}'를 찾을 수 없습니다. 경로를 확인해주세요.")
        return ""

    # 이미지 파일을 바이트(bytes)로 읽어 Vision API Image 객체 생성
    with io.open(image_path, 'rb') as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    try:
        # --- 1단계: Google Cloud Vision API 호출 (텍스트 감지 및 인식 동시 수행) ---
        response = vision_client.document_text_detection(image=image)
        
        full_text_from_image = response.full_text_annotation.text if response.full_text_annotation else ""
        print("\n[이미지에서 추출된 전체 텍스트 (Raw, 일부만 출력)]: \n", full_text_from_image[:500], "...")

        extracted_ingredient_section_texts = []
        in_ingredient_section = False # '원재료명' 섹션에 진입했는지 여부 플래그
        
        if response.full_text_annotation and response.full_text_annotation.pages:
            for page in response.full_text_annotation.pages:
                for block_idx, block in enumerate(page.blocks):
                    block_text_content = ""
                    for paragraph in block.paragraphs:
                        para_text = ""
                        for word in paragraph.words:
                            word_text = ''.join([symbol.text for symbol in word.symbols])
                            para_text += word_text
                        if para_text:
                            block_text_content += para_text + " "
                    block_text_content = block_text_content.strip()

                    if not block_text_content or len(block_text_content) < 3: 
                        if not in_ingredient_section: continue
                        
                    if not in_ingredient_section:
                        if contains_keyword(block_text_content, INGREDIENT_START_KEYWORDS):
                            in_ingredient_section = True
                            
                            start_index_in_block = -1
                            temp_block_text_no_space = block_text_content.upper().replace(" ", "")
                            
                            for keyword in INGREDIENT_START_KEYWORDS:
                                keyword_upper_no_space = keyword.upper().replace(" ", "")
                                if keyword_upper_no_space in temp_block_text_no_space:
                                    current_found_index = block_text_content.upper().replace(" ", "").find(keyword_upper_no_space)
                                    if start_index_in_block == -1 or current_found_index < start_index_in_block:
                                        start_index_in_block = current_found_index
                            
                            if start_index_in_block != -1:
                                sliced_block_text = block_text_content[start_index_in_block:].strip()
                                if sliced_block_text.startswith(':'):
                                    sliced_block_text = sliced_block_text[1:].strip()
                                extracted_ingredient_section_texts.append(sliced_block_text)
                            else: 
                                extracted_ingredient_section_texts.append(block_text_content)
                            
                            if contains_keyword(extracted_ingredient_section_texts[-1], INGREDIENT_END_KEYWORDS):
                                in_ingredient_section = False
                                break 
                            continue 

                    if in_ingredient_section:
                        if contains_keyword(block_text_content, INGREDIENT_END_KEYWORDS):
                            extracted_ingredient_section_texts.append(block_text_content) 
                            in_ingredient_section = False 
                            break 
                        
                        extracted_ingredient_section_texts.append(block_text_content)
                
                if not in_ingredient_section and extracted_ingredient_section_texts: 
                    break 

        # --- 3단계: 최종 '원재료명' 섹션 텍스트 조합 및 출력 ---
        print("\n--- '원재료명'으로 추정되는 섹션에서 추출된 텍스트 ---")
        if extracted_ingredient_section_texts:
            final_ingredient_text_raw = "\n".join(extracted_ingredient_section_texts)
            
            final_refined_text = final_ingredient_text_raw
            lines = final_ingredient_text_raw.split('\n')
            
            last_valid_line_index = -1
            for i in range(len(lines) - 1, -1, -1):
                if contains_keyword(lines[i], INGREDIENT_END_KEYWORDS):
                    last_valid_line_index = i 
                    break 
            
            if last_valid_line_index != -1: 
                final_refined_text = "\n".join(lines[:last_valid_line_index + 1])
            else:
                final_refined_text = final_ingredient_text_raw 

            print(final_refined_text)
            
            # --- 비건 금지 성분 확인 ---
            # user_type에 따라 적절한 금지 리스트를 가져옵니다.
            # user_rules.json이 아닌, FORBIDDEN_KEYWORDS_BY_TYPE에서 가져옴
            ban_list_for_check = FORBIDDEN_KEYWORDS_BY_TYPE.get(user_type, [])
            
            found_forbidden = check_forbidden_ingredients(final_refined_text, ban_list_for_check)
            
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

            return final_refined_text 

        else:
            print("이미지에서 '원재료명'으로 추정되는 섹션을 찾지 못했습니다.")
            print("전체 추출된 텍스트를 바탕으로 수동 확인이 필요할 수 있습니다.")
            return "원재료명 섹션을 인식할 수 없습니다."

    except Exception as e:
        print(f"Google Cloud Vision API 호출 중 오류 발생: {e}")
        return f"API 호출 또는 처리 중 오류 발생: {e}"

# --- 메인 실행 부분 ---
if __name__ == "__main__":
    # user_type을 "Strict Vegan" 또는 "Pesco"로 변경하여 테스트할 수 있습니다.
    test_user_type = "Strict Vegan" 
    
    # 시험할 이미지 파일 목록 (상단에 정의된 image_files 사용)
    # Colab 환경에 맞춰 /content/ 경로 사용
    image_files_to_process = [
        "/content/KakaoTalk_20250721_190944820_02.jpg",
        "/content/KakaoTalk_20250721_190944820_04.jpg",
        "/content/KakaoTalk_20250721_190944820_06.jpg",
        "/content/KakaoTalk_20250721_190944820_09.jpg",
    ]
    
    for img_file in image_files_to_process:
        process_image_with_google_vision_only(img_file, user_type=test_user_type)