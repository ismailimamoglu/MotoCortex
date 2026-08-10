import { useBluetoothStore } from '../store/useBluetoothStore';
import OBDCommandQueue from './OBDCommandQueue';

export interface VersionCommands {
  version: string;
  commands: string[];
  isCore: boolean; // true if <= v1.4b
}

export const IDENTIFIER_TEST_SUITE: VersionCommands[] = [
  {
    version: '1.0',
    isCore: true,
    commands: ['ATI', 'ATZ', 'ATE0', 'ATL0', 'ATH0', 'ATSP0', 'ATAL']
  },
  {
    version: '1.1',
    isCore: true,
    commands: ['ATFC', 'ATFE', 'ATFI']
  },
  {
    version: '1.2',
    isCore: true,
    commands: ['ATPP', 'ATMP', 'ATCS']
  },
  {
    version: '1.3',
    isCore: true,
    commands: ['ATNL', 'ATSH', 'ATST', 'ATSW']
  },
  {
    version: '1.3a',
    isCore: true,
    commands: ['ATRA', 'ATS1']
  },
  {
    version: '1.4',
    isCore: true,
    commands: ['ATCEA', 'ATCV', 'ATIB', 'ATIIA', 'ATJS', 'ATSD']
  },
  {
    version: '1.4b',
    isCore: true,
    commands: ['ATCRA', 'ATCS', 'ATM0']
  },
  {
    version: '2.0',
    isCore: false,
    commands: ['ATCER', 'ATAMC', 'ATFCS', 'ATH1']
  },
  {
    version: '2.1',
    isCore: false,
    commands: ['ATFT', 'ATPPS', 'ATPC']
  },
  {
    version: '2.2',
    isCore: false,
    commands: ['ATFCS', 'ATIA']
  },
  {
    version: '2.3',
    isCore: false,
    commands: ['ATFCE', 'ATFE']
  }
];

interface IdentifierCacheEntry {
  isCloneDevice: boolean;
  isCodingAllowed: boolean;
  capabilityScore: number;
  elmVersionTested: string;
  multiframeIsotpSupported: boolean;
  timestamp: number;
}

const identifierCache = new Map<string, IdentifierCacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function clearIdentifierCache(deviceId?: string): void {
  if (deviceId) {
    identifierCache.delete(deviceId);
  } else {
    identifierCache.clear();
  }
}

export async function runIdentifierTest(deviceId?: string, forceRefresh: boolean = false): Promise<{
  isCloneDevice: boolean;
  isCodingAllowed: boolean;
  capabilityScore: number;
  elmVersionTested: string;
  multiframeIsotpSupported: boolean;
}> {
  const store = useBluetoothStore.getState();
  const targetId = deviceId || store.deviceId || store.connectingDeviceId || store.lastDeviceId || 'DEFAULT_DEVICE';

  if (!forceRefresh && identifierCache.has(targetId)) {
    const cached = identifierCache.get(targetId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      store.addLog(`ELM_IDENTIFIER: Using cached device profile for [${targetId}]. Version: ${cached.elmVersionTested}, Score: ${cached.capabilityScore}%`);
      store.setIsCloneDevice(cached.isCloneDevice);
      store.setIsCodingAllowed(cached.isCodingAllowed);
      store.setSensorData({
        isCloneDevice: cached.isCloneDevice,
        isCodingAllowed: cached.isCodingAllowed,
        adapterCapabilityScore: cached.capabilityScore,
        elmVersionTested: cached.elmVersionTested,
        multiframeIsotpSupported: cached.multiframeIsotpSupported,
      });
      return {
        isCloneDevice: cached.isCloneDevice,
        isCodingAllowed: cached.isCodingAllowed,
        capabilityScore: cached.capabilityScore,
        elmVersionTested: cached.elmVersionTested,
        multiframeIsotpSupported: cached.multiframeIsotpSupported,
      };
    }
  }

  store.addLog('ELM_IDENTIFIER: Starting ELM327 compatibility & clone scan.');
  
  let passedCount = 0;
  let totalCommandsCount = 0;
  IDENTIFIER_TEST_SUITE.forEach(v => {
    totalCommandsCount += v.commands.length;
  });

  let isCloneDevice = false;
  let isCodingAllowed = true;
  let detectedMaxVersion = '1.0';

  const testResults: Record<string, boolean> = {};

  for (const suite of IDENTIFIER_TEST_SUITE) {
    store.addLog(`ELM_IDENTIFIER: Testing ELM327 ${suite.version} commands.`);
    let suiteAllPassed = true;

    for (const cmd of suite.commands) {
      try {
        // ATZ requires up to 2000ms for hardware reset; other commands use 800ms
        const timeoutMs = cmd === 'ATZ' ? 2000 : 800;
        const response = await OBDCommandQueue.add(cmd, timeoutMs, 'HIGH_PRIORITY_AD_HOC');
        const cleanResponse = response.replace(/\s+/g, '').toUpperCase();
        
        const isUnsupported = cleanResponse.includes('?') || cleanResponse.includes('ERR');
        
        if (isUnsupported) {
          testResults[cmd] = false;
          suiteAllPassed = false;
          
          if (suite.isCore) {
            // Short-circuit: Core v1.0 - v1.4b command failed
            isCloneDevice = true;
            isCodingAllowed = false;
            store.setIsCloneDevice(true);
            store.setIsCodingAllowed(false);
            store.addLog(`ELM_IDENTIFIER: CORE COMMAND FAILED [${cmd}]. Device identified as CLONE. Short-circuiting test.`);
            
            // Set capability score based on what we actually verified
            const finalScore = Math.round((passedCount / totalCommandsCount) * 100);
            store.setSensorData({
              isCloneDevice: true,
              isCodingAllowed: false,
              adapterCapabilityScore: finalScore,
              elmVersionTested: 'Clone v1.5',
            });

            const result = {
              isCloneDevice: true,
              isCodingAllowed: false,
              capabilityScore: finalScore,
              elmVersionTested: 'Clone v1.5',
              multiframeIsotpSupported: false
            };
            identifierCache.set(targetId, { ...result, timestamp: Date.now() });
            
            return result;
          } else {
            // Non-core command (beyond v1.4b) failed.
            isCodingAllowed = false;
            store.setIsCodingAllowed(false);
            store.addLog(`ELM_IDENTIFIER: Command beyond v1.4b failed [${cmd}]. Locking coding functionality to false.`);
          }
        } else {
          testResults[cmd] = true;
          passedCount++;
        }
      } catch (err) {
        // Treat timeouts or failures as unsupported for coding safety
        testResults[cmd] = false;
        suiteAllPassed = false;
        if (suite.isCore) {
          isCloneDevice = true;
          isCodingAllowed = false;
          store.setIsCloneDevice(true);
          store.setIsCodingAllowed(false);
          store.addLog(`ELM_IDENTIFIER: CORE COMMAND EXCEPTION [${cmd}]. Device identified as CLONE. Short-circuiting.`);
          
          const finalScore = Math.round((passedCount / totalCommandsCount) * 100);
          store.setSensorData({
            isCloneDevice: true,
            isCodingAllowed: false,
            adapterCapabilityScore: finalScore,
            elmVersionTested: 'Clone v1.5',
            multiframeIsotpSupported: false
          });

          const result = {
            isCloneDevice: true,
            isCodingAllowed: false,
            capabilityScore: finalScore,
            elmVersionTested: 'Clone v1.5',
            multiframeIsotpSupported: false
          };
          identifierCache.set(targetId, { ...result, timestamp: Date.now() });

          return result;
        } else {
          isCodingAllowed = false;
          store.setIsCodingAllowed(false);
        }
      }
    }

    if (suiteAllPassed) {
      detectedMaxVersion = suite.version;
    }
  }

  // Perform non-destructive multi-frame ISO-TP verification test (e.g. UDS 22 F1 90 VIN query or 0902 VIN)
  let multiframeIsotpSupported = false;
  try {
    const mfResponse = await OBDCommandQueue.add('0902', 800, 'HIGH_PRIORITY_AD_HOC');
    const cleanMf = mfResponse.replace(/\s+/g, '').toUpperCase();
    if (cleanMf.startsWith('4902') || cleanMf.length > 16) {
      multiframeIsotpSupported = true;
    }
  } catch (e) {
    multiframeIsotpSupported = false;
  }

  const finalScore = Math.round((passedCount / totalCommandsCount) * 100);
  store.setSensorData({
    isCloneDevice,
    isCodingAllowed,
    adapterCapabilityScore: finalScore,
    elmVersionTested: detectedMaxVersion,
    multiframeIsotpSupported,
  });

  store.addLog(`ELM_IDENTIFIER: Scan finished. Version: ${detectedMaxVersion}, Capability: ${finalScore}%, Clone: ${isCloneDevice}, Multi-Frame ISO-TP: ${multiframeIsotpSupported}`);

  const finalResult = {
    isCloneDevice,
    isCodingAllowed,
    capabilityScore: finalScore,
    elmVersionTested: detectedMaxVersion,
    multiframeIsotpSupported,
  };
  identifierCache.set(targetId, { ...finalResult, timestamp: Date.now() });

  return finalResult;
}

