import cv2
import numpy as np
from PIL import Image
import os
import uuid

base_dir = os.path.abspath(os.getcwd())

preprocessed_dir = os.path.abspath(os.path.join(base_dir, 'preprocessed'))
# 전처리한 이미지를 디버깅용으로 저장할 폴더

os.makedirs(preprocessed_dir, exist_ok=True)

def save_debug_image(image: np.ndarray, prefix="debug"):
    filename = f"{prefix}_{uuid.uuid4().hex[:8]}.png"
    filepath = os.path.join(preprocessed_dir, filename)
    cv2.imwrite(filepath, image)
    return filepath

def preprocess(image: Image.Image) -> np.ndarray:
    # PIL 이미지를 numpy 배열로 변환 (easyocr는 numpy 이미지 사용)
    img = np.array(image)  # PIL → ndarray
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    scaled = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _, thresh = cv2.threshold(scaled, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # 디버그용 저장
    save_debug_image(thresh, prefix="preprocessed")
    
    return thresh  # 전처리된 이미지 (numpy array)