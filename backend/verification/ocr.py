import re
from typing import Optional
from PIL import Image, ImageOps
import pytesseract


def extract_raw_text(image_path: str) -> str:
    """Run OCR on an image and return raw extracted text."""
    image = Image.open(image_path)
    image = _preprocess(image)
    return pytesseract.image_to_string(image)


def _preprocess(image: Image.Image) -> Image.Image:
    image = ImageOps.grayscale(image)
    image = ImageOps.autocontrast(image)
    return image


def parse_bill_fields(raw_text: str) -> dict:
    result = {
        "units_consumed": _find_number(raw_text, r"(?:units?|kwh)[^\d]{0,10}(\d+(?:\.\d+)?)"),
        "amount": _find_number(raw_text, r"(?:amount|total|payable)[^\d]{0,10}(?:rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)"),
        "billing_period": _find_text(raw_text, r"(?:billing period|bill date|month)[:\s]*([A-Za-z]+\s?\d{4}|\d{2}/\d{4})"),
        "consumer_no": _find_text(raw_text, r"(?:consumer\s?no\.?)[:\s]*(\w+)"),
    }
    return result


def parse_receipt_fields(raw_text: str) -> dict:
    result = {
        "vendor": _find_text(raw_text, r"^(.+)\n"), 
        "amount": _find_number(raw_text, r"(?:total|amount)[^\d]{0,10}(?:rs\.?|₹)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)"),
        "date": _find_text(raw_text, r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})"),
        "raw_text": raw_text, 
    }
    return result


def _find_number(text: str, pattern: str) -> Optional[float]:
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None
    value = match.group(1).replace(",", "")
    try:
        return float(value)
    except ValueError:
        return None


def _find_text(text: str, pattern: str) -> Optional[str]:
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else None


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path>")
        sys.exit(1)

    raw = extract_raw_text(sys.argv[1])
    print("--- RAW TEXT ---")
    print(raw)
    print("--- PARSED (as bill) ---")
    print(parse_bill_fields(raw))
