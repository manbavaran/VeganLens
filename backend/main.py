# backend/main.py
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from PIL import Image
import pillow_heif
import io
import json
import os
from app import choice, get_logger_by_name, ban_List, section_text, check_forbidden_ingredients
from datetime import datetime

"""
cd backend 로 main.py가 있는 폴더로 이동
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
이거 실행하고 
http://localhost:8000/docs 점속
Swagger UI 확인하기
"""

base_dir = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 기준

frontend_dir = os.path.abspath(os.path.join(base_dir, "..", "frontend", "app"))

static_dir = os.path.abspath(os.path.join(frontend_dir, "static"))


# 등록 (한 번만 해두면 PIL이 HEIC도 열 수 있게 됨)
pillow_heif.register_heif_opener()


app = FastAPI(
    title="VeganLens API",
    description="Upload food label image and check if it's vegan",
    version="beta - v_0.0.1",
)

# CORS 설정
# 다른 도메인에서 API나 정적 리소스 요청 가능하게 해주는 보안 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트 주소만 넣어도 됨 ex. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 정적 파일(css, js 등) mount
app.mount("/static", StaticFiles(directory=static_dir), name="static")
# static 파일들은 url 의 /static 경로로 연결


# index.html 렌더링
@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
# 이건  ' /로 들어오면 index.html을 보내줘 ' 라는 의미이다. 
# http://IP주소:8000/ 이렇게 들어오면 index.html 로 가는 것.


@app.get("/index.html")
async def serve_index_file():
    return FileResponse(os.path.join(frontend_dir, "index.html"))
# 웹앱에서 라우팅 방식과 정적 파일 처리 방식의 충돌 방지
# /는 FastAPI가 index.html을 FileResponse로 직접 제공하므로 정상 출력됨
# 그런데 설정 탭을 눌렀다가 다시 홈으로 돌아오면
# 브라우저가 실제로 /index.html이라는 경로로 접근하게 되는데,
# FastAPI에는 @app.get("/index.html") 라우트가 없으면 404가 납니다.


# settings.html 요청 대응
@app.get("/settings.html")
async def serve_settings():
    return FileResponse(os.path.join(frontend_dir, "settings.html"))
# http://IP주소:8000/settings.html 이렇게 들어오면 settings.html 로 간다.


@app.get("/loading.html")
async def serve_settings():
    return FileResponse(os.path.join(frontend_dir, "loading.html"))


@app.get("/result.html")
async def serve_settings():
    return FileResponse(os.path.join(frontend_dir, "result.html"))

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
    user_type = request.headers.get("x-user-type", "Vegan")
    # 클라이언트(프론트엔드)에서 x-user-type 헤더를 안 보내면,
    # 에러가 날 수 있다. 결과가 None 이 되거나 에러가 날 수 있다.
    # 그래서 그걸 방지하기 위해 기본값으로 Vegan 을 준다.
    print(f"사용자 유형: {user_type}")
    
    ban_list = ban_List(user_type)

    # 1. 이미지 읽기
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # 파일명에서 확장자를 제거한 이름 추출
    original_filename = file.filename
    base_filename = os.path.splitext(os.path.basename(original_filename))[0]
    
    # 2. OCR 수행
    response = choice(image, debug=True, base_filename=base_filename, version = 1, what='google')
    

    # 3. 비건 여부 판단
    text = section_text(response, debug=True, section='ing')
    
    print(f"[DEBUG] OCR로부터 받은 text: {text!r}")
    print(f"[DEBUG] 금지 목록: {ban_list}")
    
    found_forbidden = check_forbidden_ingredients(text, ban_list)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    logger = get_logger_by_name('google')
        
    logger.info(f"\n 파일명: {base_filename}")
    logger.info(f"  📅 처리 시각: {now_str}")
    logger.info(f"  🚫 감지된 금지 성분: {found_forbidden if found_forbidden else '없음'}")
    logger.info(f"  {'✅ 비건 OK' if not found_forbidden else '❌ 비건 아님'}")
    logger.info(f"  🔍 OCR 결과: {text}")
    
    return JSONResponse(
        content={
            "Date": now_str,
            "user_type": user_type,
            "is_vegan": len(found_forbidden) == 0, # True : 비건,  False : 비건 아님
            "number_forbidden": len(found_forbidden),
            "found_forbidden": found_forbidden,
            "ocr_text": text,
        },
        status_code=200,  # OK 정상 응답 (모든 게 잘 처리됨)
    )
