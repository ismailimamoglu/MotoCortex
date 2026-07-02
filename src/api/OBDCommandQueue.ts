// src/api/OBDCommandQueue.ts  
// MotoCortex v7.9.9 - Delegator to OBD2ProtocolEngine

import OBD2ProtocolEngineInstance, { preciseSleep, waitForELMPrompt, LineState } from './OBD2ProtocolEngine';

export { preciseSleep, waitForELMPrompt, LineState };
export { OBD2ProtocolEngineInstance as OBDCommandQueueInstance };
export default OBD2ProtocolEngineInstance;