from .veganLens import extract_text
from .IMY_VEGANLENS import extract_text_imy
# 이곳에 각자 만든 ocr 추출 함수 임포트 하기

def choice(image, debug=True, base_filename=None, version = 1, who='BHY'):
    if (who == 'BHY' and version == 1):
        return extract_text(image, debug=debug, base_filename=base_filename, version=1)
    elif (who == 'BHY' and version == 2):
        return extract_text(image, debug=debug, base_filename=base_filename, version=2)
    elif (who == 'HSK' and version == 1):
        return '' # 이곳에 서경님의 ocr 추출 함수 적기
    elif (who == 'IMY' and version == 1):
        return extract_text_imy(image, debug=debug, base_filename=base_filename, version=1)
        # 이곳에 문영님의 ocr 추출 함수 적기
    else:
        return print('다시 입력')