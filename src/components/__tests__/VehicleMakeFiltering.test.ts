import { oemDatabaseProvider } from '../../core/database/OemDatabaseProvider';

describe('Vehicle Identification & Dynamic Brand Feature Filtering Integration', () => {
    it('should return ONLY VAG group features when connected vehicle is Volkswagen / Audi / SEAT / Skoda', () => {
        const vwFeatures = oemDatabaseProvider.getFeaturesForMake('Volkswagen');
        expect(vwFeatures.length).toBeGreaterThan(15);
        vwFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toMatch(/(VOLKSWAGEN|VW|AUDI|SEAT|SKODA|PORSCHE)/);
        });
    });

    it('should return ONLY BMW group features when connected vehicle is BMW / MINI', () => {
        const bmwFeatures = oemDatabaseProvider.getFeaturesForMake('BMW');
        expect(bmwFeatures.length).toBeGreaterThan(10);
        bmwFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toMatch(/(BMW|MINI)/);
        });
    });

    it('should return ONLY Mercedes-Benz features when connected vehicle is Mercedes-Benz', () => {
        const mercFeatures = oemDatabaseProvider.getFeaturesForMake('Mercedes-Benz');
        expect(mercFeatures.length).toBeGreaterThan(5);
        mercFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toMatch(/(MERCEDES|BENZ|AMG)/);
        });
    });

    it('should return ONLY Ford features when connected vehicle is Ford', () => {
        const fordFeatures = oemDatabaseProvider.getFeaturesForMake('Ford');
        expect(fordFeatures.length).toBeGreaterThan(5);
        fordFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toMatch(/FORD/);
        });
    });

    it('should return ONLY BYD / EV features when connected vehicle is BYD', () => {
        const bydFeatures = oemDatabaseProvider.getFeaturesForMake('BYD');
        expect(bydFeatures.length).toBeGreaterThan(3);
        bydFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toBe('BYD');
        });
    });

    it('should return ONLY Volvo features when connected vehicle is Volvo', () => {
        const volvoFeatures = oemDatabaseProvider.getFeaturesForMake('Volvo');
        expect(volvoFeatures.length).toBeGreaterThanOrEqual(2);
        volvoFeatures.forEach(feature => {
            expect(feature.make.toUpperCase()).toMatch(/VOLVO/);
        });
    });
});
