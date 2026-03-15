import { PASSWORD_POLICY } from '@/lib/constants';

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate password against the configured policy.
 * Returns { valid, errors[] } — i18n keys for each failed rule.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const p = PASSWORD_POLICY;

  if (password.length < p.minLength) {
    errors.push('auth.cp_err_min_length');
  }
  if (p.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('auth.cp_err_uppercase');
  }
  if (p.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('auth.cp_err_lowercase');
  }
  if (p.requireDigit && !/\d/.test(password)) {
    errors.push('auth.cp_err_digit');
  }
  if (p.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('auth.cp_err_special');
  }

  return { valid: errors.length === 0, errors };
}
