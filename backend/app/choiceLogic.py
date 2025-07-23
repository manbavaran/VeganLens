from .veganLens import extract_text
# 이곳에 각자 만든 ocr 추출 함수 임포트 하기

def choice(image, debug=True, base_filename=None, who='BHY', version = 1):
    if (who == 'BHY' & version == 1):
        return extract_text(image, debug=True, base_filename=base_filename)
    elif (who == 'HSK'):
        return '' # 이곳에 서경님의 ocr 추출 함수 적기
    elif (who == 'IMY'):
        return '' # 이곳에 문영님의 ocr 추출 함수 적기
    else:
        return print('다시 입력')