import { getDeepDiagnosticDossier, lookupOemDTC } from '../dtcIntelligenceService';
import i18n from '../../i18n';

describe('Deep Diagnostic Dossier & Multi-ECU Intelligence', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('tr');
  });

  it('correctly maps ABS wheel speed sensor with chassis title and multimeter testing', () => {
    const dossier = getDeepDiagnosticDossier('C0035', { targetModuleId: 'abs' });
    expect(dossier.systemTitle).toContain('FREN & ŞASİ');
    expect(dossier.healthScore).toBe(55);
    expect(dossier.riskLevel).toBe('WARNING');
    expect(dossier.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(dossier.componentTestingSteps.some(s => s.toLowerCase().includes('manyetik') || s.toLowerCase().includes('voltaj') || s.toLowerCase().includes('multimetre'))).toBe(true);
    expect(dossier.driveGuidance).toContain('ABS');
  });

  it('correctly maps DSG TCM transmission fault with transmission title and critical score', () => {
    const dossier = getDeepDiagnosticDossier('P17BF', { targetModuleId: 'tcm' });
    expect(dossier.systemTitle).toContain('ŞANZIMAN');
    expect(dossier.healthScore).toBe(25);
    expect(dossier.riskLevel).toBe('CRITICAL');
    expect(dossier.difficultyLevel).toBe('PROFESSIONAL');
    expect(dossier.componentTestingSteps.some(s => s.includes('Bar'))).toBe(true);
  });

  it('correctly maps SRS Airbag fault with restraint safety title and battery disconnect warning', () => {
    const dossier = getDeepDiagnosticDossier('B0001', { targetModuleId: 'srs' });
    expect(dossier.systemTitle).toContain('KORUYUCU GÜVENLİK & AIRBAG');
    expect(dossier.componentTestingSteps.some(s => s.includes('15 dakika') || s.includes('akü'))).toBe(true);
  });

  it('performs cross-DTC correlation when paired codes exist', () => {
    const dossier = getDeepDiagnosticDossier('P0102', {
      targetModuleId: 'ecm',
      allDtcs: ['P0102', 'P0171'],
    });
    expect(dossier.crossDtcAnalysis).toBeDefined();
    expect(dossier.crossDtcAnalysis).toContain('P0102');
    expect(dossier.crossDtcAnalysis).toContain('P0171');
  });

  it('resolves multi-ECU OEM codes for various manufacturers', () => {
    const vagDsg = lookupOemDTC('00283', 'VAG');
    expect(vagDsg).toBeDefined();
    expect(vagDsg).toContain('ABS');

    const bmwTcm = lookupOemDTC('4F81', 'BMW');
    expect(bmwTcm).toBeDefined();
    expect(bmwTcm).toContain('Ratio Monitoring');

    const mbDtc = lookupOemDTC('2074', 'Mercedes');
    expect(mbDtc).toBeDefined();
  });
});
