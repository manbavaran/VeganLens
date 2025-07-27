import io
import os
import matplotlib.pyplot as plt
from google.cloud import vision
import json # user_rules.json 로드를 위해 필요

# --- 0. Google Cloud Vision API 인증 정보 설정 ---
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/content/YOUR_SERVICE_ACCOUNT_KEY_FILE_NAME.json"

# Google Cloud Vision API 클라이언트 초기화
vision_client = vision.ImageAnnotatorClient()


# --- user_rules.json 로드 ---
USER_RULES_JSON_PATH = "/content/user_rules.json" 

USER_RULES_DATA = {}
try:
    with open(USER_RULES_JSON_PATH, "r", encoding="utf-8") as f:
        USER_RULES_DATA = json.load(f)
    print(f"user_rules.json 로드 성공: {USER_RULES_JSON_PATH}")
except FileNotFoundError:
    print(f"오류: user_rules.json 파일을 찾을 수 없습니다. 경로를 확인해주세요: {USER_RULES_JSON_PATH}")
    USER_RULES_DATA = {"Strict Vegan": []} # 파일 없을 시 기본값 (빈 리스트)
except json.JSONDecodeError:
    print(f"오류: user_rules.json 파일이 유효한 JSON 형식이 아닙니다.")
    USER_RULES_DATA = {"Strict Vegan": []} # JSON 오류 시 기본값


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
    텍스트 내에서 주어진 금지 키워드(user_rules.json의 ban_list)를 찾아 리스트로 반환합니다.
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
        return

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
            # user_rules.json에서 로드한 user_type에 해당하는 ban_list를 사용
            test_ban_list_for_check = USER_RULES_DATA.get(user_type, [])
            
            found_forbidden = check_forbidden_ingredients(final_refined_text, test_ban_list_for_check)
            
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

        else:
            print("이미지에서 '원재료명'으로 추정되는 섹션을 찾지 못했습니다.")
            print("전체 추출된 텍스트를 바탕으로 수동 확인이 필요할 수 있습니다.")

    except Exception as e:
        print(f"Google Cloud Vision API 호출 중 오류 발생: {e}")

# --- 메인 실행 부분 ---
if __name__ == "__main__":
    # user_type을 "Strict Vegan"으로 고정하고 테스트
    test_user_type = "Strict Vegan" 
    
    for img_file in image_files:
        process_image_with_google_vision_only(img_file, user_type=test_user_type)