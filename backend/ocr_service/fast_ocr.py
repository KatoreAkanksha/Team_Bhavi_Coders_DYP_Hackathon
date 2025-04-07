import logging
import json
import os

logger = logging.getLogger(__name__)

class FastOCR:
    """
    A simplified FastOCR class that delegates to EasyOCR.
    This class is a placeholder that provides compatibility with the existing codebase.
    """
    
    def __init__(self, use_gpu=False):
        """Initialize the FastOCR object."""
        self.use_gpu = use_gpu
        logger.info(f"Initialized FastOCR (simplified version). GPU: {use_gpu}")
    
    def process_image(self, image_path):
        """Process an image and return OCR results (simplified)."""
        logger.info(f"Processing image: {image_path}")
        # The actual OCR is done by EasyOCR in app.py, so we just return an empty dict
        return {
            "text": [],
            "file_path": image_path,
            "success": True,
            "message": "Processing delegated to EasyOCR"
        }
    
    def save_to_json(self, result, json_path):
        """Save OCR results to a JSON file."""
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=4)
            logger.info(f"Results saved to {json_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving results to JSON: {e}")
            return False 