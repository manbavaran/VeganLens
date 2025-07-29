import torch
import os
import json

# print("버전:", torch.__version__)
# print("GPU 사용 가능:", torch.cuda.is_available())
# print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")


# --- '원재료명' 섹션 시작점 및 종료점 식별을 위한 키워드 ---
# Google Vision API가 인식한 텍스트에서 '원재료명' 섹션을 찾기 위한 단서들입니다.
ingredient_Start_Keywords = ["원재료명", "원재료", "성분명", "성분", "INGREDIENTS", "원료명"]


# '원재료명' 섹션이 끝났음을 알리는 강력한 키워드들입니다. (예: 알레르기 표기, 제조사 정보, 영양 정보 등)
ingredient_End_Keywords = [
    "함유", "포함", "Contains", # 알레르기/포함 성분 표기
    "유통전문판매원", "제조원", "소비기한", "유통기한", "품목보고번호", # 제조사/유통 관련
    "영양정보", "영양성분", "Nutrition Facts", # 영양정보 시작
    "보관방법", "조리방법", "고객상담", "주의사항", "반품 및 교환", # 기타 안내
    "원산지", # 원산지 단독 표기 (때로는 성분표 뒤에 나옴)
    "칼로리", "단백질", "지방", "탄수화물", # 영양정보의 개별 항목도 종료 신호로 활용
    "총 내용량", "바코드", # 제품의 다른 정보 시작
]


base_dir = os.path.dirname(os.path.abspath(__file__))

data_dir = os.path.abspath(os.path.join(base_dir, "..", "data"))

# strict vegan path
# pesco path

def ban_List(user_type='Strict Vegan'):
    if (user_type == 'Strict Vegan'):
        user_rules_path = os.path.abspath(os.path.join(data_dir, "strict_vegan_forbidden.json"))
        # Strict Vegan Path
        
        # 비건 불허 성분 키워드
        with open(user_rules_path, "r", encoding="utf-8") as f:
            USER_RULES = json.load(f)  # ["milk", "egg", "honey", "gelatin", ...]
        
        ban_list = USER_RULES.get(user_type, [])
        # dict.get(key, default)는 딕셔너리에 key가 없을 때
        # 기본값을 반환해주는 안전한 방식
        # 프론트엔드에서 전달받은 user_type 에 해당하는
        # key 값이 USER_RULES 에 없다면 KeyError 가 난다.
        # 그걸 방지하기 위해 기본값 [] 를 넣은 것.
        # 즉, 실수로 이상한 user_type이 들어와도
        # 빈 리스트로 처리해서 안전하게 넘어가도록 만든 것.
        return ban_list
    
    elif (user_type == 'pesco'):
        user_rules_path = os.path.abspath(os.path.join(data_dir, "pesco_forbidden.json"))
        # pesco Path 나중에 수정
        
        # 페스코 불허 성분 키워드
        with open(user_rules_path, "r", encoding="utf-8") as f:
            USER_RULES = json.load(f)  # ["milk", "egg", "honey", "gelatin", ...]
        
        ban_list = USER_RULES.get(user_type, [])
        
        return ban_list

    
    else:
        return []
        # 빈 리스트 반환


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


def check_forbidden_ingredients(text: str, ban_list: list[dict]) -> list[str]:
    """
    OCR로 추출된 전체 텍스트(text) 내에서 주어진 금지 키워드 리스트(ban_list)를 찾아 반환합니다.
    - 발견된 금지 성분들을 중복 없이 정렬된 리스트로 반환합니다.
    - 이 함수는 카테고리(확실한 금지, 주의 필요 등) 분류는 하지 않고,
    - 단순히 ban_list에 있는 성분이 텍스트에 포함되었는지 여부만 확인합니다.
    """
    if not text or not ban_list: # 텍스트나 금지 리스트가 비어있으면 빈 리스트 반환
        return []
    
    text_clean = text.upper().replace(" ", "").replace("\n", "") 
    # 텍스트에서 공백과 줄바꿈 제거하여 검색 효율 높임
    
    found_forbidden = []

    for keyword in ban_list: 
        search_kw = keyword.get("korean", []) + keyword.get("e_code", [])
        
        for kw in search_kw:
            kw = kw.strip()
            if len(kw) < 2:
                # 검색할 키워드가 너무 짧으면 오탐(잘못된 탐지) 방지를 위해 건너뜁니다.
                continue
            if kw.upper().replace(" ", "") in text_clean:
                # 키워드를 대문자/공백 제거 후 텍스트에 포함되는지 확인
                found_forbidden.append(keyword["keyword"]) # 발견되면 리스트에 추가
                break # 같은 항목 중복 방지
            
    return sorted(list(set(found_forbidden))) # 중복 제거 후 알파벳 순으로 정렬하여 반환



def where_section(section='ing'):
    if (section == 'ing'):
        return ingredient_Start_Keywords, ingredient_End_Keywords
    # 원재료와 제조시설이 둘다 트루면, 하나만 트루면 이런식으로 조건 분기 가능
    if (section == 'fac'):
        # 나중에 factory return 구현
        # 이것도 스타트 키워드, 엔드 키워드 리턴
        return


def section_text(response, debug=True, section='ing'):
    
    start_kw, end_kw = where_section(section=section)
    # 섹션의 시작과 끝을 판단할 키워드
    
    ext_ing_sect_txts = []
    # extracted_ingredient_section_texts
    # 최종 추출된 '원재료명' 섹션의 텍스트 줄들을 저장할 리스트

    in_ingredient_section = False
    # 현재 '원재료명' 섹션 안에 있는지 여부를 추적하는 플래그
    
    
    # Google Vision API가 탐지한 페이지 내의 블록들을 순회합니다.
    full = response.full_text_annotation
    pages = full.pages
    
    if ( not full and not pages):
        return ''
    
    elif (full and pages):
        for page in pages:
            for block_idx, block in enumerate(page.blocks):
                # 현재 블록의 모든 텍스트를 합쳐 하나의 문자열로 만듭니다.
                block_text = ""
                for paragraph in block.paragraphs:
                    para_text = ""
                    for word in paragraph.words:
                        word_text = ''.join([symbol.text for symbol in word.symbols])
                        para_text += word_text
                    if para_text:
                        block_text += para_text + " " # 단락 사이에 공백 추가
                        
                    if debug:
                        print(f"Block {block_idx} content: {block_text}")
                block_text = block_text.strip() # 최종 공백 제거
                
                
                # 빈 블록이나 매우 짧은 블록은 유효한 내용으로 간주하지 않습니다.
                if not block_text or len(block_text) < 3:
                    if not in_ingredient_section: # 아직 성분표 시작 전이면 이런 블록은 건너뜁니다.
                        continue
                    # 성분표 섹션에 진입했다면,
                    # 짧은 블록도 포함할 수 있도록 함 (줄바꿈 등으로 인해 분리된 경우)
                
                
                # 1. 성분표 시작점 탐지 (아직 '원재료명' 섹션에 진입하지 않은 상태)
                if not in_ingredient_section:
                    if contains_keyword(block_text, start_kw):
                        in_ingredient_section = True # 성분표 섹션 진입 플래그를 True로 설정
                        
                        # 시작 키워드 이후부터 텍스트를 수집하여 정확한 시작점을 잡습니다.
                        # 예: "총 내용량 100g 원재료명: 설탕, 밀가루" 에서 "원재료명:" 이후부터 가져옴
                        start_idx_block = -1
                        block_txt_no_space = block_text.upper().replace(" ", "")
                        
                        for keyword in start_kw:
                            keyword_upper_no_space = keyword.upper().replace(" ", "")
                            if keyword_upper_no_space in block_txt_no_space:
                                # 원본 블록 텍스트에서 해당 키워드의 시작 인덱스를 찾습니다.
                                current_found_index = block_text.upper().replace(" ", "").find(keyword_upper_no_space)
                                if start_idx_block == -1 or current_found_index < start_idx_block:
                                    start_idx_block = current_found_index
                                    
                        if start_idx_block != -1:
                            # 시작 키워드 이후부터 블록 텍스트를 잘라냅니다.
                            sliced_block_text = block_text[start_idx_block:].strip()
                            # 잘라낸 텍스트가 콜론으로 시작하면 콜론을 제거합니다.
                            # (예: "원재료명:설탕" -> "설탕")
                            if sliced_block_text.startswith(':'):
                                sliced_block_text = sliced_block_text[1:].strip()
                                
                            ext_ing_sect_txts.append(sliced_block_text)
                            # extracted_ingredient_section_texts
                            
                        else: 
                            # 시작 키워드를 찾았으나 슬라이싱 인덱스 문제 발생 시
                            # 전체 블록 추가 (예외 처리)
                            ext_ing_sect_txts.append(block_text)
                        
                        # (매우 드묾) 시작 블록에 이미 종료 키워드가 포함되어 있다면 즉시 섹션 종료
                        if contains_keyword(ext_ing_sect_txts[-1], end_kw):
                            in_ingredient_section = False
                            break # 현재 페이지의 블록 순회 종료
                        continue # 시작점을 찾았으니 다음 블록으로 이동하여 계속 수집
                
                
                # 2. 성분표 섹션 내에서 텍스트 블록 수집 및 종료 조건 확인 (이미 섹션에 진입한 상태)
                if in_ingredient_section:
                    # 현재 블록이 종료 키워드를 포함하는지 확인합니다.
                    # (이 키워드가 나오면 성분표 끝으로 판단)
                    if contains_keyword(block_text, end_kw):
                        ext_ing_sect_txts.append(block_text)
                        # 종료 키워드가 있는 블록도 포함
                        
                        in_ingredient_section = False # 성분표 섹션 종료 플래그 설정
                        break # 현재 페이지의 블록 순회 종료
                    
                    # 종료 키워드가 없으면 현재 블록을 성분표의 일부로 간주하고 추가합니다.
                    ext_ing_sect_txts.append(block_text)
            
            # 현재 페이지에서 성분표 섹션이 종료되었거나(in_ingredient_section = False)
            # 또는 성분표 섹션을 찾지 못했으나 이미 추출된 텍스트가 있다면, 
            # 다음 페이지는 더 이상 검사하지 않습니다.
            if not in_ingredient_section and ext_ing_sect_txts: 
                break 
        
    # --- 3단계: 최종 '원재료명' 섹션 텍스트 조합 및 후처리 ---
    if ext_ing_sect_txts:
        result_txt = "\n".join(ext_ing_sect_txts)
        
        lines = result_txt.split('\n')
        
        # 텍스트의 마지막 부분에 불필요한 내용이 포함되지 않도록,
        # 마지막 '유효한' 줄을 찾습니다.
        last_valid_line_idx = -1
        
        for i in range(len(lines) - 1, -1, -1): 
            # 마지막 줄부터 역순으로 탐색
            if contains_keyword(lines[i], end_kw):
                last_valid_line_idx = i 
                # 종료 키워드가 포함된 줄의 인덱스 저장
                break 
                # 가장 마지막에 발견된 종료 키워드가 있는 줄까지가 유효하다고 판단
        
        if last_valid_line_idx != -1:
            # 종료 키워드를 찾았다면
            result_txt = "\n".join(lines[:last_valid_line_idx + 1])
            # 해당 줄까지 포함하여 잘라냄
        else:
            # 종료 키워드를 찾지 못했다면,
            # 시작점부터 수집된 모든 텍스트를 사용
            result_txt = result_txt
            # 명시적으로 표현
            # 빼도 되는 코드.
        
        if debug:            
            print("\n--- '원재료명'으로 추정되는 섹션에서 추출된 텍스트 ---")
            print(result_txt)
        
        return result_txt
