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
from starlette.concurrency import run_in_threadpool
# from app import choice, get_logger_by_name, ban_List, section_text, check_forbidden_ingredients
from backend.app import (choice, get_logger_by_name, 
                ban_List, section_text, 
                process_image_with_google_vision_only,
                process_image_with_llm)

from datetime import datetime
import sys

"""
프로젝트 루트 폴더로 이동
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
이거 실행하고 
http://localhost:8000/docs 점속
Swagger UI 확인하기
"""

# exe 여부에 따라 base_dir 결정
if getattr(sys, 'frozen', False):
    base_dir = sys._MEIPASS  # exe 실행 위치
else:
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..")) # 프로젝트 루트폴더

frontend_dir = os.path.abspath(os.path.join(base_dir, "frontend", "app"))

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
    
    use_llm = True
    
    print(f"사용자 유형: {user_type}")
    
    ban_list = ban_List(user_type)

    # 1. 이미지 읽기
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # 파일명에서 확장자를 제거한 이름 추출
    original_filename = file.filename
    base_filename = os.path.splitext(os.path.basename(original_filename))[0]
    
    # 2. OCR 수행
    # response = choice(image, debug=True, base_filename=base_filename, version = 1, what='google')
    response = await run_in_threadpool(choice, image, True, base_filename, 1, 'google')

    # 3. 비건 여부 판단
    # text = section_text(response, debug=True, section='ing')
    
    # print(f"[DEBUG] OCR로부터 받은 text: {text!r}")
    # print(f"[DEBUG] 금지 목록: {ban_list}")
    
    # found_forbidden = check_forbidden_ingredients(text, ban_list)

    if (use_llm):
        found_forbidden, found_caution = process_image_with_llm(response, user_type)
    else:
        found_forbidden, found_caution = process_image_with_google_vision_only(response, user_type)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    logger = get_logger_by_name('google')
        
    logger.info(f"\n 파일명: {base_filename}")
    logger.info(f"  📅 처리 시각: {now_str}")
    logger.info(f"  🚫 감지된 금지 성분: {found_forbidden if found_forbidden else '없음'}")
    logger.info(f"  {'✅ 비건 OK' if not found_forbidden else '❌ 비건 아님'}")
    logger.info(f"  🚫 감지된 주의 성분: {found_caution if found_caution else '없음'}")
    # logger.info(f"  🔍 OCR 결과: {text}")
    
    return JSONResponse(
        content={
            "Date": now_str,
            "user_type": user_type,
            "is_vegan": len(found_forbidden) == 0, # True : 비건,  False : 비건 아님
            "number_forbidden": len(found_forbidden),
            "found_forbidden": found_forbidden,
            
            "is_caution": len(found_caution) == 0,
            "number_caution": len(found_caution),
            "found_caution": found_caution,
            # "ocr_text": text,
        },
        status_code=200,  # OK 정상 응답 (모든 게 잘 처리됨)
    )



# app = FastAPI(...) 정의 ‘아래쪽 아무데나’ (runner 전) 추가
if getattr(sys, "frozen", False):
    # PyInstaller exe에서 uvicorn 멀티워커가 "main:app"을 import할 수 있게 alias 등록
    sys.modules.setdefault("main", sys.modules[__name__])


# ===== Runner (exe=멀티워커 in-process / dev=멀티워커 subprocess) =====
import os, sys, time, socket, threading, webbrowser, subprocess
import uvicorn
import multiprocessing as mp

def _open_browser_when_ready(url: str, host: str, port: int, timeout: float = 25.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1.0):
                webbrowser.open(url)
                return
        except OSError:
            time.sleep(0.2)

if __name__ == "__main__":
    mp.freeze_support()  # Windows에서 멀티프로세스 필수
    HOST       = os.getenv("UVICORN_HOST", "0.0.0.0")
    PORT       = int(os.getenv("UVICORN_PORT", "8000"))
    WORKERS    = int(os.getenv("UVICORN_WORKERS", "8"))
    BACKLOG    = int(os.getenv("UVICORN_BACKLOG", "512"))
    KEEP_ALIVE = int(os.getenv("UVICORN_KEEPALIVE", "5"))
    LOG_LEVEL  = os.getenv("UVICORN_LOG_LEVEL", "info")

    # 브라우저 자동 오픈(포트 열리면)
    threading.Thread(
        target=_open_browser_when_ready,
        args=(f"http://127.0.0.1:{PORT}", "127.0.0.1", PORT, 25.0),
        daemon=True,
    ).start()

    if getattr(sys, "frozen", False):
        # ★ exe 내부에서 멀티워커: 반드시 "임포트 문자열" 사용
        #   Windows에서 안정성↑: loop="asyncio", http="h11"
        uvicorn.run(
            "main:app",
            host=HOST, port=PORT,
            workers=WORKERS,                # exe에서도 멀티워커 동작
            backlog=BACKLOG,
            timeout_keep_alive=KEEP_ALIVE,
            log_level=LOG_LEVEL,
            loop="asyncio",
            http="h11",
        )
    else:
        # ★ 개발/스크립트: uvicorn CLI 멀티워커
        #   프로젝트 루트에서 실행한다고 가정 (backend/main.py 기준)
        cmd = [
            sys.executable, "-m", "uvicorn",
            "backend.main:app",
            "--host", HOST,
            "--port", str(PORT),
            "--workers", str(WORKERS),
            "--backlog", str(BACKLOG),
            "--timeout-keep-alive", str(KEEP_ALIVE),
            "--log-level", LOG_LEVEL,
        ]
        subprocess.run(cmd)
# ===== /Runner =====