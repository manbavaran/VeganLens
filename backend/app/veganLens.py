from PIL import Image
import easyocr
import torch
import numpy as np

# OCR 모델은 전역에서 미리 로딩해두는 게 성능에 좋음
reader = easyocr.Reader(['en', 'ko'], gpu=True)  # 영어, 한국어 지원

print("버전:", torch.__version__)
print("CUDA 지원:", torch.version.cuda)
print("GPU 사용 가능:", torch.cuda.is_available())
print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")

def extract_text(image: Image.Image) -> str:
    # PIL 이미지를 numpy 배열로 변환 (easyocr는 numpy 이미지 사용)
    img_array = np.array(image)
    
    # OCR 수행
    result = reader.readtext(img_array, detail=0)  # detail=0 → 문자열만 추출
    text = " ".join(result).lower()
    return text

def check_keywords(text: str, keywords: list[str]) -> list[str]:
    return [kw for kw in keywords if kw in text]