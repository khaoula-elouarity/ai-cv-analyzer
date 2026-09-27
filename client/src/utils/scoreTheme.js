/**
 * Score thresholds live in one place so a colour always means the same thing
 * across every widget. Kept out of the component file so React Fast Refresh
 * works (a module that exports both a component and plain values breaks HMR).
 */
export const scoreTone = (score) => {
  if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 65) return { label: 'Strong', color: '#f59e0b' };
  if (score >= 45) return { label: 'Needs work', color: '#f97316' };
  return { label: 'Weak', color: '#ef4444' };
};

export const scoreColor = (score) => scoreTone(score).color;
