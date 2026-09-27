/**
 * Client-side validation that mirrors the server rules in
 * server/controllers/authController.js. This is only for fast feedback — the
 * server remains the authority, and server-side field errors are merged in.
 */
export const validators = {
  name: (v) => {
    const s = v.trim();
    if (!s) return 'Name is required';
    if (s.length < 2) return 'Name must be at least 2 characters';
    if (s.length > 60) return 'Name must be under 60 characters';
    return '';
  },
  email: (v) => {
    const s = v.trim();
    if (!s) return 'Email is required';
    // Deliberately permissive; the server is the real gate.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Enter a valid email address';
    return '';
  },
  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/i.test(v)) return 'Password must contain a letter';
    if (!/\d/.test(v)) return 'Password must contain a number';
    return '';
  },
  loginPassword: (v) => (v ? '' : 'Password is required'),
};

/** Strength score 0-4 plus a human label, for the register form meter. */
export const passwordStrength = (password = '') => {
  if (!password) return { score: 0, label: 'Empty', color: '#64748b' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  // A long passphrase is strong even without symbol classes.
  if (password.length >= 16) score = Math.max(score, 3);

  const scale = [
    { label: 'Very weak', color: '#ef4444' },
    { label: 'Weak', color: '#f97316' },
    { label: 'Fair', color: '#f59e0b' },
    { label: 'Good', color: '#84cc16' },
    { label: 'Strong', color: '#22c55e' },
  ];
  return { score, ...scale[score] };
};

/**
 * Run a validator map over a values object.
 * @returns {Record<string, string>} only the fields that failed
 */
export const runValidation = (values, rules) => {
  const errors = {};
  for (const [field, validate] of Object.entries(rules)) {
    const message = validate(values[field] ?? '');
    if (message) errors[field] = message;
  }
  return errors;
};

/**
 * Merge server field errors (which are authoritative) over client ones.
 * @param {Record<string,string>} clientErrors
 * @param {Array<{field?: string, message: string}>} serverErrors
 */
export const mergeServerErrors = (clientErrors, serverErrors = []) => {
  if (!serverErrors?.length) return clientErrors;
  const merged = { ...clientErrors };
  for (const { field, message } of serverErrors) {
    if (field) merged[field] = message;
  }
  return merged;
};

/** Reject a value unless it passes `rule`; clears the error once valid. */
export const revalidateField = (field, value, rules, setErrors) => {
  const message = rules[field]?.(value) ?? '';
  setErrors((prev) => {
    const next = { ...prev };
    if (message) next[field] = message;
    else delete next[field];
    return next;
  });
  return message;
};
