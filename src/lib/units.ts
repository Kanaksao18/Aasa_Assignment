// Dimension types supported by the system
export type DimensionType = 'weight' | 'volume' | 'count';

// Supported units
export type SupportedUnit = 'g' | 'kg' | 'mL' | 'L' | 'item';

export interface UnitConfig {
  unit: SupportedUnit;
  label: string;
  factor: number; // Multiply user value by this to get base unit value
  dimension: DimensionType;
}

export const UNITS_MAP: Record<SupportedUnit, UnitConfig> = {
  g: { unit: 'g', label: 'Grams (g)', factor: 1, dimension: 'weight' },
  kg: { unit: 'kg', label: 'Kilograms (kg)', factor: 1000, dimension: 'weight' },
  mL: { unit: 'mL', label: 'Milliliters (mL)', factor: 1, dimension: 'volume' },
  L: { unit: 'L', label: 'Liters (L)', factor: 1000, dimension: 'volume' },
  item: { unit: 'item', label: 'Items (count)', factor: 1, dimension: 'count' },
};

export const BASE_UNITS: Record<DimensionType, SupportedUnit> = {
  weight: 'g',
  volume: 'mL',
  count: 'item',
};

// Check if a unit is valid for a given dimension
export function isValidUnitForDimension(unit: string, dimension: DimensionType): boolean {
  const config = UNITS_MAP[unit as SupportedUnit];
  return config ? config.dimension === dimension : false;
}

// Get conversion factor to base unit (e.g. 1000 for kg, 1 for g)
export function getConversionFactor(unit: string): number {
  const config = UNITS_MAP[unit as SupportedUnit];
  return config ? config.factor : 1;
}

// Convert user-entered quantity to database base unit quantity
export function toBaseQuantity(quantity: number, unit: string): number {
  const factor = getConversionFactor(unit);
  // Using parseFloat and toFixed to prevent JavaScript floating point errors
  const result = quantity * factor;
  return parseFloat(result.toFixed(8));
}

// Convert database base unit quantity to user-facing display unit quantity
export function fromBaseQuantity(baseQuantity: number, targetUnit: string): number {
  const factor = getConversionFactor(targetUnit);
  const result = baseQuantity / factor;
  return parseFloat(result.toFixed(8));
}

// Calculate the price per specified unit based on the base price
// basePrice is INR per 1 base unit (e.g. per gram or per mL)
export function getPricePerUnit(basePrice: number, targetUnit: string): number {
  const factor = getConversionFactor(targetUnit);
  const result = basePrice * factor;
  return parseFloat(result.toFixed(8));
}

/**
 * Calculates order line metrics
 * @param quantity The amount the user ordered (e.g. 2.5)
 * @param unit The unit the user ordered in (e.g. 'kg')
 * @param basePrice The price in INR per base unit (e.g. 0.5 INR/gram)
 */
export function calculateLineMetrics(quantity: number, unit: string, basePrice: number) {
  const qVal = parseFloat(quantity.toString()) || 0;
  const pVal = parseFloat(basePrice.toString()) || 0;
  
  const factor = getConversionFactor(unit);
  const baseQuantity = toBaseQuantity(qVal, unit);
  const pricePerUnit = getPricePerUnit(pVal, unit);
  
  // Line total = ordered quantity * price per ordered unit
  // Equivalent to: baseQuantity * basePrice
  const total = qVal * pricePerUnit;
  
  return {
    orderedQuantity: qVal,
    orderedUnit: unit,
    convertedQuantity: baseQuantity,
    pricePerUnit: parseFloat(pricePerUnit.toFixed(8)),
    lineTotal: parseFloat(total.toFixed(2)),
  };
}

// Format INR currency
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format high precision quantity
export function formatQuantity(quantity: number): string {
  // If integer, return integer. Otherwise, strip trailing zeros up to 8 decimal places
  return parseFloat(quantity.toFixed(8)).toString();
}

// Get units matching a dimension
export function getUnitsByDimension(dimension: DimensionType): SupportedUnit[] {
  return Object.values(UNITS_MAP)
    .filter((u) => u.dimension === dimension)
    .map((u) => u.unit);
}
