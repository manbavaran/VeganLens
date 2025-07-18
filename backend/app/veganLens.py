from PIL import Image
import easyocr
import torch
import numpy as np
from preprocessing import preprocess

# OCR 모델은 전역에서 미리 로딩해두는 게 성능에 좋음
reader = easyocr.Reader(['en', 'ko'], gpu=True)  # 영어, 한국어 지원

print("버전:", torch.__version__)
print("CUDA 지원:", torch.version.cuda)
print("GPU 사용 가능:", torch.cuda.is_available())
print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")

def extract_text(image: Image.Image) -> str:
    # PIL 이미지를 numpy 배열로 변환 (easyocr는 numpy 이미지 사용)
    img_array = preprocess(image)
    
    # OCR 수행
    result = reader.readtext(
                            img_array,
                            detail=0,   # detail=0 → 문자열만 추출
                            paragraph=True, # 문장처럼 붙은 글자 OCR
                            min_size=20,    # 너무 작은 텍스트 제외
                            low_text=0.3,   # 글자 인식 threshold
                            contrast_ths=0.5,   # 대비 인식 threshold
                            adjust_contrast=0.7 # 대비 자동 조정
                            )  
    text = " ".join(result).lower()
    return text

def check_keywords(text: str, keywords: list[str]) -> list[str]:
    return [kw for kw in keywords if kw in text]