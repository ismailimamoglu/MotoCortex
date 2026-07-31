import {
  extractVehicleWmiAndYear,
  generateVinHmac,
  redactSecurityBytes,
  sanitizeTraceLogsAsync
} from '../telemetrySanitizer';

describe('telemetrySanitizer Unit Tests', () => {
  it('should correctly extract WMI (first 3 chars) and Year Code (10th char) from VIN', () => {
    const vin = 'VF1K296B1B3456789';
    const result = extractVehicleWmiAndYear(vin);
    expect(result.wmi).toBe('VF1');
    expect(result.year_code).toBe('B');
  });

  it('should return fallback WMI and Year for invalid or short VIN', () => {
    const result = extractVehicleWmiAndYear('VF1');
    expect(result.wmi).toBe('UNK');
    expect(result.year_code).toBe('0');
  });

  it('should generate deterministic hashed VIN representation', async () => {
    const vin = 'VF1K296B123456789';
    const hash1 = await generateVinHmac(vin);
    const hash2 = await generateVinHmac(vin);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(vin);
    expect(hash1.length).toBeGreaterThan(10);
  });

  it('should redact UDS Security Access (0x27 / 0x67) Seed/Key byte pairs', () => {
    const rawTrace = 'TX: 27 01 4F A2 B8 C9';
    const redacted = redactSecurityBytes(rawTrace);
    expect(redacted).toContain('[REDACTED_SECURITY_BYTES]');
    expect(redacted).not.toContain('4F A2 B8 C9');
  });

  it('should preserve standard OBD commands without modifying non-security data', () => {
    const rawTrace = 'TX: 01 0C';
    const redacted = redactSecurityBytes(rawTrace);
    expect(redacted).toBe('TX: 01 0C');
  });

  it('should asynchronously sanitize an array of trace logs', async () => {
    const logs = [
      { t_ms: 0, dir: 'TX' as const, cmd: 'AT Z' },
      { t_ms: 100, dir: 'TX' as const, cmd: '27 01 12 34 56 78' }
    ];
    const sanitized = await sanitizeTraceLogsAsync(logs);
    expect(sanitized[0].cmd).toBe('AT Z');
    expect(sanitized[1].cmd).toContain('[REDACTED_SECURITY_BYTES]');
  });
});
