export interface Dimensions {
  length?: number | null;
  width?: number | null;
  depth?: number | null;
  unit?: 'in' | 'cm' | string | null;
}
export function formatDimensions(d: Dimensions): string;
export function parseDimensions(text: string): { length: number; width: number; depth: number | null; unit: 'in' | 'cm' } | null;
export function convertEtsyUnit(value: number | null | undefined, unit: string | null | undefined): { value: number; unit: 'in' | 'cm' } | null;
export function toInches(value: number, unit: string | null | undefined): number;
export function boxInches(d: Dimensions, padding?: number): { length: number; width: number; height: number } | null;
