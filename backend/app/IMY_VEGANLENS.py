from google.cloud import vision
from PIL import Image
from io import BytesIO
from .logger import get_logger
import os
from concurrent.futures import ThreadPoolExecutor
from functools import partial

# :흰색_확인_표시: IMY 전용 Google Vision 기반 OCR 함수

base_dir = os.path.abspath(os.path.dirname(__file__))

API_PATH = os.path.abspath(os.path.join(base_dir, "..", "..","data", "veganlens_API_Key.json"))

# JSON 키 경로 등록
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = API_PATH

# Vision 클라이언트 생성
client = vision.ImageAnnotatorClient()

logger = get_logger("IMY")

def google_ocr(image: Image.Image, debug: bool = True, base_filename: str = None) -> str:
    try:
        logger.info(f"OCR started: {base_filename}")  # 1️⃣ OCR 시작 로그
        
        # ✅ 이미지 바이너리로 변환 (정상 방식)
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        content = buffer.getvalue()
        
        # Google Vision용 이미지 객체 생성
        image = vision.Image(content=content)
        # OCR 요청
        response = client.document_text_detection(image=image)
        
        texts = response.full_text_annotation.text.strip()
        if texts:
            result = texts
            if debug:
                logger.info(f"OCR completed [{base_filename}]")  # ✅ 성공 로그
            return result
        else:
            logger.warning(f"OCR returned no text: {base_filename}")  # ✅ 빈 결과 로그
            return "텍스트를 인식할 수 없습니다."
    except Exception as e:
        logger.error(f"OCR failed {base_filename} : {str(e)}")
        return ""


def extract_text_imy(image, debug=True, base_filename=None, version=1):
    if (version == 1):
        
        # Google OCR 병렬 처리
        texts = google_ocr(image=image, debug=debug, base_filename=base_filename)
            
        # 3. 텍스트 결합
        return texts
    
    else:
        return print("버전을 다시 확인해 주세요.")