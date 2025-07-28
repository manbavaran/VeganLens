from .veganLens import extract_section
# 이곳에 각자 만든 ocr 추출 함수 임포트 하기

def choice(image, debug=True, base_filename=None, version = 1, who='BHY'):
    if (who == 'IMY' and version == 1):
        return extract_section  (image, 
                                debug=debug, 
                                base_filename=base_filename, 
                                version=1)
    elif (who == 'HSK' and version == 1):
        return '' # 이곳에 서경님의 ocr 추출 함수 적기
    else:
        return print('다시 입력')