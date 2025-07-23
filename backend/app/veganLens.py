from PIL import Image
import easyocr
import torch
from .preprocessing import preprocess
from .logger import get_logger

# OCR 모델은 전역에서 미리 로딩해두는 게 성능에 좋음


reader = easyocr.Reader(['en', 'ko'], gpu=True)  # 영어, 한국어 지원


logger = get_logger("ocr")


print("버전:", torch.__version__)
print("CUDA 지원:", torch.version.cuda)
print("GPU 사용 가능:", torch.cuda.is_available())
print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")

def easy_ocr(image: Image.Image, debug : bool = False, base_filename: str = "debug") -> str:
    try:
        logger.info(f"OCR started: {base_filename}")  # 1️⃣ OCR 시작 로그
        
        # 1. 이미지 전처리
        img_array = preprocess(image, debug=debug, base_filename=base_filename)
        
        
        if img_array is None:
            logger.warning(f"preprocessing returned None: {base_filename}")
            return ""
    
        # 2. OCR 수행
        result = reader.readtext(
                                img_array,
                                detail=0,   # detail=0 → 문자열만 추출
                                paragraph=True, # 문장처럼 붙은 글자 OCR
                                min_size=20,    # 너무 작은 텍스트 제외
                                low_text=0.3,   # 글자 인식 threshold
                                contrast_ths=0.5,   # 대비 인식 threshold
                                adjust_contrast=0.7 # 대비 자동 조정
                                )  
        
        # 3. OCR 결과 방어 처리
        if not result:
            logger.warning(f"OCR result is empty: {base_filename}")
            return ""
        
        # 4. 문자열로 안전하게 변환 후 합치기
        text = " ".join(str(r) for r in result).lower()
        logger.info(f"OCR completed [{base_filename}]: {text}")
        return text
    
    except Exception as e:
        # 예외 발생 시 로깅 후 빈 문자열 반환
        logger.error(f"OCR failed [{base_filename}]: {str(e)}") # 2️⃣ 에러 로그
        return ""

def check_keywords(text: str, keywords: list[str]) -> list[str]:
    # text: OCR 결과로 나온 전체 텍스트
    # keywords: 확인할 비건 금지 키워드들 리스트
    # → list[str]: 조건에 맞는 키워드를 리스트로 리턴
    return [kw for kw in keywords if kw in text]
    # 리스트 컴프리헨션 (리스트 만들기)
    # kw in text → text 안에 kw라는 단어가 부분 문자열로 포함되면 그 키워드를 리턴
    

def extract_text(image, debug=True, base_filename=None, version = 1):
    if (version  == 1):
        easy_ocr(image, debug=True, base_filename=base_filename)