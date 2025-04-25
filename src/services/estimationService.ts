// Fibonacci sequence commonly used in Agile estimation

// Define validation result interface
interface ValidationResult {
  valid: boolean;
  message: string | null;
}

// Define realistic check result interface
interface RealisticCheckResult {
  realistic: boolean;
  message: string | null;
}

/**
 * Validates if the estimation is within acceptable range
 * @param value The time estimation value
 * @param description Optional description for context
 * @returns Validation result
 */
export function validateEstimation(value: number | undefined): ValidationResult {
  if (value === undefined) {
    return { valid: false, message: 'Estimation is required' };
  }
  
  if (value <= 0) {
    return { valid: false, message: 'Estimation must be greater than 0' };
  }
  
  if (value > 100) {
    return { valid: false, message: 'Estimation seems too high (>100 hours)' };
  }
  
  return { valid: true, message: null };
}

/**
 * Checks if the estimation is realistic based on heuristics
 * @param value The time estimation value
 * @param description Optional description for context
 * @returns Realistic check result
 */
export function isEstimationRealistic(value: number | undefined): RealisticCheckResult {
  if (value === undefined) {
    return { realistic: false, message: 'Estimation is required for realism check' };
  }
  
  // Simple heuristic: if estimation is very high, it might be unrealistic
  if (value > 40) {
    return { 
      realistic: false, 
      message: 'This estimation seems high. Consider breaking down the task.' 
    };
  }
  
  return { realistic: true, message: null };
} 