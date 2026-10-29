/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StateFuelPrice {
  state: string;
  petrolPerLiter: number;
  dieselPerLiter: number;
  cngPerKg: number;
  evFastChargePerKwh: number;
  effectiveDate: string;
}

// Fallback reference data calibrated from official Indian Oil / BPCL / Indraprastha Gas rates
export const INDIAN_FUEL_PRICE_REFERENCE: Record<string, StateFuelPrice> = {
  maharashtra: {
    state: 'Maharashtra',
    petrolPerLiter: 104.21,
    dieselPerLiter: 92.15,
    cngPerKg: 75.00,
    evFastChargePerKwh: 20.50,
    effectiveDate: '2026-10-20',
  },
  delhi: {
    state: 'Delhi (NCT)',
    petrolPerLiter: 94.72,
    dieselPerLiter: 87.62,
    cngPerKg: 74.09,
    evFastChargePerKwh: 18.00,
    effectiveDate: '2026-10-20',
  },
  karnataka: {
    state: 'Karnataka',
    petrolPerLiter: 102.86,
    dieselPerLiter: 88.94,
    cngPerKg: 82.50,
    evFastChargePerKwh: 21.00,
    effectiveDate: '2026-10-20',
  },
  'tamil nadu': {
    state: 'Tamil Nadu',
    petrolPerLiter: 100.75,
    dieselPerLiter: 92.34,
    cngPerKg: 84.00,
    evFastChargePerKwh: 20.00,
    effectiveDate: '2026-10-20',
  },
  gujarat: {
    state: 'Gujarat',
    petrolPerLiter: 96.42,
    dieselPerLiter: 92.17,
    cngPerKg: 76.50,
    evFastChargePerKwh: 19.50,
    effectiveDate: '2026-10-20',
  },
  telangana: {
    state: 'Telangana',
    petrolPerLiter: 107.41,
    dieselPerLiter: 95.65,
    cngPerKg: 91.00,
    evFastChargePerKwh: 21.50,
    effectiveDate: '2026-10-20',
  },
  'uttar pradesh': {
    state: 'Uttar Pradesh',
    petrolPerLiter: 94.65,
    dieselPerLiter: 87.76,
    cngPerKg: 81.20,
    evFastChargePerKwh: 19.00,
    effectiveDate: '2026-10-20',
  },
  'west bengal': {
    state: 'West Bengal',
    petrolPerLiter: 103.94,
    dieselPerLiter: 90.76,
    cngPerKg: 85.50,
    evFastChargePerKwh: 20.50,
    effectiveDate: '2026-10-20',
  },
  rajasthan: {
    state: 'Rajasthan',
    petrolPerLiter: 104.88,
    dieselPerLiter: 90.36,
    cngPerKg: 82.00,
    evFastChargePerKwh: 20.00,
    effectiveDate: '2026-10-20',
  },
  goa: {
    state: 'Goa',
    petrolPerLiter: 96.56,
    dieselPerLiter: 88.35,
    cngPerKg: 78.00,
    evFastChargePerKwh: 19.00,
    effectiveDate: '2026-10-20',
  },
  kerala: {
    state: 'Kerala',
    petrolPerLiter: 107.56,
    dieselPerLiter: 96.43,
    cngPerKg: 87.00,
    evFastChargePerKwh: 21.00,
    effectiveDate: '2026-10-20',
  },
  haryana: {
    state: 'Haryana',
    petrolPerLiter: 95.28,
    dieselPerLiter: 88.13,
    cngPerKg: 79.50,
    evFastChargePerKwh: 19.50,
    effectiveDate: '2026-10-20',
  },
  punjab: {
    state: 'Punjab',
    petrolPerLiter: 97.35,
    dieselPerLiter: 87.68,
    cngPerKg: 83.00,
    evFastChargePerKwh: 19.50,
    effectiveDate: '2026-10-20',
  },
  all_india_average: {
    state: 'All-India Weighted Average',
    petrolPerLiter: 101.40,
    dieselPerLiter: 90.50,
    cngPerKg: 80.50,
    evFastChargePerKwh: 20.00,
    effectiveDate: '2026-10-20',
  },
};

export function getFallbackFuelPrice(stateName?: string): StateFuelPrice {
  if (!stateName) return INDIAN_FUEL_PRICE_REFERENCE.all_india_average;
  const key = stateName.toLowerCase().trim();
  for (const [k, v] of Object.entries(INDIAN_FUEL_PRICE_REFERENCE)) {
    if (key.includes(k) || k.includes(key)) {
      return v;
    }
  }
  return INDIAN_FUEL_PRICE_REFERENCE.all_india_average;
}
