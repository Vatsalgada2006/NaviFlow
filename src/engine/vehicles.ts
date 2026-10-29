/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehiclePreset } from '../types';

export const INDIAN_VEHICLE_PRESETS: VehiclePreset[] = [
  // EVs
  {
    id: 'nexon-ev-long-range',
    name: 'Tata Nexon.ev LR (Empowered+)',
    category: 'SUV',
    fuelType: 'EV',
    tankOrBatteryCapacity: 40.5, // kWh
    efficiency: 6.8, // km/kWh (real highway)
    realWorldRangeKm: 275,
    chargingSpeedKw: 50,
    fastChargeSupported: true,
  },
  {
    id: 'mg-zs-ev',
    name: 'MG ZS EV (50.3 kWh)',
    category: 'SUV',
    fuelType: 'EV',
    tankOrBatteryCapacity: 50.3, // kWh
    efficiency: 6.5,
    realWorldRangeKm: 325,
    chargingSpeedKw: 50,
    fastChargeSupported: true,
  },
  {
    id: 'tiago-ev',
    name: 'Tata Tiago EV (24 kWh)',
    category: 'Hatchback',
    fuelType: 'EV',
    tankOrBatteryCapacity: 24, // kWh
    efficiency: 7.5,
    realWorldRangeKm: 175,
    chargingSpeedKw: 25,
    fastChargeSupported: true,
  },
  {
    id: 'ola-s1-pro',
    name: 'Ola S1 Pro Gen 2 (4 kWh)',
    category: 'Two-Wheeler',
    fuelType: 'EV',
    tankOrBatteryCapacity: 4.0, // kWh
    efficiency: 32.0, // km/kWh
    realWorldRangeKm: 130,
    chargingSpeedKw: 3.3,
    fastChargeSupported: false,
  },

  // Petrol Cars
  {
    id: 'swift-petrol',
    name: 'Maruti Suzuki Swift 1.2L ZXi',
    category: 'Hatchback',
    fuelType: 'Petrol',
    tankOrBatteryCapacity: 37, // Liters
    efficiency: 18.5, // km/L highway
    realWorldRangeKm: 680,
  },
  {
    id: 'creta-petrol',
    name: 'Hyundai Creta 1.5L MPi SX',
    category: 'SUV',
    fuelType: 'Petrol',
    tankOrBatteryCapacity: 50,
    efficiency: 14.5,
    realWorldRangeKm: 720,
  },
  {
    id: 'city-petrol',
    name: 'Honda City 1.5L i-VTEC ZX',
    category: 'Sedan',
    fuelType: 'Petrol',
    tankOrBatteryCapacity: 40,
    efficiency: 16.5,
    realWorldRangeKm: 660,
  },
  {
    id: 're-classic-350',
    name: 'Royal Enfield Classic 350',
    category: 'Two-Wheeler',
    fuelType: 'Petrol',
    tankOrBatteryCapacity: 13,
    efficiency: 34.0,
    realWorldRangeKm: 440,
  },
  {
    id: 'activa-6g',
    name: 'Honda Activa 6G 110cc',
    category: 'Two-Wheeler',
    fuelType: 'Petrol',
    tankOrBatteryCapacity: 5.3,
    efficiency: 46.0,
    realWorldRangeKm: 240,
  },

  // Diesel Cars
  {
    id: 'creta-diesel',
    name: 'Hyundai Creta 1.5L CRDi SX(O)',
    category: 'SUV',
    fuelType: 'Diesel',
    tankOrBatteryCapacity: 50,
    efficiency: 19.5,
    realWorldRangeKm: 970,
  },
  {
    id: 'scorpio-n-diesel',
    name: 'Mahindra Scorpio-N 2.2L mHawk',
    category: 'SUV',
    fuelType: 'Diesel',
    tankOrBatteryCapacity: 57,
    efficiency: 13.5,
    realWorldRangeKm: 760,
  },

  // CNG Cars
  {
    id: 'brezza-cng',
    name: 'Maruti Suzuki Brezza 1.5L S-CNG',
    category: 'SUV',
    fuelType: 'CNG',
    tankOrBatteryCapacity: 9.5, // kg
    efficiency: 25.5, // km/kg
    realWorldRangeKm: 240,
  },
  {
    id: 'wagonr-cng',
    name: 'Maruti Suzuki WagonR 1.0L S-CNG',
    category: 'Hatchback',
    fuelType: 'CNG',
    tankOrBatteryCapacity: 9.0, // kg
    efficiency: 32.0, // km/kg
    realWorldRangeKm: 285,
  },
];

export const DEFAULT_VEHICLE = INDIAN_VEHICLE_PRESETS[4]; // Swift Petrol
