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
import magic
import time
from functools import wraps

# Configure logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(level=logging.INFO)
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

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_file_type(file_path):
    """Validate file type using magic numbers."""
    mime = magic.Magic(mime=True)
    file_type = mime.from_file(file_path)
    return file_type in ALLOWED_MIMETYPES

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

if __name__ == '__main__':
    # Use environment variables for configuration
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.environ.get('FLASK_HOST', '127.0.0.1')  # Default to localhost
    port = int(os.environ.get('FLASK_PORT', 5000))
    
    app.run(debug=debug_mode, host=host, port=port) 