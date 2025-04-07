from expense_ocr import ExpenseOCR
import cv2
import numpy as np

def create_sample_receipt():
    # Create a sample receipt image (larger and clearer)
    width = 800
    height = 1000
    img = np.ones((height, width), dtype=np.uint8) * 240  # Light gray background
    
    # Add some texture to make it look like paper
    noise = np.random.normal(0, 2, (height, width)).astype(np.uint8)
    img = cv2.add(img, noise)
    
    # Convert to BGR for colored text
    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    
    # Define text properties
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1.0
    thickness = 2
    color = (0, 0, 0)  # Black text
    
    # Helper function to add text with better spacing
    def add_text(text, y, scale=1.0, thick=None):
        if thick is None:
            thick = thickness
        size = cv2.getTextSize(text, font, font_scale * scale, thick)[0]
        x = (width - size[0]) // 2  # Center text
        cv2.putText(img, text, (x, y), font, font_scale * scale, color, thick)
        return y + size[1] + 20  # Return next y position
    
    # Add receipt content
    y = 80
    y = add_text("DOMINO'S PIZZA", y, scale=1.5, thick=3)
    y = add_text("123 Main Street", y)
    y = add_text("New York, NY 10001", y)
    y = add_text("Tel: (555) 123-4567", y)
    
    # Add separator
    y += 20
    cv2.line(img, (50, y), (width-50, y), color, 1)
    y += 40
    
    # Add receipt details
    y = add_text("Order #: 12345", y)
    y = add_text("Date: 2024-03-15", y)
    y = add_text("Time: 19:45", y)
    
    # Add separator
    y += 20
    cv2.line(img, (50, y), (width-50, y), color, 1)
    y += 40
    
    # Add items with aligned prices
    items = [
        ("1x Large Pepperoni Pizza", "$18.99"),
        ("1x Garlic Bread", "$5.99"),
        ("2x Coca Cola", "$5.98")
    ]
    
    for item, price in items:
        text = f"{item:<30} {price:>8}"
        y = add_text(text, y)
    
    # Add separator
    y += 20
    cv2.line(img, (50, y), (width-50, y), color, 1)
    y += 40
    
    # Add totals
    y = add_text("Subtotal:                  $30.96", y)
    y = add_text("Tax (8.875%):              $2.75", y)
    y = add_text("Total Amount:             $33.71", y, scale=1.2, thick=3)
    
    # Add footer
    y += 40
    y = add_text("Thank you for your business!", y)
    y = add_text("Please come again", y)
    
    # Save the image with high quality
    cv2.imwrite("sample_receipt.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 100])
    return "sample_receipt.jpg"

def main():
    try:
        # Create a sample receipt
        receipt_path = create_sample_receipt()
        print(f"Created sample receipt at: {receipt_path}")
        
        # Initialize OCR
        print("Initializing OCR...")
        ocr = ExpenseOCR(use_easyocr=True)
        
        # Process the image
        print("Processing image...")
        result = ocr.process_image(receipt_path)
        
        # Print results
        print("\nExtracted Information:")
        print("----------------------")
        for key, value in result.items():
            print(f"{key}: {value}")
        
        # Save to JSON
        output_path = "expense_data.json"
        ocr.save_to_json(result, output_path)
        print(f"\nResults saved to: {output_path}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 