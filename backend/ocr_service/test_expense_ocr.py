import pytest
import cv2
import numpy as np
from expense_ocr import ExpenseOCR
import os

@pytest.fixture
def ocr():
    return ExpenseOCR(use_easyocr=True)

@pytest.fixture
def sample_image():
    # Create a sample image with text
    img = np.zeros((100, 300), dtype=np.uint8)
    img.fill(255)  # White background
    cv2.putText(img, "Total: $123.45", (10, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    cv2.putText(img, "Date: 2024-03-15", (10, 80), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    return img

def test_preprocess_image(ocr, sample_image):
    processed = ocr.preprocess_image(sample_image)
    assert isinstance(processed, np.ndarray)
    assert processed.shape == sample_image.shape

def test_parse_amount():
    ocr = ExpenseOCR()
    assert ocr.parse_amount("Total: $123.45") == 123.45
    assert ocr.parse_amount("Amount: ₹1,234.56") == 1234.56
    assert ocr.parse_amount("No amount here") is None

def test_parse_date():
    ocr = ExpenseOCR()
    assert ocr.parse_date("Date: 2024-03-15") == "2024-03-15"
    assert ocr.parse_date("15/03/2024") == "2024-03-15"
    assert ocr.parse_date("No date here") is None

def test_categorize_expense():
    ocr = ExpenseOCR()
    assert ocr.categorize_expense("Restaurant bill") == "Food"
    assert ocr.categorize_expense("Uber ride") == "Transport"
    assert ocr.categorize_expense("Random text") == "Other"

def test_detect_language():
    ocr = ExpenseOCR()
    assert ocr.detect_language("Hello World") == "en"
    assert ocr.detect_language("") == "en"  # Default to English if detection fails

def test_extract_qr_data(ocr):
    # Create a sample QR code image
    qr_img = np.zeros((100, 100), dtype=np.uint8)
    qr_img.fill(255)
    # Note: This is a simplified test. In practice, you'd need a real QR code
    result = ocr.extract_qr_data(qr_img)
    assert result is None or isinstance(result, dict)

def test_process_image(ocr, tmp_path):
    # Create a temporary image file
    img_path = tmp_path / "test.jpg"
    cv2.imwrite(str(img_path), np.zeros((100, 100)))
    
    result = ocr.process_image(str(img_path))
    assert isinstance(result, dict)
    assert "merchant" in result
    assert "date" in result
    assert "amount" in result
    assert "category" in result
    assert "language" in result
    assert "qr_data" in result

def test_save_to_json(ocr, tmp_path):
    data = {
        "merchant": "Test Store",
        "date": "2024-03-15",
        "amount": 123.45,
        "category": "Shopping",
        "language": "en",
        "qr_data": None
    }
    
    output_path = tmp_path / "output.json"
    ocr.save_to_json(data, str(output_path))
    assert os.path.exists(output_path) 