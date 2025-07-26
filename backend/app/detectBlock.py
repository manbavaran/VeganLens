# backend/app/detectBlock.py

from mmocr.apis import MMOCRInferencer
from PIL import Image
import cv2
import numpy as np
from typing import List, Union
import os

base_dir = os.path.abspath(os.path.dirname(__file__))

text_blocks_dir = os.path.abspath(os.path.join(base_dir, 
                                                "text_Blocks"))
# 크롭한 이미지를 저장할 경로
# 크롭 이미지 저장 형식은 원본 파일 이름_crop_1, 2, 3, 4...

os.makedirs(text_blocks_dir, exist_ok=True) 


models_dir = os.path.abspath(os.path.join(base_dir, 
                                        "..",
                                        "..",
                                        "models"))

os.makedirs(models_dir, exist_ok=True)

config_path = os.path.join(models_dir, 'dbnet','dbnet_resnet50-dcnv2_fpnc_1200e_icdar2015.py')
weights_path = os.path.join(models_dir, 'dbnet_resnet50-dcnv2_fpnc_1200e_icdar2015_20220828_124917-452c443c.pth')

# MMOCR 모델은 한 번만 로드해서 재사용
ocr_model = MMOCRInferencer(
    det=config_path,
    det_weights = weights_path,
    rec=None
)

# detectBlock.py에 추가 (선택사항)
def flatten_crops(cropped_blocks: List[List[Image.Image]]) -> List[Image.Image]:
    return [img for group in cropped_blocks for img in group]

def detect_text_blocks(
    image_inputs: Union[str, Image.Image, List[Union[str, Image.Image]]],
    debug: bool = True,
    base_filename: str = None
) -> List[List[Image.Image]]:
    """
    이미지에서 텍스트 블록을 탐지하고, 각 박스를 크롭하여 PIL.Image로 반환.
    debug=True일 경우, 박스가 그려진 이미지를 저장함.

    Returns:
        List[List[PIL.Image]]: 각 이미지에 대한 크롭 리스트
    """
    
    if base_filename is None:
        raise ValueError("base_filename must be provided for naming saved visualizations.")
    
    if not isinstance(image_inputs, list):
        image_inputs = [image_inputs]

    all_cropped = []

    for image_input in image_inputs:
        # 이미지 로딩 및 이름 처리
        if isinstance(image_input, str):
            raise TypeError("이미지는 경로가 아닌 PIL.Image로 전달되어야 합니다.")

        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")

        else:
            raise TypeError("이미지는 파일 경로 또는 PIL.Image만 지원됩니다.")

        # OpenCV 변환
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

        # 복사본 (박스 그리기용)
        img_for_draw = cv_img.copy()

        # 탐지 수행
        result = ocr_model(img, return_vis=False)
        polygons = result['predictions'][0]['det_polygons']

        crops = []
        for idx, poly in enumerate(polygons):
            poly_np = np.array(poly).astype(np.int32)
            x, y, w, h = cv2.boundingRect(poly_np)

            # ✅ 박스 그리기
            cv2.rectangle(img_for_draw, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # ✅ 원본 이미지에서 크롭
            crop = cv_img[y:y+h, x:x+w]
            if crop.size == 0:
                continue

            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            crop_pil = Image.fromarray(crop_rgb)
            crops.append(crop_pil)

        # ✅ 박스 시각화 이미지 저장
        if debug:
            output_path = os.path.join(text_blocks_dir, f"{base_filename}_with_boxes.jpg")
            cv2.imwrite(output_path, img_for_draw)

        all_cropped.append(crops)

    return all_cropped
