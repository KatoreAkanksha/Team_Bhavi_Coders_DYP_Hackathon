import os
import sys
import time
import json
import argparse
from fast_ocr import FastOCR
from concurrent.futures import ThreadPoolExecutor, as_completed

def process_image(args):
    """
    Process a single image with OCR.
    
    Args:
        args (tuple): Tuple containing (image_path, ocr, output_dir)
        
    Returns:
        tuple: (image_path, result, processing_time)
    """
    image_path, ocr, output_dir = args
    
    try:
        # Measure processing time
        start_time = time.time()
        
        # Process image
        result = ocr.process_image(image_path)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Save to JSON if output directory is provided
        if output_dir:
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            json_path = os.path.join(output_dir, f"{base_name}.json")
            ocr.save_to_json(result, json_path)
        
        return image_path, result, processing_time
    except Exception as e:
        return image_path, {"error": str(e)}, 0

def batch_process(input_dir, output_dir=None, use_gpu=False, max_workers=4):
    """
    Process multiple images in a directory.
    
    Args:
        input_dir (str): Directory containing images
        output_dir (str, optional): Directory to save JSON outputs
        use_gpu (bool): Whether to use GPU for OCR
        max_workers (int): Maximum number of worker threads
    """
    # Check if input directory exists
    if not os.path.exists(input_dir):
        print(f"Error: Input directory '{input_dir}' not found!")
        return
    
    # Create output directory if provided
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Get list of image files
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']
    image_files = [
        os.path.join(input_dir, f) for f in os.listdir(input_dir)
        if os.path.splitext(f.lower())[1] in image_extensions
    ]
    
    if not image_files:
        print(f"No image files found in '{input_dir}'!")
        return
    
    # Initialize OCR
    print(f"Initializing FastOCR with GPU: {use_gpu}")
    ocr = FastOCR(use_gpu=use_gpu)
    
    # Process images in parallel
    print(f"Processing {len(image_files)} images...")
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_image = {
            executor.submit(process_image, (image_path, ocr, output_dir)): image_path
            for image_path in image_files
        }
        
        # Process results as they complete
        results = []
        for future in as_completed(future_to_image):
            image_path = future_to_image[future]
            try:
                image_path, result, processing_time = future.result()
                results.append((image_path, result, processing_time))
                
                # Print progress
                print(f"Processed: {os.path.basename(image_path)} ({processing_time:.2f}s)")
            except Exception as e:
                print(f"Error processing {os.path.basename(image_path)}: {e}")
    
    # Calculate total processing time
    total_time = time.time() - start_time
    
    # Print summary
    print("\nBatch Processing Summary:")
    print("-" * 50)
    print(f"Total Images: {len(image_files)}")
    print(f"Total Processing Time: {total_time:.2f} seconds")
    print(f"Average Time per Image: {total_time/len(image_files):.2f} seconds")
    
    # Save summary to JSON if output directory is provided
    if output_dir:
        summary = {
            "total_images": len(image_files),
            "total_time": total_time,
            "average_time": total_time/len(image_files),
            "results": [
                {
                    "image": os.path.basename(image_path),
                    "processing_time": processing_time,
                    "result": result
                }
                for image_path, result, processing_time in results
            ]
        }
        
        summary_path = os.path.join(output_dir, "summary.json")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nSummary saved to {summary_path}")

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Fast OCR - Batch Receipt Scanner')
    parser.add_argument('input_dir', help='Directory containing receipt images')
    parser.add_argument('--output', '-o', help='Directory to save JSON outputs')
    parser.add_argument('--gpu', action='store_true', help='Use GPU for OCR (if available)')
    parser.add_argument('--workers', '-w', type=int, default=4, help='Maximum number of worker threads')
    
    args = parser.parse_args()
    
    # Run batch processing
    batch_process(args.input_dir, args.output, args.gpu, args.workers)

if __name__ == "__main__":
    main() 