import os
import sys
import time
from fast_ocr import FastOCR
import argparse

def test_ocr_performance(image_path, use_gpu=False, output_path=None):
    """
    Test the OCR performance on a single image.
    
    Args:
        image_path (str): Path to the image file
        use_gpu (bool): Whether to use GPU for OCR
        output_path (str, optional): Path to save JSON output
    """
    # Check if image exists
    if not os.path.exists(image_path):
        print(f"Error: Image file '{image_path}' not found!")
        return
    
    # Initialize OCR
    print(f"Initializing FastOCR with GPU: {use_gpu}")
    ocr = FastOCR(use_gpu=use_gpu)
    
    # Measure processing time
    print(f"Processing image: {image_path}")
    start_time = time.time()
    
    # Process image
    result = ocr.process_image(image_path)
    
    # Calculate processing time
    processing_time = time.time() - start_time
    
    # Print results
    print("\nOCR Processing Results:")
    print("-" * 50)
    print(f"Processing Time: {processing_time:.2f} seconds")
    print(f"Merchant: {result.get('merchant', 'Not found')}")
    print(f"Date: {result.get('date', 'Not found')}")
    print(f"Amount: {result.get('amount', 'Not found')}")
    print(f"Category: {result.get('category', 'Not found')}")
    print(f"Language: {result.get('language', 'Not found')}")
    
    # Save to JSON if output path is provided
    if output_path:
        ocr.save_to_json(result, output_path)
        print(f"\nResults saved to {output_path}")

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Fast OCR - Receipt Scanner')
    parser.add_argument('image', help='Path to the receipt image')
    parser.add_argument('--gpu', action='store_true', help='Use GPU for OCR (if available)')
    parser.add_argument('--output', '-o', help='Path to save JSON output')
    
    args = parser.parse_args()
    
    # Run OCR test
    test_ocr_performance(args.image, args.gpu, args.output)

if __name__ == "__main__":
    main() 