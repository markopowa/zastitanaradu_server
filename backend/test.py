from pathlib import Path

from pdf2image import convert_from_path
import pytesseract

TESSERACT_CMD = r"D:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
PDF_PATH = Path(
    r"../docs/user_story_lekarski/Uput_za_prethodni_lekarski_pregled.pdf")

# folder gde je pdftoppm.exe
POPPLER_BIN = r"C:\Users\marko\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"
# ako tesseract nije na PATH-u, otkomentariši i podesi:
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def ocr_pdf(path: Path) -> str:
    images = convert_from_path(str(path), dpi=300, poppler_path=POPPLER_BIN)
    texts: list[str] = []
    for i, img in enumerate(images, start=1):
        print(f"Processing page {i}/{len(images)}...")
        text = pytesseract.image_to_string(
            img, lang="srp+eng")  # prilagodi jezike
        texts.append(text)
    return "\n".join(texts).strip()


if __name__ == "__main__":
    txt = ocr_pdf(PDF_PATH)
    print("=== OCR TEXT START ===")
    print(txt[:4000])  # da ne izlije baš sve, prvih 4k karaktera
    print("\n=== OCR TEXT END ===")
