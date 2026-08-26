import { 
  BRANDS, 
  MODELS_BY_BRAND, 
  MOTORCYCLE_BRANDS, 
  PASSENGER_CAR_BRANDS, 
  HEAVY_DUTY_BRANDS,
  MOTORCYCLE_FUEL_TYPES,
  PASSENGER_CAR_FUEL_TYPES,
  HEAVY_DUTY_FUEL_TYPES,
  FUEL_TYPES
} from '../vehicleData';
import fs from 'fs';
import path from 'path';

describe('Vehicle Data Integrity & Category Architecture Verification', () => {
  const localesDir = path.join(__dirname, '..', '..', 'locales');
  const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

  it('should verify all 26 language files exist', () => {
    expect(localeFiles.length).toBe(26);
  });

  describe('1. Motorcycle Category Integrity', () => {
    it('contains valid motorcycle brands with complete models', () => {
      expect(MOTORCYCLE_BRANDS.length).toBeGreaterThan(15);
      MOTORCYCLE_BRANDS.forEach(brand => {
        expect(BRANDS).toContain(brand);
        const models = MODELS_BY_BRAND[brand];
        expect(models).toBeDefined();
        expect(models.length).toBeGreaterThan(0);
        expect(models).toContain('other');
      });
    });

    it('enforces motorcycle fuel types strictly without diesel or lpg', () => {
      expect(MOTORCYCLE_FUEL_TYPES).toEqual(['gasoline', 'electric', 'hybrid', 'other']);
      expect(MOTORCYCLE_FUEL_TYPES).not.toContain('diesel');
      expect(MOTORCYCLE_FUEL_TYPES).not.toContain('gasoline_lpg');
    });
  });

  describe('2. Passenger Car Category Integrity', () => {
    it('contains valid passenger car brands with complete models', () => {
      expect(PASSENGER_CAR_BRANDS.length).toBeGreaterThan(20);
      PASSENGER_CAR_BRANDS.forEach(brand => {
        expect(BRANDS).toContain(brand);
        const models = MODELS_BY_BRAND[brand];
        expect(models).toBeDefined();
        expect(models.length).toBeGreaterThan(0);
        expect(models).toContain('other');
      });
    });

    it('enforces passenger car fuel types with Gasoline, Diesel, LPG, Hybrid, Electric', () => {
      expect(PASSENGER_CAR_FUEL_TYPES).toEqual([
        'gasoline',
        'diesel',
        'gasoline_lpg',
        'hybrid',
        'electric',
        'other'
      ]);
    });
  });

  describe('3. Heavy Duty / Truck Category Integrity', () => {
    it('contains dedicated truck/heavy duty brands with commercial models', () => {
      expect(HEAVY_DUTY_BRANDS.length).toBeGreaterThan(10);
      expect(HEAVY_DUTY_BRANDS).toContain('scania');
      expect(HEAVY_DUTY_BRANDS).toContain('mercedes_truck');
      expect(HEAVY_DUTY_BRANDS).toContain('ford_truck');
      expect(HEAVY_DUTY_BRANDS).toContain('volvo_truck');
      expect(HEAVY_DUTY_BRANDS).toContain('man_truck');
      expect(HEAVY_DUTY_BRANDS).toContain('daf');
      expect(HEAVY_DUTY_BRANDS).toContain('iveco');
      expect(HEAVY_DUTY_BRANDS).toContain('bmc');

      HEAVY_DUTY_BRANDS.forEach(brand => {
        expect(BRANDS).toContain(brand);
        const models = MODELS_BY_BRAND[brand];
        expect(models).toBeDefined();
        expect(models.length).toBeGreaterThan(0);
        expect(models).toContain('other');
      });
    });

    it('verifies truck models are heavy duty commercial vehicles (not passenger cars)', () => {
      expect(MODELS_BY_BRAND['ford_truck']).toEqual(
        expect.arrayContaining(['F-MAX', 'F-Line', 'Cargo 1842T'])
      );
      expect(MODELS_BY_BRAND['mercedes_truck']).toEqual(
        expect.arrayContaining(['Actros', 'Arocs', 'Atego', 'Travego'])
      );
      expect(MODELS_BY_BRAND['volvo_truck']).toEqual(
        expect.arrayContaining(['FH16', 'FH', 'FM', 'FMX'])
      );
      expect(MODELS_BY_BRAND['scania']).toEqual(
        expect.arrayContaining(['R-Series', 'S-Series', 'V8 770'])
      );
      expect(MODELS_BY_BRAND['man_truck']).toEqual(
        expect.arrayContaining(['TGX', 'TGS', "Lion's Coach"])
      );
    });

    it('enforces heavy duty fuel types without lpg', () => {
      expect(HEAVY_DUTY_FUEL_TYPES).toEqual(['diesel', 'electric', 'gasoline', 'other']);
      expect(HEAVY_DUTY_FUEL_TYPES).not.toContain('gasoline_lpg');
    });
  });

  describe('4. Localization Integrity Across All 26 Languages', () => {
    it('verifies every brand key is localized in every language file', () => {
      localeFiles.forEach(file => {
        const filePath = path.join(localesDir, file);
        const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(json.brands).toBeDefined();

        BRANDS.forEach(brand => {
          expect(json.brands[brand]).toBeDefined();
          expect(typeof json.brands[brand]).toBe('string');
          expect(json.brands[brand].trim().length).toBeGreaterThan(0);
        });

        // Ensure fuel type translations exist
        expect(json.vehicleSelect.fuelGasoline).toBeDefined();
        expect(json.vehicleSelect.fuelDiesel).toBeDefined();
        expect(json.vehicleSelect.fuelGasolineLpg).toBeDefined();
        expect(json.vehicleSelect.fuelHybrid).toBeDefined();
        expect(json.vehicleSelect.fuelElectric).toBeDefined();
        expect(json.vehicleSelect.errorFuelType).toBeDefined();
      });
    });
  });
});
