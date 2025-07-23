# backend/test.py
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import io
import json
import os
from app import check_keywords, choice
"""
클라이언트에게 이미지를 받는게 아니라
서버내에서 이미지를 불러와서
테스트 하는 용도의 파일
"""

base_dir = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 기준

data_dir = os.path.abspath(os.path.join(base_dir, "..", "data"))

user_rules_path = os.path.abspath(os.path.join(data_dir, "user_rules.json"))

pictures_dir = os.path.abspath(os.path.join(base_dir, "..", "img", "pictures"))


with open(user_rules_path, "r", encoding="utf-8") as f:
    USER_RULES = json.load(f)

user_type = "Strict Vegan"  # 직접 지정
ban_list = USER_RULES.get(user_type, [])

# 이미지 목록 가져오기
image_files = [f for f in os.listdir(pictures_dir) 
                if f.lower().endswith((".jpg", ".jpeg", ".png"))]

# 상위 30개만 선택
selected_images = image_files[:]


# OCR 수행
for idx, filename in enumerate(selected_images, start=1):
    img_path = os.path.join(pictures_dir, filename)
    base_filename = os.path.splitext(filename)[0]
    try:
        image = Image.open(img_path)
        text = choice(image, debug=True, base_filename=base_filename, who='BHY', version = 1)
        found = check_keywords(text, ban_list)
        print(f"\n[{idx}] 파일명: {filename}")
        print("  🔍 OCR 결과:", text)
        print("  🚫 감지된 금지 성분:", found if found else "없음")
        print("  ✅ 비건 OK" if not found else "  ❌ 비건 아님")
    except Exception as e:
        print(f"[ERROR] {filename} 처리 중 오류 발생: {e}")