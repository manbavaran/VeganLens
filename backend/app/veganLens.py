from google.cloud import vision
from PIL import Image
from io import BytesIO
from .logger import get_logger
import os
import sys
# :흰색_확인_표시: IMY 전용 Google Vision 기반 OCR 함수

# exe 여부에 따라 base_dir 결정
if getattr(sys, 'frozen', False):
    # exe 실행 시: exe가 있는 폴더 기준
    base_dir = os.path.dirname(sys.executable)
else:
    # 개발 환경: 이 파일이 있는 폴더 기준
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


# data 폴더 경로
data_dir = os.path.join(base_dir, "data")

# API Key 경로
API_PATH = os.path.join(data_dir, "veganlens_API_Key.json")

# JSON 키 경로 등록
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = API_PATH

# Vision 클라이언트 생성
client = vision.ImageAnnotatorClient()

logger = get_logger("google")

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
        # document_text_detection은 이미지 전체의 텍스트와 그 구조(블록, 문단 등)를 분석하여 반환합니다.
        
        
        # texts = response.full_text_annotation.text.strip()
        # 이건 전체 블록에서 추출한걸 한줄 문자열로 만들어서 리턴함
        if response:
            result = response
            if debug:
                logger.info(f"OCR Response completed [{base_filename}]")  # ✅ 성공 로그
            return result
        else:
            logger.warning(f"OCR returned no Response: {base_filename}")  # ✅ 빈 결과 로그
            return "텍스트를 인식할 수 없습니다."
    except Exception as e:
        logger.error(f"OCR failed {base_filename} : {str(e)}")
        return ""


def extract_section(image, debug=True, base_filename=None, version=1):
    if (version == 1):
        
        # Google OCR 병렬 처리
        response = google_ocr(image=image, debug=debug, base_filename=base_filename)
            
        # 3. 텍스트 결합
        return response
    
    else:
        return print("버전을 다시 확인해 주세요.")