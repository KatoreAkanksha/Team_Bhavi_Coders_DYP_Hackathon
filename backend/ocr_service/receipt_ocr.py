import cv2
import numpy as np
import easyocr
from PIL import Image
import pytesseract
from datetime import datetime
from dateutil import parser
from loguru import logger
from typing import Dict, Union, Optional, List
import json
from langdetect import detect
from pyzbar.pyzbar import decode
import re
from skimage import measure
from imutils import contours
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class ReceiptOCR:
    def __init__(self, use_easyocr: bool = True):
        """
        Initialize the ReceiptOCR class with enhanced receipt processing capabilities.
        
        Args:
            use_easyocr (bool): If True, use EasyOCR, else use Tesseract
        """
        self.use_easyocr = use_easyocr
        if use_easyocr:
            logger.info("Initializing EasyOCR with multiple languages...")
            self.reader = easyocr.Reader(['en', 'hi', 'mr'])  # English, Hindi, Marathi
        else:
            logger.info("Using Tesseract OCR...")
            try:
                pytesseract.get_tesseract_version()
            except Exception as e:
                logger.error(f"Tesseract not properly configured: {e}")
                raise

        # Load receipt-specific dictionaries
        self.load_receipt_dictionaries()
        
        # Initialize merchant-to-category mapping
        self.merchant_categories = self.load_merchant_categories()

    def load_receipt_dictionaries(self):
        """Load receipt-specific dictionaries and patterns."""
        self.receipt_terms = {
            'en': {
                'total': ['total', 'amount', 'sum', 'grand total', 'net amount'],
                'tax': ['tax', 'gst', 'vat', 'service charge'],
                'date': ['date', 'invoice date', 'bill date'],
                'merchant': ['store', 'shop', 'outlet', 'branch']
            },
            'hi': {
                'total': ['कुल', 'राशि', 'योग', 'कुल राशि'],
                'tax': ['कर', 'जीएसटी', 'वैट', 'सेवा शुल्क'],
                'date': ['तारीख', 'बिल की तारीख', 'चालान की तारीख'],
                'merchant': ['दुकान', 'स्टोर', 'शाखा']
            },
            'mr': {
                'total': ['एकूण', 'रक्कम', 'बेरीज', 'एकूण रक्कम'],
                'tax': ['कर', 'जीएसटी', 'व्हॅट', 'सेवा शुल्क'],
                'date': ['तारीख', 'बिलाची तारीख', 'चालानाची तारीख'],
                'merchant': ['दुकान', 'स्टोअर', 'शाखा']
            }
        }

        self.currency_patterns = {
            'en': [r'₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', r'Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'],
            'hi': [r'₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', r'रु\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'],
            'mr': [r'₹\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', r'रु\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)']
        }

    def load_merchant_categories(self) -> Dict:
        """Load merchant-to-category mapping from file or create default."""
        try:
            with open('merchant_categories.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                'default': {
                    'groceries': ['supermarket', 'grocery', 'mart', 'store'],
                    'restaurant': ['restaurant', 'cafe', 'food', 'dining'],
                    'transport': ['taxi', 'uber', 'ola', 'metro'],
                    'shopping': ['mall', 'fashion', 'clothing', 'electronics']
                }
            }

    def enhanced_preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Enhanced image preprocessing specifically for receipts.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            np.ndarray: Preprocessed image
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply adaptive thresholding with receipt-specific parameters
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 15, 2
            )
            
            # Denoise with receipt-specific parameters
            denoised = cv2.fastNlMeansDenoising(binary, None, 10, 7, 21)
            
            # Enhance contrast specifically for receipt text
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Deskew with improved accuracy
            coords = np.column_stack(np.where(enhanced > 0))
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            (h, w) = enhanced.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                enhanced, M, (w, h),
                flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )
            
            # Detect and enhance receipt borders
            edges = cv2.Canny(rotated, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
            
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    cv2.line(rotated, (x1, y1), (x2, y2), (255, 255, 255), 2)
            
            return rotated
        except Exception as e:
            logger.error(f"Error in enhanced image preprocessing: {e}")
            return image

    def extract_text_with_position(self, image: np.ndarray) -> List[Dict]:
        """
        Extract text with position information for better field identification.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            List[Dict]: List of text blocks with position and confidence
        """
        try:
            processed = self.enhanced_preprocess(image)
            
            if self.use_easyocr:
                results = self.reader.readtext(processed)
                text_blocks = []
                
                for detection in results:
                    bbox, text, conf = detection
                    text_blocks.append({
                        'text': text,
                        'confidence': conf,
                        'position': {
                            'x1': int(bbox[0][0]),
                            'y1': int(bbox[0][1]),
                            'x2': int(bbox[2][0]),
                            'y2': int(bbox[2][1])
                        }
                    })
            else:
                # Tesseract implementation with position
                data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
                text_blocks = []
                
                for i in range(len(data['text'])):
                    if data['text'][i].strip():
                        text_blocks.append({
                            'text': data['text'][i],
                            'confidence': float(data['conf'][i]) / 100.0,
                            'position': {
                                'x1': data['left'][i],
                                'y1': data['top'][i],
                                'x2': data['left'][i] + data['width'][i],
                                'y2': data['top'][i] + data['height'][i]
                            }
                        })
            
            return text_blocks
        except Exception as e:
            logger.error(f"Error in text extraction with position: {e}")
            return []

    def group_text_blocks(self, text_blocks: List[Dict]) -> List[List[Dict]]:
        """
        Group text blocks into lines based on vertical proximity.
        
        Args:
            text_blocks (List[Dict]): List of text blocks with position
            
        Returns:
            List[List[Dict]]: Grouped text blocks by lines
        """
        if not text_blocks:
            return []
            
        # Sort by vertical position
        text_blocks.sort(key=lambda x: x['position']['y1'])
        
        lines = []
        current_line = []
        y_threshold = 10  # Threshold for considering text on the same line
        
        for block in text_blocks:
            if not current_line:
                current_line.append(block)
            else:
                last_block = current_line[-1]
                y_diff = abs(block['position']['y1'] - last_block['position']['y1'])
                
                if y_diff <= y_threshold:
                    current_line.append(block)
                else:
                    lines.append(current_line)
                    current_line = [block]
        
        if current_line:
            lines.append(current_line)
        
        # Sort each line by horizontal position
        for line in lines:
            line.sort(key=lambda x: x['position']['x1'])
        
        return lines

    def extract_structured_data(self, image: np.ndarray) -> Dict:
        """
        Extract structured data from receipt image.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            Dict: Structured receipt data
        """
        try:
            text_blocks = self.extract_text_with_position(image)
            lines = self.group_text_blocks(text_blocks)
            
            # Initialize result dictionary
            result = {
                'merchant': {'value': '', 'confidence': 0.0},
                'date': {'value': '', 'confidence': 0.0},
                'total': {'value': 0.0, 'confidence': 0.0},
                'tax': {'value': 0.0, 'confidence': 0.0},
                'items': [],
                'raw_text': '',
                'language': 'en',
                'processing_metadata': {
                    'image_quality': self.assess_image_quality(image),
                    'extraction_confidence': 0.0
                }
            }
            
            # Extract language from text
            all_text = ' '.join([block['text'] for block in text_blocks])
            result['language'] = self.detect_language(all_text)
            
            # Process each line
            for line in lines:
                line_text = ' '.join([block['text'] for block in line])
                line_confidence = sum(block['confidence'] for block in line) / len(line)
                
                # Check for merchant name (typically at top)
                if not result['merchant']['value'] and self.is_merchant_line(line_text, result['language']):
                    result['merchant'] = {
                        'value': line_text,
                        'confidence': line_confidence
                    }
                
                # Check for date
                if not result['date']['value'] and self.is_date_line(line_text, result['language']):
                    parsed_date = self.parse_date(line_text)
                    if parsed_date:
                        result['date'] = {
                            'value': parsed_date,
                            'confidence': line_confidence
                        }
                
                # Check for total amount
                if result['total']['value'] == 0.0 and self.is_total_line(line_text, result['language']):
                    amount = self.parse_amount(line_text, result['language'])
                    if amount:
                        result['total'] = {
                            'value': amount,
                            'confidence': line_confidence
                        }
                
                # Check for tax amount
                if result['tax']['value'] == 0.0 and self.is_tax_line(line_text, result['language']):
                    tax = self.parse_amount(line_text, result['language'])
                    if tax:
                        result['tax'] = {
                            'value': tax,
                            'confidence': line_confidence
                        }
                
                # Add to raw text
                result['raw_text'] += line_text + '\n'
            
            # Calculate overall extraction confidence
            result['processing_metadata']['extraction_confidence'] = self.calculate_overall_confidence(result)
            
            return result
        except Exception as e:
            logger.error(f"Error in structured data extraction: {e}")
            return {}

    def is_merchant_line(self, text: str, language: str) -> bool:
        """Check if line contains merchant information."""
        merchant_indicators = self.receipt_terms[language]['merchant']
        return any(indicator in text.lower() for indicator in merchant_indicators)

    def is_date_line(self, text: str, language: str) -> bool:
        """Check if line contains date information."""
        date_indicators = self.receipt_terms[language]['date']
        return any(indicator in text.lower() for indicator in date_indicators)

    def is_total_line(self, text: str, language: str) -> bool:
        """Check if line contains total amount."""
        total_indicators = self.receipt_terms[language]['total']
        return any(indicator in text.lower() for indicator in total_indicators)

    def is_tax_line(self, text: str, language: str) -> bool:
        """Check if line contains tax information."""
        tax_indicators = self.receipt_terms[language]['tax']
        return any(indicator in text.lower() for indicator in tax_indicators)

    def parse_amount(self, text: str, language: str) -> Optional[float]:
        """Parse amount from text with language-specific patterns."""
        for pattern in self.currency_patterns[language]:
            match = re.search(pattern, text)
            if match:
                try:
                    amount_str = match.group(1).replace(',', '')
                    return float(amount_str)
                except (ValueError, AttributeError):
                    continue
        return None

    def assess_image_quality(self, image: np.ndarray) -> float:
        """Assess image quality for OCR processing."""
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Calculate image quality metrics
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            contrast_score = np.std(gray)
            
            # Normalize scores
            blur_score = min(blur_score / 100, 1.0)
            contrast_score = min(contrast_score / 50, 1.0)
            
            # Combine scores
            quality_score = (blur_score + contrast_score) / 2
            
            return quality_score
        except Exception as e:
            logger.error(f"Error in image quality assessment: {e}")
            return 0.0

    def calculate_overall_confidence(self, result: Dict) -> float:
        """Calculate overall confidence score for the extraction."""
        weights = {
            'merchant': 0.2,
            'date': 0.2,
            'total': 0.3,
            'tax': 0.2,
            'image_quality': 0.1
        }
        
        confidence = 0.0
        for field, weight in weights.items():
            if field == 'image_quality':
                confidence += result['processing_metadata']['image_quality'] * weight
            else:
                confidence += result[field]['confidence'] * weight
        
        return confidence 