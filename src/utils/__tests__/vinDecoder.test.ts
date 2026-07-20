import { getMakeFromVin, getYearFromVin } from '../vinDecoder';

describe('vinDecoder World Manufacturer Identifier (WMI) ve VIS Yıl Analiz Testleri', () => {
    
    describe('getMakeFromVin', () => {
        test('Dacia WMI (UU1) tespiti', () => {
            expect(getMakeFromVin('UU1LOGANTEST12345')).toBe('DACIA');
        });

        test('Renault WMI (VF1) tespiti', () => {
            expect(getMakeFromVin('VF1RENAULT1234567')).toBe('RENAULT');
        });

        test('Hyundai WMI (KMH) tespiti', () => {
            expect(getMakeFromVin('KMHHYUNDAI1234567')).toBe('HYUNDAI');
        });

        test('Volkswagen WMI (WVW) tespiti', () => {
            expect(getMakeFromVin('WVWZZZ5NZKW123456')).toBe('VOLKSWAGEN');
        });

        test('Toyota WMI (JT1) tespiti', () => {
            expect(getMakeFromVin('JT1TOYOTA12345678')).toBe('TOYOTA');
        });

        test('Honda WMI (JH2) tespiti', () => {
            expect(getMakeFromVin('JH2HONDA123456789')).toBe('HONDA');
        });

        test('Ford WMI (WF0) tespiti', () => {
            expect(getMakeFromVin('WF0FORDTEST123456')).toBe('FORD');
        });

        test('Simülasyon/Test substring fallbacks', () => {
            expect(getMakeFromVin('TEST_HONDA_VEHICLE')).toBe('HONDA');
            expect(getMakeFromVin('TEST_VW_VEHICLE')).toBe('VOLKSWAGEN');
        });

        test('Bilinmeyen WMI için GENERIC tespiti', () => {
            expect(getMakeFromVin('XYZUNKNOWN1234567')).toBe('GENERIC');
        });

        test('Boş veya çok kısa şasiler için GENERIC tespiti', () => {
            expect(getMakeFromVin('')).toBe('GENERIC');
            expect(getMakeFromVin('AB')).toBe('GENERIC');
        });
    });

    describe('getYearFromVin', () => {
        test('VIS 10. Karakter model yılı çözümlenmesi', () => {
            // Y -> 2000
            expect(getYearFromVin('123456789Y1234567')).toBe(2000);
            // B -> 2011 (Dacia Logan)
            expect(getYearFromVin('123456789B1234567')).toBe(2011);
            // K -> 2019
            expect(getYearFromVin('WVWZZZ5NZKW123456')).toBe(2019);
            // L -> 2020
            expect(getYearFromVin('123456789L1234567')).toBe(2020);
            // S -> 2025
            expect(getYearFromVin('123456789S1234567')).toBe(2025);
        });

        test('Geçersiz 10. karakter veya kısa şasi için current year fallback tespiti', () => {
            const currentYear = new Date().getFullYear();
            expect(getYearFromVin('12345')).toBe(currentYear);
            expect(getYearFromVin('123456789Z1234567')).toBe(currentYear); // Z is not mapped
        });
    });
});
