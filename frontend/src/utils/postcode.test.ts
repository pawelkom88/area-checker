import { describe, expect, it } from 'vitest';
import { normalizePostcodeInput, parsePostcodeInput } from './postcode';

describe('postcode utils', () => {
  it('normalizes postcode input by uppercasing and collapsing whitespace', () => {
    expect(normalizePostcodeInput('  sw1a   1aa ')).toBe('SW1A 1AA');
  });

  it('returns normalized postcode for valid input', () => {
    const result = parsePostcodeInput(' sw1a   1aa ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('SW1A 1AA');
    }
  });

  it('returns validation error for invalid input', () => {
    const result = parsePostcodeInput('not-a-postcode');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please enter a valid UK postcode.');
    }
  });
});
