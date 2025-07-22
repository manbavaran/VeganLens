import cv2
import numpy as np
from PIL import Image
import os
import uuid

base_dir = os.path.dirname(os.path.abspath(__file__))  # 현재 파일 기준

preprocessed_dir = os.path.abspath(os.path.join(base_dir, 'preprocessed'))
# 전처리한 이미지를 디버깅용으로 저장할 폴더

os.makedirs(preprocessed_dir, exist_ok=True)


def is_curved_image(image: np.ndarray, curvature_threshold: float = 0.03) -> bool:
    """이미지가 곡면인지 판단하는 함수"""
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150, apertureSize=3)

    lines = cv2.HoughLines(edges, 1, np.pi / 180, 150)
    if lines is None:
        return True

    angles = []
    for rho, theta in lines[:, 0]:
        angle = np.rad2deg(theta)
        angles.append(angle)

    angles = np.array(angles)
    angle_std = np.std(angles)

    return angle_std > curvature_threshold * 180


def get_contour_corners(image: np.ndarray) -> np.ndarray:
    """성분표와 같이 직사각형 모양의 외곽선 검출"""
    contours, _ = cv2.findContours(image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for cnt in contours:
        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        if len(approx) == 4:
            return approx.reshape(4, 2)

    return None


def order_points(pts):
    """좌상-우상-우하-좌하 순으로 정렬"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def perspective_transform(image: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """꼭짓점을 기준으로 투시 왜곡 보정"""
    rect = order_points(corners)
    (tl, tr, br, bl) = rect

    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)

    maxWidth = int(max(widthA, widthB))
    maxHeight = int(max(heightA, heightB))

    dst = np.array([[0, 0], [maxWidth - 1, 0],
                    [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped


def save_debug_image(image: np.ndarray, base_filename: str):
    filename = f"{base_filename}_debug.png"

    filepath = os.path.join(preprocessed_dir, filename)
    cv2.imwrite(filepath, image)
    return filepath

def preprocess(image: Image.Image, debug : bool = False, base_filename: str = "debug") -> np.ndarray:
    # PIL 이미지를 numpy 배열로 변환 (easyocr는 numpy 이미지 사용)
    img = np.array(image)  # PIL → ndarray
    
    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    
    # 2. CLAHE (명암대비 보정)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # 3. Threshold (OTSU)
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    
    if is_curved_image(img):
        # 곡면이면 간단한 전처리만
        result = cv2.adaptiveThreshold(thresh, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                        cv2.THRESH_BINARY, 15, 10)
    
    
    else:
        # 4. 기울기 보정 (스키유 보정)
        coords = np.column_stack(np.where(thresh > 0))
        angle = cv2.minAreaRect(coords)[-1]
        
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
            
        (h, w) = thresh.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        deskewed = cv2.warpAffine(thresh, M, (w, h),
                                flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        # deskew 로직은 cv2.minAreaRect를 써서 전체 텍스트 영역의 기울기를 추정하는 방식입니다.
        corners = get_contour_corners(deskewed)
        
        if corners is not None:
            warped = perspective_transform(deskewed, corners)
        else:
            # 5. 퍼스펙티브 왜곡 보정 (가능할 경우)
            # 여기서는 예외처리를 넣고 단순히 패스 처리. 실제 구현은 컨투어 기반 추출 필요.
            warped = deskewed
        
        # 6. 최종 이진화 (재확인용)
        result = cv2.adaptiveThreshold(warped, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                        cv2.THRESH_BINARY, 15, 10)
        # adaptiveThreshold는 주변 픽셀값에 따라 유동적으로 이진화를 해서 그림자가 생겨도 잘 보정돼요.
    
    # 디버그용 저장
    if debug:
        save_debug_image(result, base_filename)
    
    return result 
    # 전처리된 이미지 (numpy array)