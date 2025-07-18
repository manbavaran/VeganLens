import cv2
import numpy as np
from PIL import Image

def preprocess(image: Image.Image) -> np.ndarray:
    img = np.array(image)  # PIL → ndarray
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    scaled = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    _, thresh = cv2.threshold(scaled, 150, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return thresh  # 전처리된 이미지 (numpy array)