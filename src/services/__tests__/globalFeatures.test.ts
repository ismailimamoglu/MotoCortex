jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/dir/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' }
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined)
}));

import { AiDoctorService } from '../aiDoctorService';
import { GpxTelemetryRecorder } from '../gpxTelemetryRecorder';
import { UdsProtocolEngine, UdsServiceId } from '../../api/udsProtocol';

describe('Global Features Suite (AI Doctor, GPX Recorder, UDS Protocol Engine)', () => {

  describe('AiDoctorService', () => {
    it('returns SAFE risk level when no DTC codes are provided', async () => {
      const result = await AiDoctorService.analyzeFaults({ dtcCodes: [] });
      expect(result.riskLevel).toBe('SAFE');
      expect(result.riskScore).toBe(100);
    });

    it('returns CRITICAL risk level for engine cylinder misfire (P0300)', async () => {
      const result = await AiDoctorService.analyzeFaults({ dtcCodes: ['P0300'] });
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.riskScore).toBe(30);
      expect(result.causes.length).toBeGreaterThan(0);
    });

    it('returns WARNING risk level for O2 sensor codes (P0130)', async () => {
      const result = await AiDoctorService.analyzeFaults({ dtcCodes: ['P0130'] });
      expect(result.riskLevel).toBe('WARNING');
      expect(result.riskScore).toBe(65);
    });
  });

  describe('GpxTelemetryRecorder', () => {
    it('records points and generates valid GPX 1.1 XML string', () => {
      GpxTelemetryRecorder.startSession();
      GpxTelemetryRecorder.addPoint({
        latitude: 41.0082,
        longitude: 28.9784,
        altitude: 120,
        timestamp: Date.now(),
        speedKmh: 65,
        rpm: 4500,
        leanAngle: 24
      });

      const points = GpxTelemetryRecorder.stopSession();
      expect(points.length).toBe(1);

      const xml = GpxTelemetryRecorder.exportToGpxString('Test Ride');
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<gpx version="1.1"');
      expect(xml).toContain('motocortex:leanAngle>24');
      expect(xml).toContain('motocortex:rpm>4500');
    });
  });

  describe('UdsProtocolEngine', () => {
    it('encodes UDS request hex correctly', () => {
      const hex = UdsProtocolEngine.encodeRequest(UdsServiceId.READ_DATA_BY_IDENTIFIER, undefined, [0xF1, 0x90]);
      expect(hex).toBe('22F190');
    });

    it('encodes BMW Motorrad Service Reset request', () => {
      const hex = UdsProtocolEngine.encodeServiceResetRequest('BMW Motorrad');
      expect(hex).toBe('31010201');
    });

    it('decodes positive UDS response', () => {
      const response = UdsProtocolEngine.decodeResponse('62F190414243'); // 0x62 = Positive response to 0x22
      expect(response.success).toBe(true);
      expect(response.serviceId).toBe(0x22);
    });

    it('decodes UDS negative response (0x7F)', () => {
      const response = UdsProtocolEngine.decodeResponse('7F2231'); // NRC 0x31 (Request Out of Range)
      expect(response.success).toBe(false);
      expect(response.nrc).toBe(0x31);
    });
  });
});
