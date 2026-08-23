// vinRead.ts
export async function readVinSafely(queue: CommandQueue, options = { timeoutMs: 2000 }) {
  // ensure no pending writes
  // 1. flush read buffer: wait for prompt or send no-op
  try {
    // If driver supports explicit flush: await queue.transport.drain();
    // otherwise send an AT command that returns quickly (AT E0 or AT I) and wait for prompt to clear old noise
    await queue.enqueue({ cmd: "AT E0", timeoutMs: 500, expectPrompt: true, retries: 1 });
  } catch (e) {
    // ignore but continue
  }

  // 2. send VIN query
  try {
    const res = await queue.enqueue({ cmd: "09 02", timeoutMs: options.timeoutMs, expectPrompt: true, retries: 1 });
    // parse response using parser from dtcParser
    const services = parseAndReassembleServices(res.raw);
    // services with service 0x49 (09 response) or payload containing 02 subfunction
    // decode VIN from assembled payloads
    const vin = extractVinFromServices(services);
    return vin;
  } catch (err) {
    return null; // handle fallback in caller
  }
}

function extractVinFromServices(services: ReassembledService[]): string | null {
  // find service 0x49 (0x40 + 9)
  const s = services.find(x => x.service === 0x49 || (x.service === 0x49 && x.payload.length > 0));
  if (!s) return null;
  // Mode 09 PID 02 data payload often contains ASCII pairs; some encapsulation exists.
  const chars = s.payload.map(b => (b >= 0x20 && b <= 0x7E) ? String.fromCharCode(b) : "");
  const vin = chars.join("").replace(/\0/g, "").trim();
  if (vin.length >= 11 && vin.length <= 17) return vin;
  return null;
}