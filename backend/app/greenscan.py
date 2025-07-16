from PIL import Image
import pytesseract

def extract_text(image: Image.Image) -> str:
    return pytesseract.image_to_string(image).lower()

def check_vegan(text: str, keywords: list[str]) -> list[str]:
    return [kw for kw in keywords if kw in text]