# backend/main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import json
import os 
from app.veganLens import extract_text, check_vegan

'''
cd backend 로 main.py가 있는 폴더로 이동
uvicorn main:app --reload
이거 실행하고 
http://localhost:8000/docs 점속
Swagger UI 확인하기
'''

base_dir = os.path.abspath(os.getcwd())

data_dir = os.path.abspath(os.path.join(base_dir, '..', 'data'))

keywords_path = os.path.abspath(os.path.join(data_dir, 'keywords.json'))

app = FastAPI(
    title="GreenScan API",
    description="Upload food label image and check if it's vegan",
    version="beta - v_0.0.1"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트 주소만 넣어도 됨 ex. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 비건 불허 성분 키워드 (예시)
with open(keywords_path, "r", encoding="utf-8") as f:
    NON_VEGAN_KEYWORDS = json.load(f)  # ["milk", "egg", "honey", "gelatin", ...]

# 이미지 업로드 API
@app.post("/Check_Vegan")
async def analyze_image(file: UploadFile = File(...)):
    # File(...) : 사용자가 반드시 file이라는 이름으로 이미지를 업로드해야 한다는 의미
    
    # 1. 이미지 읽기
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # 2. OCR 수행
    text = extract_text(image)
    # greenscan 에서 정의한 함수

    # 3. 비건 여부 판단
    found = check_vegan(text, NON_VEGAN_KEYWORDS)
    # greenscan 에서 정의한 함수

    return JSONResponse({
        "is_vegan": len(found) == 0,
        "detected_non_vegan_ingredients": found,
        "ocr_text": text
    })