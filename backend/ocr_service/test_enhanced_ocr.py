import cv2
import numpy as np
from receipt_ocr import ReceiptOCR
from loguru import logger
import json
import os

def test_enhanced_ocr():
    """Test the enhanced OCR functionality with sample receipts."""
    # Initialize the OCR processor
    ocr = ReceiptOCR(use_easyocr=True)
    
    # Test directory containing sample receipts
    test_dir = "test_receipts"
    if not os.path.exists(test_dir):
        os.makedirs(test_dir)
        logger.info(f"Created test directory: {test_dir}")
    
    # Sample test cases
    test_cases = [
        {
            "name": "grocery_receipt",
            "expected_fields": ["merchant", "date", "total", "tax"],
            "language": "en"
        },
        {
            "name": "restaurant_bill",
            "expected_fields": ["merchant", "date", "total", "tax"],
            "language": "en"
        },
        {
            "name": "medical_bill",
            "expected_fields": ["merchant", "date", "total"],
            "language": "en"
        }
    ]
    
    results = {}
    
    for test_case in test_cases:
        image_path = os.path.join(test_dir, f"{test_case['name']}.jpg")
        
        if not os.path.exists(image_path):
            logger.warning(f"Test image not found: {image_path}")
            continue
        
        try:
            # Read the image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to read image: {image_path}")
                continue
            
            # Process the image
            result = ocr.extract_structured_data(image)
            
            # Validate the result
            validation = validate_result(result, test_case)
            
            # Store the results
            results[test_case['name']] = {
                'extraction': result,
                'validation': validation
            }
            
            logger.info(f"Processed {test_case['name']}: {validation['status']}")
            
        except Exception as e:
            logger.error(f"Error processing {test_case['name']}: {e}")
            results[test_case['name']] = {
                'error': str(e)
            }
    
    # Save results to file
    with open('ocr_test_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    return results

def validate_result(result: dict, test_case: dict) -> dict:
    """Validate the OCR extraction result against expected fields."""
    validation = {
        'status': 'success',
        'missing_fields': [],
        'confidence_scores': {}
    }
    
    # Check for required fields
    for field in test_case['expected_fields']:
        if field not in result or not result[field]['value']:
            validation['missing_fields'].append(field)
            validation['status'] = 'partial'
        else:
            validation['confidence_scores'][field] = result[field]['confidence']
    
    if validation['missing_fields']:
        validation['status'] = 'failed'
    
    # Check language detection
    if 'language' in test_case and result['language'] != test_case['language']:
        validation['language_match'] = False
    else:
        validation['language_match'] = True
    
    # Check overall confidence
    validation['overall_confidence'] = result['processing_metadata']['extraction_confidence']
    
    return validation

if __name__ == "__main__":
    # Configure logger
    logger.add("ocr_test.log", rotation="1 MB")
    
    # Run tests
    results = test_enhanced_ocr()
    
    # Print summary
    logger.info("\nTest Summary:")
    for test_name, result in results.items():
        if 'error' in result:
            logger.error(f"{test_name}: Error - {result['error']}")
        else:
            status = result['validation']['status']
            confidence = result['validation']['overall_confidence']
            logger.info(f"{test_name}: {status} (confidence: {confidence:.2f})") 