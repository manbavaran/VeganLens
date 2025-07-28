import torch
import os
import json




print("버전:", torch.__version__)
print("GPU 사용 가능:", torch.cuda.is_available())
print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")


base_dir = os.path.dirname(os.path.abspath(__file__))

data_dir = os.path.abspath(os.path.join(base_dir, "..", "data"))

# strict vegan path
# pesco path

def ban_List(user_type='Strict Vegan'):
    if (user_type == 'Strict Vegan'):
        user_rules_path = os.path.abspath(os.path.join(data_dir, "user_rules.json"))
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
        user_rules_path = os.path.abspath(os.path.join(data_dir, "user_rules.json"))
        # pesco Path
        
        # 페스코 불허 성분 키워드
        with open(user_rules_path, "r", encoding="utf-8") as f:
            USER_RULES = json.load(f)  # ["milk", "egg", "honey", "gelatin", ...]
        
        ban_list = USER_RULES.get(user_type, [])
        
        return ban_list

    
    else:
        return '잘못된 유저 타입'


def check_keywords(text: str, keywords: list[str]) -> list[str]:
    # text: OCR 결과로 나온 전체 텍스트
    # keywords: 확인할 비건 금지 키워드들 리스트
    # → list[str]: 조건에 맞는 키워드를 리스트로 리턴
    return [kw for kw in keywords if kw in text]
    # 리스트 컴프리헨션 (리스트 만들기)
    # kw in text → text 안에 kw라는 단어가 부분 문자열로 포함되면 그 키워드를 리턴
    

