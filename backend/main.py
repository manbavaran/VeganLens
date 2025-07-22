# backend/main.py
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import json
import os
from app.veganLens import extract_text, check_keywords
from datetime import datetime

"""
cd backend 로 main.py가 있는 폴더로 이동
uvicorn main:app --reload
이거 실행하고 
http://localhost:8000/docs 점속
Swagger UI 확인하기
"""

base_dir = os.path.abspath(os.getcwd())

data_dir = os.path.abspath(os.path.join(base_dir, "..", "data"))

user_rules_path = os.path.abspath(os.path.join(data_dir, "user_rules.json"))

app = FastAPI(
    title="VeganLens API",
    description="Upload food label image and check if it's vegan",
    version="beta - v_0.0.1",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트 주소만 넣어도 됨 ex. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 비건 불허 성분 키워드
with open(user_rules_path, "r", encoding="utf-8") as f:
    USER_RULES = json.load(f)  # ["milk", "egg", "honey", "gelatin", ...]


# 이미지 업로드 API
@app.post("/Check_Vegan")
async def analyze_image(request: Request, file: UploadFile = File(...)):
    # request는 FastAPI 내부 객체이기 때문에 file=...보다 앞에 와야 한다.
    # File(...) : 사용자가 반드시 file이라는 이름으로 이미지를 업로드해야 한다는 의미

    if not file:
        return JSONResponse(
            content={"error": "Image is required"},
            status_code=400,  # Bad Request	요청 형식에 문제가 있음 (예: 이미지 안 보냄)
        )

    # 사용자 비건 단계를 프론트엔드에서 넘겨받는다.
    # FastAPI (main.py)에서 읽기
    user_type = request.headers.get("x-user-type", "Strict Vegan")
    # 클라이언트(프론트엔드)에서 x-user-type 헤더를 안 보내면,
    # 에러가 날 수 있다. 결과가 None 이 되거나 에러가 날 수 있다.
    # 그래서 그걸 방지하기 위해 기본값으로 Strict Vegan 을 준다.
    print(f"사용자 유형: {user_type}")
    ban_list = USER_RULES.get(user_type, [])
    # dict.get(key, default)는 딕셔너리에 key가 없을 때
    # 기본값을 반환해주는 안전한 방식
    # 프론트엔드에서 전달받은 user_type 에 해당하는
    # key 값이 USER_RULES 에 없다면 KeyError 가 난다.
    # 그걸 방지하기 위해 기본값 [] 를 넣은 것.
    # 즉, 실수로 이상한 user_type이 들어와도
    # 빈 리스트로 처리해서 안전하게 넘어가도록 만든 것.

    # 1. 이미지 읽기
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # 2. OCR 수행
    text = extract_text(image)
    # veganLens.py 에서 정의한 함수

    # 3. 비건 여부 판단
    found = check_keywords(text, ban_list)
    # veganLens.py 에서 정의한 함수

    now = datetime.now()
    return JSONResponse(
        content={
            "Date": now.strftime("%Y-%m-%d %H:%M:%S"),
            "user_type": user_type,
            "is_vegan": len(found) == 0,
            "detected_non_vegan_ingredients": found,
            "ban_list": ban_list,
            "ocr_text": text,
        },
        status_code=200,  # OK 정상 응답 (모든 게 잘 처리됨)
    )
