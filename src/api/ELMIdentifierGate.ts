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

export async function runIdentifierTest(): Promise<{
  isCloneDevice: boolean;
  isCodingAllowed: boolean;
  capabilityScore: number;
  elmVersionTested: string;
}> {
  const store = useBluetoothStore.getState();
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
        const response = await OBDCommandQueue.add(cmd, 500, 'HIGH_PRIORITY_AD_HOC');
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
            
            return {
              isCloneDevice: true,
              isCodingAllowed: false,
              capabilityScore: finalScore,
              elmVersionTested: 'Clone v1.5'
            };
          } else {
            // Non-core command (beyond v1.4b) failed.
            // As per state-architecture rule: "If the hardware responds with '?' (unknown) to commands beyond v1.4b, the coding state (isCodingAllowed) MUST be explicitly locked to false"
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
          });

          return {
            isCloneDevice: true,
            isCodingAllowed: false,
            capabilityScore: finalScore,
            elmVersionTested: 'Clone v1.5'
          };
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

  const finalScore = Math.round((passedCount / totalCommandsCount) * 100);
  store.setSensorData({
    isCloneDevice,
    isCodingAllowed,
    adapterCapabilityScore: finalScore,
    elmVersionTested: detectedMaxVersion,
  });

  store.addLog(`ELM_IDENTIFIER: Scan finished. Version: ${detectedMaxVersion}, Capability: ${finalScore}%, Clone: ${isCloneDevice}, Coding Allowed: ${isCodingAllowed}`);

  return {
    isCloneDevice,
    isCodingAllowed,
    capabilityScore: finalScore,
    elmVersionTested: detectedMaxVersion
  };
}
