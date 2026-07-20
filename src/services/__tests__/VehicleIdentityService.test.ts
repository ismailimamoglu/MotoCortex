import { VehicleIdentityService } from '../VehicleIdentityService';

describe('VehicleIdentityService Çevrimiçi/Çevrimdışı Hibrit VIN Decode Testleri', () => {
    let originalFetch: any;

    beforeAll(() => {
        originalFetch = global.fetch;
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    test('1. Çevrimiçi Mod: NHTSA API başarılı yanıt verdiğinde profilin çözümlenmesi', async () => {
        const mockApiResponse = {
            Results: [
                {
                    Make: 'DACIA',
                    Model: 'LOGAN',
                    ModelYear: '2011',
                    FuelTypePrimary: 'Gasoline',
                    TransmissionStyle: 'Manual'
                }
            ]
        };

        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            })
        ) as any;

        const profile = await VehicleIdentityService.decodeVehicleFromVin('UU1LOGANTEST12345');

        expect(profile.make).toBe('DACIA');
        expect(profile.model).toBe('LOGAN');
        expect(profile.year).toBe(2011);
        expect(profile.fuelType).toBe('GASOLINE');
        expect(profile.transmission).toBe('MANUAL');
        expect(profile.confidence).toBe(0.95);
    });

    test('2. Çevrimdışı Fallback Mod: API hata verdiğinde lokal regex çözümleyicinin çalışması', async () => {
        // Mock fetch to simulate network error / timeout
        global.fetch = jest.fn().mockImplementation(() =>
            Promise.reject(new Error('Network connection timeout'))
        ) as any;

        // UU1 (Dacia), B (2011)
        const profile = await VehicleIdentityService.decodeVehicleFromVin('UU1LOGANTB1234567');

        expect(profile.make).toBe('DACIA');
        expect(profile.model).toBe('DACIA_GENERIC_MODEL');
        expect(profile.year).toBe(2011);
        expect(profile.fuelType).toBeNull();
        expect(profile.transmission).toBeNull();
        expect(profile.confidence).toBe(0.50);
    });

    test('3. Çevrimdışı Fallback Mod: Boş veya geçersiz şasiler için hızlı fallback profili', async () => {
        const profile = await VehicleIdentityService.decodeVehicleFromVin('');
        expect(profile.make).toBe('GENERIC');
        expect(profile.model).toBe('GENERIC_VEHICLE');
        expect(profile.confidence).toBe(0.50);
    });
});
