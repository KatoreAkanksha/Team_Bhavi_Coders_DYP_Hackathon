import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/contexts/NotificationContext";
import { Loader2, Upload, Mic, CameraIcon, X, Check, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { usdToInr, toInr, formatInr, formatCurrency } from "@/utils/currency";

// Mock AI categorization functionality
const categorizeExpense = (description: string | undefined | null): string => {
  if (!description) return "other";
  
  const desc = description.toLowerCase();
  if (desc.includes("grocery") || desc.includes("restaurant") || desc.includes("cafe") || desc.includes("food")) {
    return "food";
  }
  if (desc.includes("uber") || desc.includes("taxi") || desc.includes("gas") || desc.includes("fuel") || desc.includes("bus")) {
    return "transport";
  }
  if (desc.includes("movie") || desc.includes("netflix") || desc.includes("spotify") || desc.includes("concert")) {
    return "entertainment";
  }
  if (desc.includes("rent") || desc.includes("electricity") || desc.includes("water") || desc.includes("internet")) {
    return "bills";
  }
  if (desc.includes("medicine") || desc.includes("doctor") || desc.includes("hospital")) {
    return "health";
  }
  if (desc.includes("book") || desc.includes("course") || desc.includes("tuition")) {
    return "education";
  }
  if (desc.includes("clothes") || desc.includes("shoes") || desc.includes("mall")) {
    return "shopping";
  }
  return "other";
};

interface ExpenseData {
  description: string;
  amount: number;
  category: string;
  date: Date;
  isRecurring: boolean;
  paymentMethod: string;
  receiptImage: string | null;
}

const OCR_SERVICE_URL = 'http://localhost:5000/process_receipt';

export function SmartExpenseCapture({ onSubmit }: { onSubmit?: (data: ExpenseData) => void }) {
  const { addNotification } = useNotification();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAutoCategory, setIsAutoCategory] = useState(true);
  const [autoCategory, setAutoCategory] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulate voice recording for expense input
  const handleVoiceCapture = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    toast("Recording... Describe your expense");
    // The actual recording processing is handled in the useEffect
  };

  // Process receipt image with OCR
  const processReceiptWithOCR = async (imageData: string) => {
    try {
      setIsProcessing(true);
      const response = await fetch(OCR_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await response.json();
      // Log the entire OCR response for debugging
      console.log("OCR Raw Response:", JSON.stringify(data, null, 2));

      if (data.success) {
        // Extract and validate the data from OCR response
        const extractedTitle = typeof data.title === 'string' ? data.title.trim() : "";
        
        // Handle amount with currency conversion
        let extractedAmount = 0;
        let amountFromDate = false;
        let originalCurrency = data.currency || "UNKNOWN";
        
        console.log("Validating amount:", data.amount, "Currency:", originalCurrency);
        
        // Improved amount handling - directly use numeric value if available
        if (typeof data.amount === 'number' && data.amount > 0) {
          // Check if amount looks like a year
          if (data.amount >= 1900 && data.amount <= 2100 && Number.isInteger(data.amount)) {
            console.log("Amount looks like a year, ignoring:", data.amount);
            amountFromDate = true;
          } else {
            // Convert to INR if not already in INR
            if (originalCurrency !== "INR" && originalCurrency !== "UNKNOWN") {
              const originalAmount = data.amount;
              extractedAmount = toInr(originalAmount, originalCurrency);
              console.log(`Converting ${originalAmount} ${originalCurrency} to ${extractedAmount} INR`);
            } else {
              extractedAmount = data.amount;
              console.log("Using numeric amount (already in INR):", extractedAmount);
            }
          }
        } else if (typeof data.amount === 'string' && data.amount.trim()) {
          // Try to parse the amount string - extract just the numbers
          const numericChars = data.amount.replace(/[^0-9.]/g, '');
          const parsedAmount = parseFloat(numericChars);
          
          if (!isNaN(parsedAmount) && parsedAmount > 0) {
            // Check if it looks like a year
            if (parsedAmount >= 1900 && parsedAmount <= 2100 && Number.isInteger(parsedAmount)) {
              console.log("String amount looks like a year, ignoring:", parsedAmount);
              amountFromDate = true;
            } else {
              // Convert to INR if needed
              if (originalCurrency !== "INR" && originalCurrency !== "UNKNOWN") {
                extractedAmount = toInr(parsedAmount, originalCurrency);
                console.log(`Converting ${parsedAmount} ${originalCurrency} to ${extractedAmount} INR`);
              } else {
                extractedAmount = parsedAmount;
                console.log("Using parsed string amount (already in INR):", extractedAmount);
              }
            }
          }
        }
        
        // If amount is still 0, check raw text for amounts (look for any line with "amount")
        if (extractedAmount === 0 && data.raw_text && Array.isArray(data.raw_text)) {
          console.log("Amount is still 0, searching in raw text lines for 'amount'");
          
          for (const text of data.raw_text) {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('amount') || lowerText.includes('total') || lowerText.includes('sum')) {
              // Extract just the numbers from this line
              const numericChars = text.replace(/[^0-9.]/g, '');
              
              if (numericChars) {
                const amountFromText = parseFloat(numericChars);
                if (!isNaN(amountFromText) && amountFromText > 0) {
                  console.log(`Found amount in raw text line: "${text}" -> ${amountFromText}`);
                  extractedAmount = amountFromText;
                  break;
                }
              }
            }
          }
        }
        
        // If amount looks like a date/year, check raw text for better amount
        if (amountFromDate && data.raw_text && Array.isArray(data.raw_text)) {
          console.log("Looking for amount in raw text due to date-like amount");
          for (const text of data.raw_text) {
            // Look for $ or other currency symbols followed by numbers
            const amountMatch = text.match(/[$€£¥₹]\s*(\d+(?:\.\d{1,2})?)/);
            if (amountMatch && amountMatch[1]) {
              const rawAmount = parseFloat(amountMatch[1]);
              if (!isNaN(rawAmount) && rawAmount > 0 && 
                  !(rawAmount >= 1900 && rawAmount <= 2100)) {
                // Determine currency from symbol
                const currencySymbol = text.match(/[$€£¥₹]/)?.[0] || '$';
                const currencyMap: Record<string, string> = {
                  '$': 'USD',
                  '€': 'EUR',
                  '£': 'GBP',
                  '¥': 'JPY',
                  '₹': 'INR'
                };
                const detectedCurrency = currencyMap[currencySymbol] || 'USD';
                
                // Convert to INR if not already
                if (detectedCurrency !== "INR") {
                  extractedAmount = toInr(rawAmount, detectedCurrency);
                  console.log(`Found and converted ${rawAmount} ${detectedCurrency} to ${extractedAmount} INR`);
                } else {
                  extractedAmount = rawAmount;
                  console.log("Found amount in raw text (already in INR):", extractedAmount);
                }
                break;
              }
            }
          }
        }
        
        // Handle date with precise formatting for date input field
        let formattedDate = "";
        console.log("Processing date:", data.date);
        if (data.date && typeof data.date === 'string') {
          const dateStr = data.date.trim();
          console.log("Processing date string:", dateStr);
          
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            console.log("Date parts:", parts);
            
            if (parts.length === 3) {
              // Format as YYYY-MM-DD for the input field
              // Assume MM/DD/YYYY format from backend
              let month = parts[0].padStart(2, '0');
              let day = parts[1].padStart(2, '0');
              let year = parts[2];
              
              // Ensure 4-digit year
              if (year.length === 2) {
                year = (parseInt(year) < 50 ? '20' : '19') + year;
              }
              
              // Create ISO format date for input field (YYYY-MM-DD)
              formattedDate = `${year}-${month}-${day}`;
              console.log("Formatted date for input field:", formattedDate);
            } else {
              console.log("Date doesn't have 3 parts:", parts);
              
              // Try to detect direct date pattern in raw text
              if (data.raw_text && Array.isArray(data.raw_text)) {
                for (const text of data.raw_text) {
                  // Match any date pattern like DD/MM/YYYY or MM/DD/YYYY
                  const dateMatch = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
                  if (dateMatch) {
                    // Assume DD/MM/YYYY format
                    const day = dateMatch[1].padStart(2, '0');
                    const month = dateMatch[2].padStart(2, '0');
                    const year = dateMatch[3];
                    formattedDate = `${year}-${month}-${day}`;
                    console.log("Found date in raw text:", formattedDate);
                    break;
                  }
                }
              }
            }
          } else {
            console.log("Date doesn't contain / separator:", dateStr);
            
            // Try other date formats (YYYY-MM-DD)
            const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (isoMatch) {
              const year = isoMatch[1];
              const month = isoMatch[2].padStart(2, '0');
              const day = isoMatch[3].padStart(2, '0');
              formattedDate = `${year}-${month}-${day}`;
              console.log("Parsed ISO date format:", formattedDate);
            }
          }
        } else {
          // If no date was extracted, try to find it in raw text
          console.log("No date found in OCR response, checking raw text");
          if (data.raw_text && Array.isArray(data.raw_text)) {
            for (const text of data.raw_text) {
              // Look for date label
              if (text.toLowerCase().includes('date')) {
                console.log("Found text with 'date':", text);
                // Match date patterns
                const dateMatch = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
                if (dateMatch) {
                  // Assume DD/MM/YYYY format
                  const day = dateMatch[1].padStart(2, '0');
                  const month = dateMatch[2].padStart(2, '0');
                  const year = dateMatch[3];
                  formattedDate = `${year}-${month}-${day}`;
                  console.log("Extracted date from raw text:", formattedDate);
                  break;
                }
              }
            }
          }
        }
        
        console.log("Final extracted data:", {
          title: extractedTitle,
          amount: extractedAmount,
          originalCurrency,
          date: formattedDate,
        });
        
        // Set form values with extracted data
        if (extractedTitle) {
          setDescription(extractedTitle);
        }
        
        if (extractedAmount > 0) {
          setAmount(extractedAmount.toString());
        }
        
        if (formattedDate) {
          setDate(formattedDate);
        }
        
        // Set category from title if available
        if (extractedTitle) {
          const category = categorizeExpense(extractedTitle);
          setAutoCategory(category);
        }

        // Show success notification if we extracted something
        if (extractedTitle || extractedAmount > 0 || formattedDate) {
          // Show the original currency if it was converted
          const amountMessage = originalCurrency !== "INR" && originalCurrency !== "UNKNOWN" 
            ? `(Converted from ${originalCurrency})`
            : "";

          addNotification({
            title: "Receipt Processed",
            message: `Receipt processed successfully with OCR ${amountMessage}`,
            type: "success",
          });
        } else {
          addNotification({
            title: "Limited Data Extracted",
            message: "Some fields could not be recognized. Please fill them manually.",
            type: "warning",
          });
        }
      } else {
        throw new Error(data.error || 'Failed to process receipt');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process receipt');
      addNotification({
        title: "OCR Processing Failed",
        message: error instanceof Error ? error.message : 'Failed to process receipt',
        type: "error",
      });
    } finally {
      setIsProcessing(false);
      setIsUploading(false);
    }
  };

  // Handle image upload with OCR processing
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, BMP, or TIFF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const imageData = event.target.result as string;
          setPreviewImage(imageData);
          setShowReceipt(true);
          await processReceiptWithOCR(imageData);
        }
      };
    reader.readAsDataURL(file);
    } catch (error) {
      console.error('File reading error:', error);
      setIsUploading(false);
      toast.error('Failed to read the image file');
    }
  };

  // Handle camera capture with OCR
  const handleCameraCapture = async () => {
    if (!isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'environment' // Prefer rear camera
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
        setIsCameraActive(true);
        toast("Camera activated. Position the receipt and click Capture");
      } catch (error) {
        console.error('Camera access error:', error);
        toast.error('Failed to access camera');
      }
    } else {
      try {
      setIsUploading(true);
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        if (video) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            
            // Apply some basic image processing
            ctx.filter = 'contrast(1.2) brightness(1.1)';
            ctx.drawImage(canvas, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.9);
            setPreviewImage(imageData);
      setShowReceipt(true);

            // Stop camera stream
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            setIsCameraActive(false);
            
            // Process the captured image with OCR
            await processReceiptWithOCR(imageData);
          }
        }
      } catch (error) {
        console.error('Image capture error:', error);
        setIsUploading(false);
        toast.error('Failed to capture image');
      }
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    if (isAutoCategory && e.target.value) {
      const category = categorizeExpense(e.target.value);
      setAutoCategory(category);
    }
  };

  const handleSubmitExpense = () => {
    if (!description || !amount || !date) {
      toast.error("Please provide title, amount, and date");
      return;
    }
    
    try {
      // Convert amount to number
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
      
      // Validate date
      const dateValue = new Date(date);
      if (isNaN(dateValue.getTime())) {
        toast.error("Please enter a valid date");
        return;
      }

      // Prepare expense data
      const expenseData: ExpenseData = {
      description,
        amount: amountValue,
        category: isAutoCategory ? autoCategory : "other",
        date: dateValue,
        isRecurring: false, // Default value
        paymentMethod: "card", // Default value
        receiptImage: previewImage,
      };

      // Reset form after submission
    if (onSubmit) {
        onSubmit(expenseData);
        
        // Show success notification
        addNotification({
          title: "Expense Added",
          message: `${description} (${formatInr(amountValue)}) added successfully`,
          type: "success",
        });
        
        toast.success("Expense added successfully");
        
        // Reset form fields
        setDescription("");
        setAmount("");
        setDate("");
        setPreviewImage(null);
        setShowReceipt(false);
      } else {
        // If no onSubmit handler, try to save to local storage for demo purposes
        try {
          // Get existing expenses from localStorage
          const existingExpensesJson = localStorage.getItem('expenses') || '[]';
          const existingExpenses = JSON.parse(existingExpensesJson);
          
          // Add new expense
          const newExpense = {
            ...expenseData,
            id: Date.now().toString(), // Generate a pseudo-unique ID
            date: dateValue.toISOString(), // Convert date to string for storage
            createdAt: new Date().toISOString()
          };
          
          existingExpenses.push(newExpense);
          
          // Save back to localStorage
          localStorage.setItem('expenses', JSON.stringify(existingExpenses));
          
          addNotification({
            title: "Expense Added",
            message: `${description} (${formatInr(amountValue)}) added successfully`,
            type: "success",
          });
          
          toast.success("Expense added successfully");
          
          // Reset form fields
    setDescription("");
    setAmount("");
          setDate("");
    setPreviewImage(null);
    setShowReceipt(false);
    
          // Dispatch event to notify that expense was added
          // Ensure the event includes the expense data and bubbles to the window
          const expenseAddedEvent = new CustomEvent('expenseAdded', { 
            detail: newExpense,
            bubbles: true,
            composed: true
          });
          
          // Dispatch at both document and window level to ensure it's caught
          document.dispatchEvent(expenseAddedEvent);
          window.dispatchEvent(expenseAddedEvent);
          
          console.log("Expense added event dispatched:", newExpense);
        } catch (error) {
          console.error("Error saving to localStorage:", error);
          toast.error("Failed to save expense. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error("Failed to add expense");
    }
  };

  const removeImage = () => {
    setPreviewImage(null);
    setShowReceipt(false);
  };

  // Handle voice recording with cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isRecording) {
      timeoutId = setTimeout(() => {
        setIsRecording(false);
        toast.success("Voice recording processed!");
        setDescription("Dinner at Italian restaurant with colleagues");
        // Convert USD to INR
        setAmount(usdToInr(85.50).toString());
        const category = categorizeExpense("Dinner at Italian restaurant with colleagues");
        setAutoCategory(category);

        addNotification({
          title: "Voice Input Processed",
          message: "Your expense has been captured from voice input",
          type: "success",
        });
      }, 3000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isRecording, addNotification]);

  // Cleanup camera stream on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Add New Expense</span>
          {isCameraActive && (
            <Button variant="outline" size="icon" onClick={handleCameraCapture}>
              <Check className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Capture receipts with your camera or upload them for automatic expense entry
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Camera view for capture */}
        {isCameraActive && (
          <div className="relative mb-4 overflow-hidden rounded-lg border border-gray-300 bg-black">
            <video 
              ref={videoRef} 
              className="h-60 w-full object-cover" 
              autoPlay 
              playsInline
            />
          </div>
        )}

        {/* Receipt preview */}
        {showReceipt && previewImage && (
          <div className="relative mb-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute right-2 top-2 rounded-full bg-white/80 shadow-sm hover:bg-white"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
                <img 
                  src={previewImage} 
                  alt="Receipt" 
              className="h-60 w-full rounded-lg object-contain border border-gray-200"
            />
                  </div>
                )}

        {/* OCR Processing indicator */}
        {isProcessing && (
          <div className="mb-4 flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50 p-4">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Processing receipt with OCR...</span>
            </div>
          )}
          
        {/* Expense Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Textarea
              id="title"
              placeholder="What is this expense for?"
              value={description}
              onChange={handleDescriptionChange}
              className="h-20 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
              <Input
                id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                placeholder="0.00"
                value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="auto-category" className="text-sm">Auto-Categorize</Label>
            <Switch
              id="auto-category"
              checked={isAutoCategory}
              onCheckedChange={setIsAutoCategory}
            />
            {isAutoCategory && autoCategory && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {autoCategory.charAt(0).toUpperCase() + autoCategory.slice(1)}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap justify-between gap-2">
            <div className="flex gap-2">
              <input
                type="file"
                id="receipt-upload"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading || isProcessing}
                onClick={() => document.getElementById('receipt-upload')?.click()}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRecording || isProcessing}
                onClick={handleVoiceCapture}
              >
                {isRecording ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                Voice
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={handleCameraCapture}
              >
                {isCameraActive ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <CameraIcon className="mr-2 h-4 w-4" />
                )}
                {isCameraActive ? 'Capture' : 'Camera'}
              </Button>
            </div>
          
          <Button 
              type="button"
            onClick={handleSubmitExpense}
              disabled={isProcessing || !description || !amount || !date}
          >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
            Add Expense
          </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
