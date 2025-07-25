import torch






print("버전:", torch.__version__)
print("GPU 사용 가능:", torch.cuda.is_available())
print("GPU 이름:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A")



def check_keywords(text: str, keywords: list[str]) -> list[str]:
    # text: OCR 결과로 나온 전체 텍스트
    # keywords: 확인할 비건 금지 키워드들 리스트
    # → list[str]: 조건에 맞는 키워드를 리스트로 리턴
    return [kw for kw in keywords if kw in text]
    # 리스트 컴프리헨션 (리스트 만들기)
    # kw in text → text 안에 kw라는 단어가 부분 문자열로 포함되면 그 키워드를 리턴
    

