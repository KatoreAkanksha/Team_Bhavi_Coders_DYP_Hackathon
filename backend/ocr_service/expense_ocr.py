import cv2
import numpy as np
import easyocr
from PIL import Image
import pytesseract
from datetime import datetime
from dateutil import parser
from loguru import logger
from typing import Dict, Union, Optional
import json
from langdetect import detect
from pyzbar.pyzbar import decode
import re

class ExpenseOCR:
    def __init__(self, use_easyocr: bool = True):
        """
        Initialize the ExpenseOCR class with either EasyOCR or Tesseract.
        
        Args:
            use_easyocr (bool): If True, use EasyOCR, else use Tesseract
        """
        self.use_easyocr = use_easyocr
        if use_easyocr:
            logger.info("Initializing EasyOCR...")
            self.reader = easyocr.Reader(['en'])
        else:
            logger.info("Using Tesseract OCR...")
            # Ensure Tesseract is installed and path is set correctly
            try:
                pytesseract.get_tesseract_version()
            except Exception as e:
                logger.error(f"Tesseract not properly configured: {e}")
                raise

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for better OCR results.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            np.ndarray: Preprocessed image
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Denoise
            denoised = cv2.fastNlMeansDenoising(binary)
            
            # Increase contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Deskew if needed
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
            
            return rotated
        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            return image

    def extract_text(self, image: np.ndarray) -> str:
        """
        Extract text from image using OCR.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            str: Extracted text
        """
        try:
            # Preprocess image
            processed = self.preprocess_image(image)
            
            # Extract text using EasyOCR
            results = self.reader.readtext(processed)
            
            # Sort text blocks by vertical position (top to bottom)
            results.sort(key=lambda x: x[0][0][1])  # Sort by y-coordinate
            
            # Combine text blocks
            text_blocks = []
            current_line = []
            last_y = None
            y_threshold = 10  # Threshold for considering text on the same line
            
            for detection in results:
                bbox, text, conf = detection
                y_pos = bbox[0][1]  # y-coordinate of the text block
                
                # If this is the first text block or it's on a new line
                if last_y is None or abs(y_pos - last_y) > y_threshold:
                    if current_line:
                        text_blocks.append(' '.join(current_line))
                    current_line = [text]
                else:
                    current_line.append(text)
                
                last_y = y_pos
            
            # Add the last line if it exists
            if current_line:
                text_blocks.append(' '.join(current_line))
            
            # Join all text blocks with newlines
            extracted_text = '\n'.join(text_blocks)
            
            # Clean up the text
            extracted_text = self.clean_text(extracted_text)
            
            return extracted_text
        except Exception as e:
            logger.error(f"Error in text extraction: {e}")
            return ""

    def clean_text(self, text: str) -> str:
        """
        Clean extracted text.
        
        Args:
            text (str): Raw extracted text
            
        Returns:
            str: Cleaned text
        """
        try:
            # Remove extra whitespace
            text = ' '.join(text.split())
            
            # Replace common OCR mistakes
            replacements = {
                'l': '1',  # lowercase L to 1
                'O': '0',  # uppercase O to 0
                'o': '0',  # lowercase o to 0
                'I': '1',  # uppercase I to 1
                'i': '1',  # lowercase i to 1
                'Z': '2',  # uppercase Z to 2
                'z': '2',  # lowercase z to 2
                'S': '5',  # uppercase S to 5
                's': '5',  # lowercase s to 5
                'B': '8',  # uppercase B to 8
                'b': '8',  # lowercase b to 8
                'g': '9',  # lowercase g to 9
                'G': '9',  # uppercase G to 9
            }
            
            # Apply replacements only to numeric parts
            lines = text.split('\n')
            cleaned_lines = []
            
            for line in lines:
                # Check if line contains numbers
                if any(c.isdigit() for c in line):
                    for old, new in replacements.items():
                        line = line.replace(old, new)
                cleaned_lines.append(line)
            
            return '\n'.join(cleaned_lines)
        except Exception as e:
            logger.error(f"Error in text cleaning: {e}")
            return text

    def detect_language(self, text: str) -> str:
        """
        Detect the language of the extracted text.
        
        Args:
            text (str): Extracted text
            
        Returns:
            str: Detected language code
        """
        try:
            return detect(text)
        except:
            return "en"

    def extract_qr_data(self, image: np.ndarray) -> Optional[Dict]:
        """
        Extract data from QR codes in the image.
        
        Args:
            image (np.ndarray): Input image
            
        Returns:
            Optional[Dict]: Extracted QR data or None
        """
        try:
            decoded_objects = decode(image)
            for obj in decoded_objects:
                data = obj.data.decode('utf-8')
                if "upi://" in data.lower() or "gst" in data.lower():
                    return {"type": "upi" if "upi://" in data.lower() else "gst", "data": data}
            return None
        except Exception as e:
            logger.error(f"Error in QR extraction: {e}")
            return None

    def parse_date(self, text: str) -> Optional[str]:
        """
        Parse date from text using various formats.
        
        Args:
            text (str): Text containing date
            
        Returns:
            Optional[str]: Parsed date in YYYY-MM-DD format or None
        """
        try:
            # Look for date label first
            lines = text.split('\n')
            for line in lines:
                line = line.lower().strip()
                if 'date' in line:
                    # Common date patterns
                    date_patterns = [
                        r'\d{4}[-/]\d{1,2}[-/]\d{1,2}',  # YYYY-MM-DD
                        r'\d{1,2}[-/]\d{1,2}[-/]\d{4}',  # DD-MM-YYYY
                        r'\d{1,2}[-/]\d{1,2}[-/]\d{2}',  # DD-MM-YY
                        r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',  # 15 March 2024
                        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s*,?\s*\d{4}'  # March 15, 2024
                    ]
                    
                    for pattern in date_patterns:
                        matches = re.findall(pattern, line, re.IGNORECASE)
                        if matches:
                            try:
                                date = parser.parse(matches[0])
                                return date.strftime('%Y-%m-%d')
                            except:
                                continue
            
            # If no date found with label, search in entire text
            text = text.replace('\n', ' ')
            date_patterns = [
                r'\d{4}[-/]\d{1,2}[-/]\d{1,2}',  # YYYY-MM-DD
                r'\d{1,2}[-/]\d{1,2}[-/]\d{4}',  # DD-MM-YYYY
                r'\d{1,2}[-/]\d{1,2}[-/]\d{2}',  # DD-MM-YY
                r'\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}',  # 15 March 2024
                r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\s*,?\s*\d{4}'  # March 15, 2024
            ]
            
            for pattern in date_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    try:
                        date = parser.parse(matches[0])
                        if date.year > 1900:  # Sanity check
                            return date.strftime('%Y-%m-%d')
                    except:
                        continue
            
            return None
        except Exception as e:
            logger.error(f"Error in date parsing: {e}")
            return None

    def parse_amount(self, text: str) -> Optional[float]:
        """
        Parse amount from text.
        
        Args:
            text (str): Text containing amount
            
        Returns:
            Optional[float]: Parsed amount or None
        """
        try:
            # Look for total amount first
            lines = text.split('\n')
            for line in lines:
                line = line.lower().strip()
                if 'total' in line and 'amount' in line:
                    # Match amounts with currency symbols and decimal points
                    amount_pattern = r'[₹$]?\s*\d+(?:,\d{3})*(?:\.\d{2})?'
                    matches = re.findall(amount_pattern, line)
                    if matches:
                        # Clean the amount string and convert to float
                        amount_str = matches[-1].replace('₹', '').replace('$', '').replace(',', '')
                        return float(amount_str)
            
            # If no total amount found, look for subtotal
            for line in lines:
                line = line.lower().strip()
                if 'subtotal' in line:
                    amount_pattern = r'[₹$]?\s*\d+(?:,\d{3})*(?:\.\d{2})?'
                    matches = re.findall(amount_pattern, line)
                    if matches:
                        amount_str = matches[-1].replace('₹', '').replace('$', '').replace(',', '')
                        return float(amount_str)
            
            # If still no amount found, look for any amount pattern
            amount_pattern = r'[₹$]?\s*\d+(?:,\d{3})*(?:\.\d{2})?'
            amounts = []
            for line in lines:
                matches = re.findall(amount_pattern, line)
                for match in matches:
                    try:
                        amount = float(match.replace('₹', '').replace('$', '').replace(',', ''))
                        if amount > 0 and amount < 1000000:  # Reasonable range for expenses
                            amounts.append(amount)
                    except:
                        continue
            
            if amounts:
                # Return the largest amount that's not unreasonably large
                return max(amounts)
            
            return None
        except Exception as e:
            logger.error(f"Error in amount parsing: {e}")
            return None

    def categorize_expense(self, text: str) -> str:
        """
        Categorize expense based on text content.
        
        Args:
            text (str): Extracted text
            
        Returns:
            str: Expense category
        """
        # Simple keyword-based categorization
        categories = {
            'food': ['restaurant', 'cafe', 'food', 'pizza', 'burger', 'hotel'],
            'transport': ['uber', 'ola', 'metro', 'bus', 'train', 'fuel'],
            'shopping': ['store', 'shop', 'market', 'mall'],
            'utilities': ['electricity', 'water', 'gas', 'internet', 'phone'],
            'entertainment': ['movie', 'theatre', 'concert', 'game']
        }
        
        text_lower = text.lower()
        for category, keywords in categories.items():
            if any(keyword in text_lower for keyword in keywords):
                return category.capitalize()
        
        return "Other"

    def extract_merchant(self, text: str) -> str:
        """
        Extract merchant name from text.
        
        Args:
            text (str): Extracted text
            
        Returns:
            str: Merchant name
        """
        try:
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            # Look for common merchant name patterns in the first few lines
            for i, line in enumerate(lines[:5]):
                # Skip lines that are likely not merchant names
                if any(skip in line.lower() for skip in ['tel', 'fax', 'phone', 'date', 'time', '#', 'receipt']):
                    continue
                
                # Remove special characters and extra spaces
                cleaned = re.sub(r'[^\w\s]', '', line).strip()
                
                if cleaned and len(cleaned) > 2:
                    # Prefer uppercase names as they're often the business name
                    if cleaned.isupper() and len(cleaned) >= 3:
                        # Combine with next line if it looks like part of the name
                        if i + 1 < len(lines):
                            next_line = re.sub(r'[^\w\s]', '', lines[i + 1]).strip()
                            if next_line.isupper() and len(next_line) >= 2:
                                return f"{cleaned} {next_line}"
                        return cleaned
                    
                    # If no uppercase name found in first few lines, return first valid line
                    if i == 0:
                        return cleaned
            
            return ""
        except Exception as e:
            logger.error(f"Error in merchant extraction: {e}")
            return ""

    def process_image(self, image_path: str) -> Dict:
        """
        Process image and extract expense information.
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            Dict: Extracted expense information
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image at {image_path}")
            
            # Preprocess image
            processed_image = self.preprocess_image(image)
            
            # Extract text
            text = self.extract_text(processed_image)
            
            # Detect language
            language = self.detect_language(text)
            
            # Extract QR data if present
            qr_data = self.extract_qr_data(image)
            
            # Parse expense information
            expense_data = {
                "merchant": self.extract_merchant(text),
                "date": self.parse_date(text),
                "amount": self.parse_amount(text),
                "category": self.categorize_expense(text),
                "language": language,
                "qr_data": qr_data
            }
            
            return expense_data
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            return {
                "error": str(e),
                "merchant": "",
                "date": None,
                "amount": None,
                "category": "Other",
                "language": "en",
                "qr_data": None
            }

    def save_to_json(self, data: Dict, output_path: str) -> None:
        """
        Save extracted data to JSON file.
        
        Args:
            data (Dict): Extracted expense data
            output_path (str): Path to save JSON file
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving to JSON: {e}")
            raise 