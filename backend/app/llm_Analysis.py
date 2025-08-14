# app/llm_Analysis.py
import os
import json
import sys
# 기존 로직 재사용: 금지어 로드/매칭/섹션 추출
from .Test_compare_Keywords import (
    ban_List,                       # user_type -> JSON 로드
    check_forbidden_ingredients,    # 텍스트에서 금지어 찾아 "영어 keyword" 반환
    section_text                    # (백업) 규칙기반 원재료 섹션 추출
)

# exe 여부에 따라 base_dir 결정
if getattr(sys, 'frozen', False):
    # exe 실행 시: exe가 있는 폴더 기준
    base_dir = os.path.dirname(sys.executable)
else:
    # 개발 환경: 이 파일이 있는 폴더 기준
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


# data 폴더 경로
data_dir = os.path.join(base_dir, "data")

key_path = os.path.join(data_dir, "openai_key.txt")


# ----------------------------
# OpenAI 키 로딩 & 호출 유틸
# ----------------------------
def _read_openai_api_key() -> str:
    # 1) env
    k = os.getenv("OPENAI_API_KEY")
    if k and k.strip():
        return k.strip()
    # 2) data/openai_key.txt
    if os.path.exists(key_path):
        with open(key_path, "r", encoding="utf-8") as f:
            line = f.readline().strip()
            if line:
                return line
    raise RuntimeError("OpenAI API key not found. Set OPENAI_API_KEY or add data/openai_key.txt")

def _call_openai_chat(messages, model: str = None) -> str:
    """
    OpenAI Chat API를 버전 차이에 안전하게 호출.
    반환: assistant content(string, JSON 기대)
    """
    api_key = _read_openai_api_key()
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # 신형(openai>=1.x) 클라이언트 우선
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    except Exception:
        pass

    # 레거시 백업
    import openai as openai_legacy
    openai_legacy.api_key = api_key
    resp = openai_legacy.ChatCompletion.create(model=model, messages=messages)
    return resp["choices"][0]["message"]["content"]

# ----------------------------
# LLM: 블록(섹션)만 찾아오기
# ----------------------------
def _locate_sections_with_llm(full_text: str) -> dict:
    """
    LLM에 '원재료 섹션'과 '알레르기/제조시설 주의 섹션'만 찾아 오도록 요청.
    ※ 반환은 '텍스트 블록(원문 그대로)'만. 성분 매칭/영어 변환은 하지 않음.
    """
    if not full_text or not full_text.strip():
        return {"ingredients_section_text": "", "caution_section_text": ""}

    prompt = f"""
아래 제품 라벨의 OCR 전체 텍스트에서 두 가지만 골라 **JSON** 으로 반환하세요.
- 반드시 입력 텍스트의 **연속된 원문 문자열을 그대로** 발췌하세요(의역/생성 금지).
- 없으면 빈 문자열로 두세요.

필수 키:
"ingredients_section_text": '원재료명/성분' 목록으로 보이는 연속 블록(가능하면 한 블록)
"caution_section_text": 알레르기 주의/같은 제조시설/교차오염 등 경고 문구 블록(가능하면 한 블록)

[OCR FULL TEXT]
{full_text}
""".strip()

    messages = [
        {"role": "system",
        "content": "You extract text blocks only. Return a strict JSON object with the two required keys. Copy exact spans from the user text; do not invent terms."},
        {"role": "user", "content": prompt},
    ]

    try:
        content = _call_openai_chat(messages)
        data = json.loads(content)
        # 보수 처리: 키 보장
        return {
            "ingredients_section_text": (data.get("ingredients_section_text") or "").strip(),
            "caution_section_text": (data.get("caution_section_text") or "").strip(),
        }
    except Exception:
        # LLM 실패 시 빈 블록 반환
        return {"ingredients_section_text": "", "caution_section_text": ""}

# ----------------------------
# 외부에 노출하는 엔트리
# ----------------------------
def process_image_with_llm(response, user_type: str = "Vegan"):
    """
    기존 시그니처 유지: Google Vision response + user_type -> (found_forbidden, found_caution)
    - LLM은 섹션 위치만 추출
    - 금지 성분 탐지는 반드시 JSON 사전(ban_List) 기반으로 수행
    - 프론트로는 영어 keyword만 반환
    """
    # 0) OCR 전체 텍스트
    full_text = ""
    if getattr(response, "full_text_annotation", None):
        full_text = response.full_text_annotation.text or ""
    if not full_text.strip():
        return [], []

    # 1) LLM으로 섹션만 찾기
    sections = _locate_sections_with_llm(full_text)
    ing_txt = sections.get("ingredients_section_text", "")
    caution_txt = sections.get("caution_section_text", "")

    # 2) (백업) 규칙 기반 원재료 섹션
    if not ing_txt:
        ing_txt = section_text(response, debug=False, section='ing') or ""

    # 3) 금지어 리스트 로드
    rules = ban_List(user_type=user_type)  # JSON 파일 로드 (user_type 분기) 
    # -> 내부에서 data/strict_vegan_forbidden.json 등 읽음
    # -> 리스트 항목의 "keyword"(영어)가 반환에 쓰이게 됨

    # 4) 매칭 (영어 keyword만 반환됨)
    found_forbidden = check_forbidden_ingredients(ing_txt, rules)
    found_caution   = check_forbidden_ingredients(caution_txt, rules)

    # 5) 정리 후 리턴
    return sorted(set(found_forbidden)), sorted(set(found_caution))
