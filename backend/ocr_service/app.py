from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import uuid
from fast_ocr import FastOCR
import logging
from logging.handlers import RotatingFileHandler
from flask_cors import CORS
from werkzeug.utils import secure_filename
import time
from functools import wraps
import easyocr
import cv2
import numpy as np
import base64
import re
from io import BytesIO
from PIL import Image
import mimetypes
import difflib

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add file handler
file_handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=1024 * 1024,  # 1MB
    backupCount=10
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

# Initialize Flask app
app = Flask(__name__, static_folder='static')
CORS(app)

# Initialize rate limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configure maximum file size (8MB)
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024

# Allowed file types
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
ALLOWED_MIMETYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'}

# Initialize OCR
ocr = FastOCR(use_gpu=False)  # Set to True if you have a GPU

# Initialize EasyOCR reader
logger.info("Initializing EasyOCR reader...")
reader = easyocr.Reader(['en'])
logger.info("EasyOCR reader initialized successfully")

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_file_type(file_path):
    """Validate file type using magic numbers."""
    mime = mimetypes.guess_type(file_path)[0]
    return mime in ALLOWED_MIMETYPES

def secure_delete(file_path):
    """Securely delete a file."""
    try:
        if os.path.exists(file_path):
            # Overwrite the file with zeros
            with open(file_path, 'wb') as f:
                f.write(b'\0' * os.path.getsize(file_path))
            # Delete the file
            os.remove(file_path)
    except Exception as e:
        logger.error(f"Error deleting file {file_path}: {e}")

def log_request(f):
    """Decorator to log request details."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        response = f(*args, **kwargs)
        duration = time.time() - start_time
        logger.info(
            f"Request: {request.method} {request.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.2f}s - "
            f"IP: {request.remote_addr}"
        )
        return response
    return decorated_function

@app.route('/')
@log_request
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
@limiter.limit("10 per minute")  # Rate limit for uploads
@log_request
def upload_file():
    """Handle file upload and OCR processing."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        if file:
            # Secure the filename
            filename = secure_filename(f"{uuid.uuid4()}.jpg")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            try:
                # Save the file
                file.save(filepath)
                
                # Validate file type
                if not validate_file_type(filepath):
                    secure_delete(filepath)
                    return jsonify({'error': 'Invalid file type'}), 400
                
                # Process the image
                result = ocr.process_image(filepath)
                
                # Save results to JSON
                json_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{filename}.json")
                ocr.save_to_json(result, json_path)
                
                return jsonify(result)
            except Exception as e:
                logger.error(f"Error processing file: {e}")
                return jsonify({'error': str(e)}), 500
            finally:
                # Securely delete the uploaded file
                secure_delete(filepath)
    except Exception as e:
        logger.error(f"Error in upload endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/uploads/<path:filename>')
@limiter.limit("100 per minute")  # Rate limit for file access
@log_request
def uploaded_file(filename):
    """Serve uploaded files with security checks."""
    if not secure_filename(filename) == filename:
        return jsonify({'error': 'Invalid filename'}), 400
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon."""
    return send_from_directory(os.path.join(app.root_path, 'static'),
                             'favicon.ico', mimetype='image/vnd.microsoft.icon')

@app.errorhandler(404)
def not_found_error(error):
    """Handle 404 errors."""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    logger.error(f"500 error: {error}")
    return render_template('500.html'), 500

@app.errorhandler(413)
def too_large(error):
    """Handle file too large errors."""
    return jsonify({'error': 'File too large. Maximum size is 8MB'}), 413

def preprocess_image(image):
    """Enhanced image preprocessing with rotation correction and quality improvements"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply image rotation correction (deskewing)
        # Find all contours
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        
        # Calculate potential rotation angles based on contours
        angles = []
        for contour in contours:
            if cv2.contourArea(contour) > 100:  # Filter small contours
                rect = cv2.minAreaRect(contour)
                angle = rect[-1]
                # Normalize angle
                if angle < -45:
                    angle = 90 + angle
                angles.append(angle)
        
        # If we found angles, calculate the median as the most likely correct angle
        if angles:
            angle_to_correct = np.median(angles)
            if abs(angle_to_correct) > 0.5:  # Only correct significant angles
                logger.info(f"Correcting image rotation by {angle_to_correct:.2f} degrees")
                (h, w) = gray.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle_to_correct, 1.0)
                rotated = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, 
                                         borderMode=cv2.BORDER_REPLICATE)
                gray = rotated
        
        # Apply enhanced contrast and brightness normalization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        
        # Apply noise reduction
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        
        # Apply adaptive thresholding for better text extraction
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Apply morphological operations to connect broken text and remove noise
        kernel = np.ones((1, 1), np.uint8)
        morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        logger.info("Image preprocessing completed with enhanced quality improvements")
        return morph
    except Exception as e:
        logger.error(f"Error in enhanced image preprocessing: {str(e)}")
        # Fallback to original image if preprocessing fails
        logger.info("Falling back to original grayscale image")
        try:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        except:
            return image

# Currency mapping
currency_map = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    'rs': 'INR',  # Handle "Rs" text for Indian Rupees
    'rupees': 'INR'
}

def detect_and_correct_orientation(image):
    """Detect and correct image orientation using text line detection"""
    try:
        # Apply edge detection to find text lines
        edges = cv2.Canny(image, 50, 150, apertureSize=3)
        
        # Use Hough transform to detect lines
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
        
        if lines is not None and len(lines) > 0:
            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                if x2 - x1 != 0:  # Avoid division by zero
                    angle = np.arctan((y2 - y1) / (x2 - x1)) * 180.0 / np.pi
                    angles.append(angle)
            
            # Get the median angle
            if angles:
                median_angle = np.median(angles)
                
                # If angle is significant, rotate the image
                if abs(median_angle) > 0.5:
                    (h, w) = image.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                    rotated = cv2.warpAffine(image, M, (w, h), 
                                            flags=cv2.INTER_CUBIC, 
                                            borderMode=cv2.BORDER_REPLICATE)
                    logger.info(f"Corrected image orientation by {median_angle:.2f} degrees")
                    return rotated
        
        return image
    except Exception as e:
        logger.error(f"Error in orientation detection: {str(e)}")
        return image

def process_receipt_image(image):
    """Process receipt image with multiple enhancement techniques"""
    # Try multiple preprocessing techniques and combine results
    results = []
    
    # Original grayscale conversion
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 1. Basic thresholding - MOST RELIABLE FOR STANDARD RECEIPTS
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(("binary", binary))
    
    # 2. Adaptive thresholding - GOOD FOR VARYING LIGHTING CONDITIONS
    adaptive = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    results.append(("adaptive", adaptive))
    
    # 3. Contrast enhancement - ALWAYS APPLY FOR BETTER ACCURACY
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    _, enhanced_binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(("enhanced", enhanced_binary))
    
    # 4. Denoising - ALWAYS USE FOR BETTER TEXT DETECTION
    denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    _, denoised_binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    results.append(("denoised", denoised_binary))
    
    # Process each variant through OCR
    all_results = []
    confidence_threshold = 0.2  # Minimum confidence to consider a result valid
    
    for name, img in results:
        try:
            # Always use line mode for better separation of text elements
            variant_results = reader.readtext(img, detail=1, paragraph=False)
            logger.info(f"OCR variant {name}: found {len(variant_results)} text regions")
            
            # Filter by confidence and add source
            for res in variant_results:
                box, text, confidence = res
                if confidence > confidence_threshold:
                    all_results.append({"variant": name, "box": box, "text": text, "confidence": confidence})
        except Exception as e:
            logger.error(f"Error processing variant {name}: {str(e)}")
    
    return all_results

def normalize_text(text):
    """Normalize text for better matching and extraction"""
    if not text:
        return ""
        
    # Convert to lowercase
    text = text.lower()
    
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    
    # Keep most punctuation for better pattern matching
    # Only remove truly problematic characters
    text = re.sub(r'[^\w\s:;.,\-/$€£¥₹%]', '', text)
    
    return text.strip()

def extract_receipt_data(ocr_results):
    """Extract structured data from OCR results with enhanced reliability"""
    # First normalize all detected text
    normalized_results = []
    
    for result in ocr_results:
        text = result["text"].strip()
        if not text:
            continue
        
        # Skip very short texts (likely noise)
        if len(text) < 2:
            continue
            
        # Add to results with confidence score
        normalized_results.append({
            "text": text,
            "normalized_text": normalize_text(text),
            "confidence": result["confidence"],
            "variant": result["variant"]
        })
    
    # Sort by confidence (highest first)
    normalized_results.sort(key=lambda x: x["confidence"], reverse=True)
    
    # DEDUPLICATE: Remove only exact duplicate text entries
    deduplicated_results = []
    seen_texts = set()
    
    for result in normalized_results:
        # Only compare exact texts (not normalized) to avoid losing important info
        if result["text"] not in seen_texts:
            seen_texts.add(result["text"])
            deduplicated_results.append(result)
    
    # Log the normalized and deduplicated results
    logger.info(f"OCR results: {len(normalized_results)} lines, deduplicated to {len(deduplicated_results)} lines")
    for idx, res in enumerate(deduplicated_results):
        logger.info(f"  Text {idx+1} ({res['variant']}, {res['confidence']:.2f}): '{res['text']}'")
    
    # Extract title, date and amount with enhanced algorithms
    title = extract_title_enhanced(deduplicated_results)
    date = extract_date_enhanced(deduplicated_results)
    amount_data = extract_amount_enhanced(deduplicated_results)
    
    # Return raw text lines
    unique_raw_text = [res["text"] for res in deduplicated_results]
    
    return {
        "title": title,
        "date": date,
        "amount": amount_data["value"],
        "currency": amount_data["currency"],
        "raw_text": unique_raw_text
    }

def extract_title_enhanced(normalized_results):
    """Enhanced title extraction with better handling of common patterns"""
    # First look for explicit title labels with variations
    title_patterns = [
        (r'(?:title|merchant|store|vendor|name)[:.\s-]+(.+)', 0.9),  # Explicit labels
        (r'^((?!date|amount|total|invoice|receipt).{3,30})$', 0.7),  # Likely company name (not date/amount/etc)
        (r'^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})$', 0.6)  # Proper noun sequence (likely merchant name)
    ]
    
    logger.info("Attempting enhanced title extraction")
    
    # First pass: look for explicit title markers
    for res in normalized_results:
        text = res["text"].strip()
        
        # Check for Title: prefix with variations and corrections
        for pattern, score in title_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted_title = match.group(1).strip()
                logger.info(f"Found title using pattern '{pattern}': '{extracted_title}' (score: {score:.1f})")
                
                # Clean up title - remove common prefixes that might remain
                cleaned_title = re.sub(r'^(title|merchant|store|name)\s*[:.-]?\s*', '', extracted_title, flags=re.IGNORECASE)
                
                # If it's just a single word, make sure it's not just a label
                if len(cleaned_title.split()) == 1 and len(cleaned_title) < 4:
                    continue
                    
                return cleaned_title
                
    # Second pass: look for lines that match common merchant name patterns
    merchant_name_candidates = []
    
    for res in normalized_results:
        text = res["text"].strip()
        
        # Skip very short texts or known labels
        if len(text) < 3:
            continue
            
        if re.search(r'(?:date|amount|total|invoice|receipt|bill|tax|payment|customer)', text, re.IGNORECASE):
            continue
        
        # Look for proper name patterns (capitalized words)
        if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$', text):
            merchant_name_candidates.append((text, 0.8, "proper name"))
            continue
            
        # Check if it looks like a business name (with LLC, Inc, etc.)
        if re.search(r'(?:LLC|Inc|Corp|Shop|Store|Restaurant|Cafe|Hotel)', text, re.IGNORECASE):
            merchant_name_candidates.append((text, 0.7, "business name"))
            continue
            
        # First non-date, non-amount line is often the merchant name
        if len(merchant_name_candidates) == 0:
            # Make sure it's not a date or amount
            if not re.search(r'\d{1,2}[/.-]\d{1,2}', text) and not re.search(r'[$€£¥₹]\s*\d+', text):
                merchant_name_candidates.append((text, 0.5, "first line"))
    
    # Sort by score and pick the best candidate
    if merchant_name_candidates:
        merchant_name_candidates.sort(key=lambda x: x[1], reverse=True)
        best_candidate = merchant_name_candidates[0]
        logger.info(f"Using merchant name '{best_candidate[0]}' (score: {best_candidate[1]:.1f}, type: {best_candidate[2]})")
        return best_candidate[0]
    
    # Fallback: use first meaningful line
    for res in normalized_results:
        text = res["text"].strip()
        if len(text) >= 3 and not text.isdigit():
            logger.info(f"Using first meaningful line as title: '{text}'")
            return text
    
    logger.warning("No title could be extracted using enhanced methods")
    return "Untitled Receipt"

def extract_date_enhanced(normalized_results):
    """Enhanced date extraction with support for multiple formats"""
    # Define various date formats with specific focus on common OCR patterns
    date_patterns = [
        # European/International format patterns (DD/MM/YYYY) - explicitly prioritized
        (r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', 0.95),  # DD/MM/YYYY direct pattern
        (r'(\d{2})[/.-](\d{1,2})[/.-](\d{4})', 0.95),  # DD/MM/YYYY with 2-digit day
        (r'(\d{1})[/.-](\d{1,2})[/.-](\d{4})', 0.95),  # D/MM/YYYY or D/M/YYYY
        
        # Labeled dates with explicit format
        (r'(?:date|dt)[:.\s-]+(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})', 0.9),
        (r'(?:date|dt)[:.\s-]+(\d{1,2}[\s]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*\d{2,4})', 0.85),
        
        # Simple date patterns without labels
        (r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{2})', 0.8),   # DD/MM/YY or MM/DD/YY
        
        # ISO format dates
        (r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})', 0.85),  # YYYY-MM-DD
        
        # Text dates
        (r'(\d{1,2})[\s]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]*(\d{2,4})', 0.8),
        (r'(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s]*(\d{1,2})[\s,]*(\d{2,4})', 0.8)
    ]
    
    # Month mapping for text dates
    month_map = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    
    logger.info("Attempting enhanced date extraction")
    
    # DEBUG: Print all text lines to aid in debugging
    logger.info("DEBUG: All available text lines:")
    for i, res in enumerate(normalized_results):
        logger.info(f"  Line {i+1}: '{res['text']}'")
    
    # First check: Look for standalone date formats like "13/3/2024" (European format)
    for res in normalized_results:
        text = res["text"].strip()
        logger.info(f"DEBUG: Checking text for dates: '{text}'")
        
        # Check explicitly for "Date: DD/MM/YYYY" format with direct pattern matching
        if "date" in text.lower():
            logger.info(f"DEBUG: Found 'date' keyword in: '{text}'")
            # This will match both "Date: 13/3/2024" or just a line with "date" and "13/3/2024"
            date_matches = re.findall(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', text)
            if date_matches:
                try:
                    # Get the first match
                    day, month, year = date_matches[0]
                    logger.info(f"DEBUG: Found date components - day: {day}, month: {month}, year: {year}")
                    
                    # Check if day is > 12, confirming it's a DD/MM format
                    if int(day) > 12 and int(day) <= 31:
                        formatted_date = f"{month.zfill(2)}/{day.zfill(2)}/{year}"
                        logger.info(f"Extracted European date (DD/MM/YYYY): {formatted_date} from '{text}'")
                        return formatted_date
                except Exception as e:
                    logger.warning(f"Error parsing European date format: {e}")
    
    # Direct pattern match for dates without keywords
    for res in normalized_results:
        text = res["text"].strip()
        
        # Look for patterns like DD/MM/YYYY directly (e.g., "13/3/2024")
        date_match = re.search(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', text)
        if date_match:
            logger.info(f"DEBUG: Found potential direct date match in: '{text}'")
            try:
                day, month, year = date_match.groups()
                logger.info(f"DEBUG: Direct match components - day: {day}, month: {month}, year: {year}")
                
                # Check for European format (day > 12)
                if int(day) > 12 and int(day) <= 31 and int(month) <= 12:
                    formatted_date = f"{month.zfill(2)}/{day.zfill(2)}/{year}"
                    logger.info(f"Found European date format (DD/MM/YYYY): {formatted_date} from '{text}'")
                    return formatted_date
                else:
                    # Assume MM/DD/YYYY if day ≤ 12
                    formatted_date = f"{day.zfill(2)}/{month.zfill(2)}/{year}"
                    logger.info(f"Found date format (assumed MM/DD/YYYY): {formatted_date} from '{text}'")
                    return formatted_date
            except Exception as e:
                logger.warning(f"Error parsing potential direct date match: {e}")
    
    # FORCE CHECK: Explicitly look for European format DD/MM/YYYY
    for res in normalized_results:
        text = res["text"].strip()
        logger.info(f"DEBUG: Force checking for European date in: '{text}'")
        
        # Explicitly check for D/M/YYYY format (covering 13/3/2024)
        day_month_year_match = re.search(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', text)
        if day_month_year_match:
            try:
                d, m, y = day_month_year_match.groups()
                logger.info(f"DEBUG: Force match - d: {d}, m: {m}, y: {y}")
                
                # Convert DD/MM/YYYY to MM/DD/YYYY for frontend
                formatted_date = f"{m.zfill(2)}/{d.zfill(2)}/{y}"
                logger.info(f"DEBUG: FORCE DETECTED European date as: {formatted_date} from '{text}'")
                return formatted_date
            except Exception as e:
                logger.warning(f"Force check error: {e}")
    
    # Check for date patterns with specific capture groups
    for res in normalized_results:
        text = res["text"].strip()
        
        for pattern, score in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    logger.info(f"DEBUG: Pattern match: '{pattern}' in '{text}'")
                    logger.info(f"DEBUG: Match groups: {groups}")
                    
                    # Handle different pattern types based on the number of groups
                    if len(groups) == 3:  # Patterns with day, month, year as separate groups
                        part1, part2, part3 = groups
                        
                        # First try to determine if it's European (DD/MM) or US (MM/DD) format
                        if int(part1) > 12 and int(part1) <= 31 and int(part2) <= 12:
                            # DD/MM/YYYY format - convert to MM/DD/YYYY for frontend
                            day, month, year = part1, part2, part3
                        else:
                            # Default to assuming MM/DD/YYYY
                            month, day, year = part1, part2, part3
                        
                        # Ensure 4-digit year
                        if len(year) == 2:
                            year = '20' + year if int(year) < 50 else '19' + year
                        
                        formatted_date = f"{month.zfill(2)}/{day.zfill(2)}/{year}"
                        logger.info(f"Extracted date (pattern matched): {formatted_date}")
                        return formatted_date
                    
                    elif len(groups) == 2:  # Text date patterns with day/month as text
                        # Handle text month formats
                        for month_abbr in month_map.keys():
                            if month_abbr in text.lower():
                                if 'jan' in text.lower() or 'feb' in text.lower():
                                    logger.info(f"Found text month: {month_abbr}")
                                
                                day = groups[0] if re.match(r'\d{1,2}', groups[0]) else groups[1]
                                year = groups[1] if len(groups[1]) >= 2 else groups[0]
                                
                                # Ensure 4-digit year
                                if len(year) == 2:
                                    year = '20' + year if int(year) < 50 else '19' + year
                                
                                month = month_map[month_abbr]
                                formatted_date = f"{month}/{day.zfill(2)}/{year}"
                                logger.info(f"Converted text month date: {formatted_date}")
                                return formatted_date
                except Exception as e:
                    logger.warning(f"Error parsing complex date pattern: {str(e)}")
                    continue
    
    # SIMPLE FALLBACK: Look for anything that matches DD/MM/YYYY format directly
    direct_matches = []
    for res in normalized_results:
        text = res["text"].strip()
        # This pattern will match dates like 13/3/2024, 01/02/2023, etc.
        direct_matches.extend(re.findall(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', text))
    
    logger.info(f"DEBUG: Direct date pattern matches: {direct_matches}")
    if direct_matches:
        # Use the first match
        day, month, year = direct_matches[0]
        # Convert to MM/DD/YYYY format for frontend
        formatted_date = f"{month.zfill(2)}/{day.zfill(2)}/{year}"
        logger.info(f"DEBUG: FINAL FALLBACK - Using first direct date match: {formatted_date}")
        return formatted_date
    
    logger.warning("No date could be extracted using enhanced methods")
    return ""

def extract_amount_enhanced(normalized_results):
    """Enhanced amount extraction with support for multiple formats and better currency detection"""
    # Currency symbols and text representations
    currency_patterns = [
        # With explicit labels - high confidence patterns
        (r'(?:amount|total|sum|price|cost|fee)[:\s.-]*([₹$€£¥])\s*(\d+(?:[.,]\d{1,2})?)', 0.9),
        (r'(?:amount|total|sum|price|cost|fee)[:\s.-]*(\d+(?:[.,]\d{1,2})?)\s*([₹$€£¥])', 0.9),
        (r'(?:amount|total|sum|price|cost|fee)[:\s.-]*([Rr][Ss]\.?|[Rr]upees?\.?)\s*(\d+(?:[.,]\d{1,2})?)', 0.9),
        
        # Add patterns to handle OCR misrecognition of '$' as 'S'
        (r'(?:amount|total|sum|price|cost|fee)[:\s.-]*[Ss]\s*(\d+(?:[.,]\d{1,2})?)', 0.95),  # Amount: S92
        (r'[Ss]\s*(\d+(?:[.,]\d{1,2})?)', 0.8),  # S92 (standalone)
        
        # Special patterns for amount with non-standard characters or separators
        (r'amount[^0-9]*(\d+)', 0.9),  # Match "amount" followed by any chars then digits
        (r'total[^0-9]*(\d+)', 0.9),   # Match "total" followed by any chars then digits
        (r'sum[^0-9]*(\d+)', 0.9),     # Match "sum" followed by any chars then digits
        
        # Amount with standard label - no currency
        (r'(?:amount|total|sum|price|cost|fee)[:\s.-]*(\d+(?:[.,]\d{1,2})?)', 0.8),
        
        # Just currency with amount
        (r'([₹$€£¥])\s*(\d+(?:[.,]\d{1,2})?)', 0.7),
        (r'(\d+(?:[.,]\d{1,2})?)\s*([₹$€£¥])', 0.7),
        (r'([Rr][Ss]\.?|[Rr]upees?\.?)\s*(\d+(?:[.,]\d{1,2})?)', 0.7),
        
        # Just bare number patterns (last resort)
        (r'(\d+)(?:[.,](\d{2}))?', 0.5)
    ]
    
    logger.info("Attempting enhanced amount extraction")
    
    # First pass: look for amounts with explicit labels
    amount_candidates = []
    
    # First check: exact match for "Amount: S92" pattern which is common OCR error for "$92"
    for res in normalized_results:
        text = res["text"].strip()
        
        # Check for the exact "Amount: S92" pattern ($ misrecognized as S)
        if re.search(r'amount\s*:?\s*s\s*\d+', text.lower()):
            logger.info(f"Found potential currency symbol misrecognition: '{text}'")
            # Extract just the number part
            amount_match = re.search(r'amount\s*:?\s*s\s*(\d+)', text.lower())
            if amount_match:
                amount_str = amount_match.group(1)
                try:
                    amount = float(amount_str)
                    logger.info(f"Extracted amount from 'Amount: S' pattern: {amount} (assumed USD)")
                    amount_candidates.append({
                        "amount": amount,
                        "currency": "USD",  # Assume USD when S is present instead of $
                        "text": text,
                        "confidence": 0.95  # High confidence for this specific pattern
                    })
                except ValueError:
                    pass
    
    # Standard extraction for other patterns
    for res in normalized_results:
        text = res["text"].strip()
        
        for pattern, score in currency_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    match_groups = match.groups()
                    
                    # Extract amount and currency info based on pattern
                    amount_str = None
                    currency_indicator = None
                    
                    if len(match_groups) >= 2:
                        # Two groups - figure out which is amount vs currency
                        if re.match(r'\d', match_groups[0]):
                            # First group is numeric, second is currency
                            amount_str = match_groups[0]
                            currency_indicator = match_groups[1] if match_groups[1] else None
                        else:
                            # First group is currency, second is amount
                            currency_indicator = match_groups[0] if match_groups[0] else None
                            amount_str = match_groups[1]
                    else:
                        # Just amount
                        amount_str = match_groups[0]
                        currency_indicator = None
                    
                    # Clean and parse amount
                    if amount_str:
                        # Replace comma with period for consistent decimal parsing
                        amount_str = amount_str.replace(',', '.')
                        # Remove any non-numeric chars except decimal point
                        amount_str = re.sub(r'[^0-9.]', '', amount_str)
                        amount = float(amount_str)
                        
                        # Skip likely dates and small values
                        if 1900 <= amount <= 2100 and amount.is_integer():
                            logger.debug(f"Skipping likely year: {amount}")
                            continue
                            
                        if amount < 1 and not re.search(r'amount|total|sum|price', text.lower()):
                            logger.debug(f"Skipping small value: {amount}")
                            continue
                        
                        # Determine currency
                        currency_code = "UNKNOWN"
                        
                        # Check for 'S' which could be misrecognized '$'
                        if re.search(r'amount\s*:?\s*s', text.lower()) or re.search(r'^s\s*\d+', text.lower()):
                            currency_code = "USD"
                            logger.info(f"Detected 'S' as misrecognized '$', using USD")
                        elif currency_indicator:
                            # Check if it's a symbol
                            if currency_indicator.lower() in currency_map:
                                currency_code = currency_map[currency_indicator.lower()]
                            # Check if it's a text representation
                            elif re.match(r'[Rr][Ss]\.?|[Rr]upees?', currency_indicator):
                                currency_code = "INR"
                        
                        # Calculate confidence score based on pattern score and context
                        confidence = score
                        
                        # Boost score if amount appears with specific labels
                        if 'total' in text.lower():
                            confidence += 0.1
                        if 'amount' in text.lower():
                            confidence += 0.1
                        if 'price' in text.lower():
                            confidence += 0.1
                        
                        # Check for duplicate amounts - only add if not already in candidates
                        is_duplicate = False
                        for candidate in amount_candidates:
                            if abs(candidate["amount"] - amount) < 0.01:
                                # Same amount, keep the one with higher confidence
                                if confidence > candidate["confidence"]:
                                    candidate["confidence"] = confidence
                                    candidate["text"] = text
                                is_duplicate = True
                                break
                        
                        if not is_duplicate:
                            logger.info(f"Found amount: {amount} {currency_code} (confidence: {confidence:.2f}) from: '{text}'")
                            amount_candidates.append({
                                "amount": amount,
                                "currency": currency_code,
                                "text": text,
                                "confidence": confidence
                            })
                except Exception as e:
                    logger.warning(f"Error parsing amount from '{text}': {str(e)}")
                    continue
    
    # If we found candidates, pick the best one based on confidence and context
    if amount_candidates:
        # Sort by confidence score
        amount_candidates.sort(key=lambda x: x["confidence"], reverse=True)
        
        # First look for totals
        for candidate in amount_candidates:
            if "total" in candidate["text"].lower() and candidate["confidence"] >= 0.7:
                logger.info(f"Selected 'total' amount: {candidate['amount']} {candidate['currency']} (conf: {candidate['confidence']:.2f})")
                return {"value": candidate["amount"], "currency": candidate["currency"]}
        
        # Then look for amounts
        for candidate in amount_candidates:
            if "amount" in candidate["text"].lower() and candidate["confidence"] >= 0.7:
                logger.info(f"Selected 'amount' labeled value: {candidate['amount']} {candidate['currency']} (conf: {candidate['confidence']:.2f})")
                return {"value": candidate["amount"], "currency": candidate["currency"]}
        
        # Otherwise take the highest confidence
        best_candidate = amount_candidates[0]
        logger.info(f"Selected highest confidence amount: {best_candidate['amount']} {best_candidate['currency']} (conf: {best_candidate['confidence']:.2f})")
        return {"value": best_candidate["amount"], "currency": best_candidate["currency"]}
    
    # Check for any numbers as last resort
    for res in normalized_results:
        text = res["text"].lower().strip()
        if re.search(r'^\d+$', text):
            # Just a plain number, try to use it if it's reasonable
            try:
                amount = float(text)
                if amount > 0 and amount < 10000:  # Reasonable range for an amount
                    logger.info(f"Using plain number as amount: {amount}")
                    return {"value": amount, "currency": "UNKNOWN"}
            except:
                pass
    
    # No valid amounts found
    logger.warning("No amount could be extracted using enhanced methods")
    return {"value": 0, "currency": "UNKNOWN"}

@app.route('/process_receipt', methods=['POST'])
def process_receipt():
    try:
        start_time = time.time()
        logger.info("Received receipt processing request")
        data = request.json
        if not data or 'image' not in data:
            logger.error("No image data provided")
            return jsonify({
                'success': False,
                'error': 'No image data provided'
            }), 400

        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        try:
            logger.info("Decoding base64 image data")
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            
            # Convert PIL Image to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            logger.info("Image successfully loaded and converted")
        except Exception as e:
            logger.error(f"Error processing image data: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Invalid image data: {str(e)}'
            }), 400

        # Apply enhanced image preprocessing
        logger.info("Applying enhanced image preprocessing")
        processed_image = preprocess_image(opencv_image)
        
        # Perform improved OCR with multiple processing techniques
        logger.info("Performing multi-variant OCR processing")
        ocr_results = process_receipt_image(opencv_image)
        
        if not ocr_results:
            # Fallback to standard OCR if enhanced method fails
            logger.warning("Enhanced OCR produced no results, falling back to standard OCR")
            results = reader.readtext(processed_image)
            
            if not results:
                logger.error("No text detected in the image")
                return jsonify({
                    'success': False,
                    'error': 'No text detected in the image'
                }), 400
                
            # Format results for compatibility
            ocr_results = []
            for res in results:
                box, text, confidence = res
                ocr_results.append({
                    "variant": "standard", 
                    "box": box, 
                    "text": text, 
                    "confidence": confidence
                })
        
        # Log raw text for debugging
        logger.info(f"OCR detected {len(ocr_results)} text regions")
        logger.info("RAW OCR RESULTS:")
        for i, res in enumerate(ocr_results):
            logger.info(f"  Text {i+1}: '{res['text']}' (conf: {res['confidence']:.2f})")
        
        # Extract structured data with enhanced methods
        data = extract_receipt_data(ocr_results)
        
        # Validate critical data
        if not data["title"]:
            logger.warning("No title was extracted, using 'Untitled Receipt'")
            data["title"] = "Untitled Receipt"
            
        if not data["date"]:
            logger.warning("No date was extracted, checking raw OCR for date-like patterns")
            # Last resort date extraction from raw OCR
            for res in ocr_results:
                text = res["text"].strip()
                # Look for any potential date patterns
                date_matches = re.findall(r'(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})', text)
                if date_matches:
                    day, month, year = date_matches[0]
                    data["date"] = f"{month.zfill(2)}/{day.zfill(2)}/{year}"
                    logger.info(f"Found date in last resort check: {data['date']} from '{text}'")
                    break
            
        if data["amount"] == 0:
            logger.warning("No amount was extracted")
        
        # Create response data
        response_data = {
            'success': True,
            'title': data["title"],
            'date': data["date"],
            'amount': data["amount"],
            'currency': data["currency"],
            'raw_text': data["raw_text"],
            'processing_time': round(time.time() - start_time, 2)  # Add processing time to response
        }
        
        logger.info(f"DEBUG: FINAL EXTRACTED DATA - Title: '{data['title']}', Date: '{data['date']}', Amount: {data['amount']} {data['currency']}")
        logger.info(f"Processing completed in {time.time() - start_time:.2f} seconds")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error processing receipt: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("Starting OCR service...")
    app.run(host='0.0.0.0', port=5000, debug=True) 