/**
 * Validate email address
 * @param email - The email to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Object containing validation results
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL
 * @param url - The URL to validate
 * @returns Boolean indicating if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date string
 * @param date - The date string to validate
 * @param format - The expected date format (default: 'YYYY-MM-DD')
 * @returns Boolean indicating if the date is valid
 */
export function isValidDate(date: string, format: string = 'YYYY-MM-DD'): boolean {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Validate phone number
 * @param phone - The phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate credit card number
 * @param cardNumber - The credit card number to validate
 * @returns Boolean indicating if the credit card number is valid
 */
export function isValidCreditCard(cardNumber: string): boolean {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/[\s-]/g, '');

  // Check if it's all digits and has a valid length
  if (!/^\d{13,19}$/.test(cleanNumber)) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate amount
 * @param amount - The amount to validate
 * @returns Boolean indicating if the amount is valid
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount >= 0;
}
