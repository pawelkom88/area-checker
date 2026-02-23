import { z } from 'zod';

const UK_POSTCODE_REGEX =
  /^([Gg][Ii][Rr]\s?0[Aa]{2}|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2}))$/;

export function normalizePostcodeInput(value: string): string {
  return value.toUpperCase().replace(/\s+/g, ' ').trim();
}

export const postcodeSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a postcode.')
  .transform(normalizePostcodeInput)
  .refine((value) => UK_POSTCODE_REGEX.test(value), 'Please enter a valid UK postcode.');

export function parsePostcodeInput(value: unknown) {
  return postcodeSchema.safeParse(value);
}
