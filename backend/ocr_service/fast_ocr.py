import cv2
import numpy as np
import easyocr
from datetime import datetime
from dateutil import parser
import re
import json
import os
from typing import Dict, Optional, List, Tuple, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FastOCR:
    def __init__(self, use_gpu: bool = False):
        """
        Initialize FastOCR with optimized settings.
        
        Args:
            use_gpu (bool): Whether to use GPU for OCR (if available)
        """
        # Initialize EasyOCR with optimized settings
        self.reader = easyocr.Reader(['en'], gpu=use_gpu, quantize=True)
        logger.info(f"FastOCR initialized with GPU: {use_gpu}")
        
        # Precompile regex patterns for better performance
        self.amount_patterns = [
            re.compile(r'(?:total|amount|balance due|sum|price|am0un7|grand total|amount payable|total due)[:\s]*[$₹]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', re.IGNORECASE),
            re.compile(r'[$₹]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', re.IGNORECASE),
            re.compile(r'(\d+(?:,\d{3})*(?:\.\d{2})?/-?)', re.IGNORECASE),
            re.compile(r'(?:total|amount)[:\s]*(\d+(?:,\d{3})*(?:\.\d{2})?)', re.IGNORECASE),
            re.compile(r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD|INR|EUR|GBP)', re.IGNORECASE),
            re.compile(r'(?:total|amount|sum)[:\s]*(\d+(?:[.,]\d{2})?)', re.IGNORECASE),
            re.compile(r'(\d+(?:[.,]\d{2})?)\s*(?:/-|USD|INR|EUR|GBP)', re.IGNORECASE),
            re.compile(r'(?:amount|total)[:\s]*(\d+(?:[.,]\d{2})?)', re.IGNORECASE),
            re.compile(r'[$₹](\d+(?:[.,]\d{2})?)', re.IGNORECASE),  # Match amounts with currency symbols
            re.compile(r'(\d+(?:[.,]\d{2})?)\s*[$₹]', re.IGNORECASE),  # Match amounts with currency symbols after
            re.compile(r'(?:RS\.?|INR\.?)\s*(\d+(?:[.,]\d{2})?)', re.IGNORECASE),  # Match Indian Rupee amounts
            re.compile(r'(?:USD\.?|\\$)\s*(\d+(?:[.,]\d{2})?)', re.IGNORECASE),  # Match USD amounts
            re.compile(r'(?:total|amount|sum)[:\s]*(\d+(?:[.,]\d{2})?)\s*(?:/-|USD|INR|EUR|GBP)', re.IGNORECASE),  # Match amounts with currency after total
            re.compile(r'(?:total|amount|sum)[:\s]*[$₹]?\s*(\d+(?:[.,]\d{2})?)', re.IGNORECASE)  # Match amounts with optional currency before total
        ]
        
        self.date_patterns = [
            re.compile(r'(?:date)[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', re.IGNORECASE),
            re.compile(r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})'),  # YYYY-MM-DD
            re.compile(r'(\d{1,2}[-/]\d{1,2}[-/]\d{4})'),  # DD-MM-YYYY
            re.compile(r'(\d{1,2}[-/]\d{1,2}[-/]\d{2})'),  # DD-MM-YY
            re.compile(r'(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})', re.IGNORECASE)
        ]
        
        self.merchant_patterns = [
            re.compile(r'(?:merchant|store|shop|business|title|7171e)[:\s]*([^\n]+)', re.IGNORECASE),
            re.compile(r'(?:title)[:\s]*([^\n]+)', re.IGNORECASE),
            re.compile(r'^([A-Za-z0-9\s\-\'\.]+(?:STORE|MART|SHOP|RESTAURANT|TOURS|TRAVEL|MARKET|MALL|HOTEL|CAFE|FOODS))', re.IGNORECASE),
            re.compile(r'([A-Z][A-Za-z0-9\s\-\'\.]+(?:PIZZA|FOODS|MARKET|STORE|SHOP|RESTAURANT|TOURS|TRAVEL|MART|MALL|HOTEL|CAFE))', re.IGNORECASE),
            re.compile(r'^([A-Za-z0-9\s\-\'\.]+)(?:\n|$)', re.MULTILINE)  # Match first line that looks like a business name
        ]
        
        # Common OCR corrections for amounts
        self.amount_corrections = {
            'S': '5', 's': '5', 'O': '0', 'o': '0', 'I': '1', 'i': '1',
            'l': '1', 'Z': '2', 'z': '2', 'B': '8', 'b': '8', 'g': '9',
            'G': '9', 'T': '7', 't': '7', 'A': '4', 'a': '4', 'E': '3',
            'e': '3', 'L': '1', 'D': '0', 'd': '0', '$': '$', '₹': '₹',
            'R': 'R', 'r': 'r', 'U': 'U', 'u': 'u', 'N': 'N', 'n': 'n',
            'I': 'I', 'i': 'i', 'D': 'D', 'd': 'd', 'S': 'S', 's': 's',
            ',': ',', '/': '/', '-': '-', '.': '.', '\\': '/'
        }
        
        # Category mappings
        self.category_keywords = {
            'Food': ['restaurant', 'cafe', 'food', 'grocery', 'pizza', 'burger', 'meal'],
            'Shopping': ['market', 'store', 'mall', 'shop', 'retail'],
            'Travel': ['hotel', 'flight', 'train', 'bus', 'taxi', 'travel', 'tour'],
            'Entertainment': ['movie', 'theatre', 'game', 'park', 'entertainment'],
            'Utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'utility'],
            'Healthcare': ['hospital', 'clinic', 'pharmacy', 'doctor', 'medical'],
            'Education': ['school', 'college', 'university', 'course', 'training']
        }

    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Enhanced image preprocessing for better OCR results"""
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Resize image if too small
            min_height = 1500
            if gray.shape[0] < min_height:
                scale = min_height / gray.shape[0]
                gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            
            # Denoise image
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Enhance contrast using CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            enhanced = clahe.apply(denoised)
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                enhanced, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY,
                15,  # Block size
                2    # C constant
            )
            
            # Remove noise
            kernel = np.ones((2,2), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
        except Exception as e:
            logger.error(f"Error in image preprocessing: {e}")
            return image

    def extract_text(self, image: np.ndarray) -> str:
        """Improved text extraction with better handling"""
        try:
            # Preprocess image
            processed = self.preprocess_image(image)
            
            # Extract text with optimized settings
            results = self.reader.readtext(
                processed,
                detail=1,
                paragraph=True,
                batch_size=1,
                width_ths=0.7,
                height_ths=0.7,
                contrast_ths=0.1,
                text_threshold=0.6,
                low_text=0.3,
                link_threshold=0.3,
                decoder='beamsearch',
                beamWidth=5
            )
            
            # Process and clean text
            lines = []
            for result in results:
                if len(result) >= 2:
                    text = result[1].strip()
                    if text:
                        # Apply OCR corrections to numbers
                        cleaned = self.clean_text(text)
                        lines.append(cleaned)
            
            # Join lines with proper spacing
            text = '\n'.join(line for line in lines if line)
            logger.info(f"Extracted text: {text}")
            return text
            
        except Exception as e:
            logger.error(f"Error in text extraction: {e}")
            return ""

    def clean_text(self, text: str) -> str:
        """Enhanced text cleaning with better number handling"""
        try:
            # Remove extra whitespace
            text = ' '.join(text.split())
            
            # Apply OCR corrections to numbers and common misreads
            result = []
            i = 0
            while i < len(text):
                char = text[i]
                if char.isdigit() or char in '.,/-$₹':
                    result.append(char)
                elif char in self.amount_corrections:
                    result.append(self.amount_corrections[char])
                else:
                    result.append(char)
                i += 1
            
            cleaned = ''.join(result)
            
            # Fix common OCR mistakes in amounts
            cleaned = re.sub(r'(\d+)[.,](\d{2})', r'\1.\2', cleaned)  # Fix decimal points
            cleaned = re.sub(r'(\d+)[.,](\d{1})', r'\1.\20', cleaned)  # Add missing decimal places
            cleaned = re.sub(r'(\d+)[.,](\d{3,})', r'\1.\2', cleaned)  # Fix multiple decimal places
            cleaned = re.sub(r'(\d+)[.,](\d{0})', r'\1.00', cleaned)  # Add .00 for whole numbers
            
            # Fix currency symbol spacing
            cleaned = re.sub(r'([$₹])\s*(\d)', r'\1\2', cleaned)  # Remove space after currency symbol
            cleaned = re.sub(r'(\d)\s*([$₹])', r'\1\2', cleaned)  # Remove space before currency symbol
            
            # Fix common currency symbol mistakes
            cleaned = re.sub(r'RS\.?\s*', '₹', cleaned, flags=re.IGNORECASE)  # Fix RS/INR to ₹
            cleaned = re.sub(r'USD\.?\s*', '$', cleaned, flags=re.IGNORECASE)  # Fix USD to $
            
            return cleaned
        except Exception as e:
            logger.error(f"Error in text cleaning: {e}")
            return text

    def extract_amount(self, text: str) -> float:
        """Enhanced amount extraction with better pattern matching"""
        try:
            # Clean the text first
            cleaned_text = self.clean_text(text)
            logger.info(f"Cleaned text for amount extraction: {cleaned_text}")
            
            # Look for amounts with specific amount/total labels first
            amount_patterns = [
                r'(?:amount|total|sum|price|balance)[:\s]*[$₹]?\s*[S]?(\d+(?:[.,]\d{2})?)',
                r'[$₹]\s*[S]?(\d+(?:[.,]\d{2})?)',
                r'(\d+(?:[.,]\d{2})?)\s*[$₹]',
                r'[S](\d+(?:[.,]\d{2})?)',  # Handle 'S' prefix specifically
            ]
            
            for pattern in amount_patterns:
                matches = re.finditer(pattern, cleaned_text, re.IGNORECASE)
                for match in matches:
                    try:
                        # Clean the matched amount
                        amount_str = match.group(1).strip()
                        # Remove any non-numeric characters except decimal point
                        amount_str = re.sub(r'[^0-9.]', '', amount_str)
                        # Convert to float
                        amount = float(amount_str)
                        if amount > 0:
                            logger.info(f"Found amount: {amount}")
                            return amount
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Could not parse amount: {e}")
                        continue
            
            # If no amount found with labels, try to find any number that looks like a total
            numbers = re.findall(r'[S]?(\d+(?:[.,]\d{2})?)', cleaned_text)
            valid_amounts = []
            for num in numbers:
                try:
                    # Clean the number
                    num = re.sub(r'[^0-9.]', '', num)
                    amount = float(num)
                    if amount > 0:
                        valid_amounts.append(amount)
                except (ValueError, TypeError):
                    continue
            
            if valid_amounts:
                # Look for amount after "Amount:" label
                for line in cleaned_text.split('\n'):
                    if re.search(r'(?:amount|total|sum|price|balance)', line, re.IGNORECASE):
                        for amount in valid_amounts:
                            if str(amount) in line.replace(',', ''):
                                logger.info(f"Found amount: {amount}")
                                return amount
                
                # If no amount found with label, return the first valid amount
                amount = valid_amounts[0]
                logger.info(f"Found amount: {amount}")
                return amount
            
            logger.warning("No valid amount found in text")
            return 0.0
            
        except Exception as e:
            logger.error(f"Error extracting amount: {e}")
            return 0.0

    def extract_date(self, text: str) -> Optional[str]:
        """Enhanced date extraction with multiple formats"""
        try:
            # Try each date pattern
            for pattern in self.date_patterns:
                matches = pattern.findall(text)
                if matches:
                    for match in matches:
                        try:
                            date = parser.parse(match)
                            if 1900 < date.year < 2100:  # Reasonable range
                                return date.strftime('%Y-%m-%d')
                        except ValueError:
                            continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting date: {e}")
            return None

    def extract_merchant(self, text: str) -> str:
        """Enhanced merchant name extraction with better cleaning"""
        try:
            # Clean the text first
            cleaned_text = self.clean_text(text)
            logger.info(f"Extracted text: {cleaned_text}")
            
            # Split text into lines
            lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]
            
            # First try to find merchant name after title label
            for line in lines:
                # Look specifically for title label
                if re.search(r'^(?:title)[:\s]*(.+)', line, re.IGNORECASE):
                    merchant = re.sub(r'^(?:title)[:\s]*', '', line, flags=re.IGNORECASE)
                    merchant = merchant.strip()
                    
                    # Remove any date patterns
                    merchant = re.sub(r'\s*\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4}.*$', '', merchant)
                    
                    # Remove any amount patterns
                    merchant = re.sub(r'\s*(?:amount|total|sum|price)[:\s]*[$₹]?\s*\d+.*$', '', merchant, flags=re.IGNORECASE)
                    merchant = re.sub(r'\s*[$₹]\s*\d+.*$', '', merchant)
                    
                    # Remove date label and text
                    merchant = re.sub(r'\s*(?:date|time)[:\s]*.*$', '', merchant, flags=re.IGNORECASE)
                    
                    # Clean up any remaining special characters and extra spaces
                    merchant = re.sub(r'[^A-Za-z0-9\s\-\']', ' ', merchant)
                    merchant = ' '.join(merchant.split())
                    
                    if merchant:
                        logger.info(f"Found merchant: {merchant}")
                        return merchant
            
            logger.warning("No merchant name found")
            return "Unknown Merchant"
            
        except Exception as e:
            logger.error(f"Error extracting merchant: {e}")
            return "Unknown Merchant"

    def categorize_expense(self, text: str, merchant: str) -> str:
        """Enhanced expense categorization"""
        try:
            # Combine text and merchant for better matching
            combined_text = f"{text} {merchant}".lower()
            
            # Check each category's keywords
            for category, keywords in self.category_keywords.items():
                if any(keyword.lower() in combined_text for keyword in keywords):
                    return category
            
            return "Other"
            
        except Exception as e:
            logger.error(f"Error categorizing expense: {e}")
            return "Other"

    def process_image(self, image_path: str) -> Dict:
        """Process receipt image and extract information"""
        try:
            # Read and process image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not read image")
            
            # Extract text
            text = self.extract_text(image)
            logger.info(f"Extracted text: {text}")
            
            # Extract merchant name
            merchant = self.extract_merchant(text)
            
            # Extract date
            date = self.extract_date(text)
            
            # Extract amount
            amount = self.extract_amount(text)
            
            # Categorize expense
            category = self.categorize_expense(text, merchant)
            
            # Format the result
            result = {
                "merchant": merchant.strip(),
                "date": date,
                "amount": amount,
                "category": category,
                "raw_text": text.strip()
            }
            
            logger.info(f"Extracted receipt data: {json.dumps(result, indent=2)}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {
                "merchant": "Unknown Merchant",
                "date": None,
                "amount": 0.0,
                "category": "Other",
                "raw_text": ""
            }

    def save_to_json(self, data: Dict, output_path: str) -> None:
        """Save extracted data to JSON file"""
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {output_path}")
        except Exception as e:
            logger.error(f"Error saving to JSON: {e}") 