/**
 * Shared authentication & input validation helpers for CrankShaft
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a username according to standard requirements:
 * - Cannot be an email / Gmail address (no '@' or email pattern)
 * - 3 to 30 characters
 * - Only alphanumeric characters, underscores (_), and hyphens (-)
 * - Cannot contain spaces
 * - Cannot start or end with an underscore or hyphen
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || typeof username !== "string") {
    return { isValid: false, error: "Username is required." };
  }

  const trimmed = username.trim();

  // 1. Explicitly disallow Gmail / email addresses
  if (
    trimmed.includes("@") ||
    /@gmail\.com$/i.test(trimmed) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  ) {
    return {
      isValid: false,
      error:
        "Email addresses (including Gmail) cannot be used as a username. Please choose an alphanumeric username.",
    };
  }

  // 2. Length check (standard 3 to 30 characters)
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: "Username must be at least 3 characters long.",
    };
  }
  if (trimmed.length > 30) {
    return {
      isValid: false,
      error: "Username cannot exceed 30 characters.",
    };
  }

  // 3. Disallow spaces
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      error: "Username cannot contain spaces.",
    };
  }

  // 4. Allowed characters: alphanumeric, underscores, hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error:
        "Username can only contain letters, numbers, underscores (_), and hyphens (-).",
    };
  }

  // 5. Cannot start or end with a symbol
  if (/^[_-]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Username cannot start with an underscore or hyphen.",
    };
  }
  if (/[_-]$/.test(trimmed)) {
    return {
      isValid: false,
      error: "Username cannot end with an underscore or hyphen.",
    };
  }

  return { isValid: true };
}

/**
 * Validates password according to standard security requirements:
 * - Minimum 8 characters
 * - Maximum 100 characters (bcrypt protection)
 * - Must contain at least one letter and at least one number
 */
export function validatePassword(password: string): ValidationResult {
  if (!password || typeof password !== "string") {
    return { isValid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 100) {
    return {
      isValid: false,
      error: "Password cannot exceed 100 characters.",
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      error: "Password must contain both letters and numbers.",
    };
  }

  return { isValid: true };
}

/**
 * Validates Indian 10-digit mobile number:
 * - Exactly 10 digits
 * - Starts with 6, 7, 8, or 9
 */
export function validateIndianPhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, error: "Phone number is required." };
  }

  const digits = phone.toString().replace(/^\+91/, "").replace(/\D/g, "");

  if (digits.length !== 10) {
    return {
      isValid: false,
      error: "Phone number must be exactly 10 digits.",
    };
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      isValid: false,
      error:
        "Please enter a valid 10-digit Indian mobile number (must start with 6, 7, 8, or 9).",
    };
  }

  return { isValid: true };
}

/**
 * Validates login identifier:
 * - Accepts username or phone number
 * - Informs users who type their email / Gmail to use username/phone or Google Sign-In
 */
export function validateLoginIdentifier(identifier: string): ValidationResult {
  if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
    return {
      isValid: false,
      error: "Please enter your username or registered phone number.",
    };
  }

  const trimmed = identifier.trim();

  // If user entered an email address into username field
  if (
    trimmed.includes("@") ||
    /@gmail\.com$/i.test(trimmed) ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  ) {
    return {
      isValid: false,
      error:
        "Email address entered. Please sign in using your username or phone number. If you registered with Google, use 'Continue with Google'.",
    };
  }

  return { isValid: true };
}
