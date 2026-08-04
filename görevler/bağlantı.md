diff --git a/package.json b/package.json
index 9f4d0a2..73746ea 100644
--- a/package.json
+++ b/package.json
@@ -47,6 +47,7 @@
     "react-native": "0.76.9",
     "react-native-ble-plx": "^3.5.1",
     "react-native-bluetooth-classic": "^1.73.0-rc.17",
+    "react-native-tcp-socket": "^6.2.0",
     "react-native-fs": "^2.20.0",
     "react-native-purchases": "^8.3.3",
     "react-native-reanimated": "~3.16.1",
diff --git a/src/api/BluetoothService.android.ts b/src/api/BluetoothService.android.ts
index 356d1d5..bb0e876 100644
--- a/src/api/BluetoothService.android.ts
+++ b/src/api/BluetoothService.android.ts
@@ -88,6 +88,11 @@ class BluetoothServiceAndroid implements IBluetoothService {
 
     private dataSubscription: any | null = null;
     private dataListener: DataListener | null = null;
+
+    // ── WiFi (ELM327 TCP) transport state ──────────────────────────────
+    private wifiSocket: any | null = null;
+    private wifiDataBuffer: string = '';
+    private wifiTarget: string | null = null;
     private disconnectCallback: DisconnectCallback | null = null;
     private connectionMonitorId: ReturnType<typeof setInterval> | null = null;
     private readonly STORAGE_KEY = '@last_connected_device';
@@ -217,6 +222,15 @@ class BluetoothServiceAndroid implements IBluetoothService {
 
     async connect(deviceId: string): Promise<boolean> {
         this.isManualDisconnect = false;
+
+        // ── WiFi ELM327 (e.g. "WIFI:192.168.0.10:35000") ───────────────
+        // Must be checked BEFORE any Bluetooth Classic API call, since an
+        // IP:PORT string is not a valid BT MAC and previously fell through
+        // into the RFCOMM pairing fallback (always failing with PAIRING_FAILED).
+        if (deviceId.startsWith('WIFI:')) {
+            return this.connectWifi(deviceId.substring('WIFI:'.length));
+        }
+
         try {
             await RNBluetoothClassic.cancelDiscovery();
         } catch (e) {
@@ -311,6 +325,82 @@ class BluetoothServiceAndroid implements IBluetoothService {
         ]);
     }
 
+    private async connectWifi(target: string): Promise<boolean> {
+        const parts = target.split(':');
+        const ip = parts[0] || '192.168.0.10';
+        const port = parts[1] ? parseInt(parts[1], 10) : 35000;
+
+        try {
+            let TcpSocket: any;
+            try {
+                TcpSocket = require('react-native-tcp-socket');
+            } catch (e) {
+                console.error('[BluetoothService Android] react-native-tcp-socket not installed:', e);
+                return false;
+            }
+
+            this.disconnectWifiSocket();
+            this.wifiTarget = `${ip}:${port}`;
+            this.wifiDataBuffer = '';
+
+            return await Promise.race([
+                new Promise<boolean>((resolve) => {
+                    const socket = TcpSocket.createConnection({ port, host: ip, tls: false }, () => {
+                        Logger.log('WIFI_CONNECTED', `TCP socket connected to ${ip}:${port}`);
+                        this.wifiSocket = socket;
+                        this.reconnectAttempts = 0;
+                        this.startConnectionMonitor();
+                        resolve(true);
+                    });
+
+                    socket.on('data', (data: any) => {
+                        const chunk = typeof data === 'string' ? data : data.toString('utf8');
+                        this.processWifiChunk(chunk);
+                    });
+
+                    socket.on('error', (error: any) => {
+                        console.error('[BluetoothService Android] WiFi socket error:', error?.message || error);
+                        this.disconnectWifiSocket();
+                        resolve(false);
+                    });
+
+                    socket.on('close', () => {
+                        Logger.log('WIFI_CLOSED', 'TCP socket closed');
+                        if (!this.isManualDisconnect) this.handleDroppedConnection();
+                    });
+                }),
+                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
+            ]);
+        } catch (err) {
+            console.error('[BluetoothService Android] WiFi connect failed:', err);
+            return false;
+        }
+    }
+
+    private processWifiChunk(chunk: string) {
+        if (this.isDraining) return;
+        Logger.log('WIFI_READ_CHUNK_RAW', chunk);
+        this.wifiDataBuffer += chunk;
+        while (this.wifiDataBuffer.includes('>')) {
+            const index = this.wifiDataBuffer.indexOf('>');
+            const fullResponse = this.wifiDataBuffer.substring(0, index + 1);
+            this.wifiDataBuffer = this.wifiDataBuffer.substring(index + 1);
+            Logger.log('WIFI_READ_FULL_RESPONSE', fullResponse);
+            if (this.dataListener) {
+                this.dataListener(fullResponse);
+            }
+        }
+    }
+
+    private disconnectWifiSocket(keepTarget: boolean = false) {
+        if (this.wifiSocket) {
+            try { this.wifiSocket.destroy(); } catch (e) {}
+            this.wifiSocket = null;
+        }
+        this.wifiDataBuffer = '';
+        if (!keepTarget) this.wifiTarget = null;
+    }
+
     private async connectBLE(deviceId: string): Promise<boolean> {
         const manager = BLEBridge.getInstance();
         try {
@@ -382,6 +472,11 @@ class BluetoothServiceAndroid implements IBluetoothService {
     async disconnect() {
         this.isManualDisconnect = true;
         this.stopConnectionMonitor();
+        if (this.wifiSocket) {
+            this.disconnectWifiSocket();
+            this.disconnectCallback = null;
+            return;
+        }
         if (this.bleSubscription) { this.bleSubscription.remove(); this.bleSubscription = null; }
         if (this.bleConnectedDevice) {
             try { await BLEBridge.getInstance().cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
@@ -409,6 +504,11 @@ class BluetoothServiceAndroid implements IBluetoothService {
         }
 
         const command = data.endsWith('\r') ? data : data + '\r';
+        if (this.wifiSocket) {
+            Logger.log('WIFI_WRITE', command);
+            this.wifiSocket.write(command);
+            return;
+        }
         if (this.bleConnectedDevice && this.bleWriteCharacteristic) {
             Logger.log('BLE_WRITE', command);
             const b64 = base64Encode(command);
@@ -435,6 +535,7 @@ class BluetoothServiceAndroid implements IBluetoothService {
     }
     clearBuffer() {
         this.bleDataBuffer = '';
+        this.wifiDataBuffer = '';
         this.isDraining = true;
         if (this.drainTimeout) clearTimeout(this.drainTimeout);
         this.drainTimeout = setTimeout(() => {
@@ -462,7 +563,9 @@ class BluetoothServiceAndroid implements IBluetoothService {
         this.connectionMonitorId = setInterval(async () => {
             let connected = false;
             try {
-                if (this.bleConnectedDevice) {
+                if (this.wifiSocket) {
+                    connected = true; // liveness tracked via socket 'close'/'error' events
+                } else if (this.bleConnectedDevice) {
                     connected = await BLEBridge.getInstance().isDeviceConnected(this.bleConnectedDevice.id);
                 } else if (this.connectedDevice) {
                     connected = await this.connectedDevice.isConnected();
@@ -478,12 +581,13 @@ class BluetoothServiceAndroid implements IBluetoothService {
 
     private async handleDroppedConnection() {
         console.warn('[Bluetooth Android] Connection lost!');
-        const lastId = this.bleConnectedDevice?.id || this.connectedDevice?.address;
+        const lastId = this.wifiTarget ? `WIFI:${this.wifiTarget}` : (this.bleConnectedDevice?.id || this.connectedDevice?.address);
         this.stopConnectionMonitor();
         if (this.bleSubscription) this.bleSubscription.remove();
         this.bleConnectedDevice = null;
         this.stopListening();
         this.connectedDevice = null;
+        this.disconnectWifiSocket();
 
         if (lastId && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
             this.reconnectAttempts++;
diff --git a/src/api/BluetoothService.ios.ts b/src/api/BluetoothService.ios.ts
index 9371159..af9b5bf 100644
--- a/src/api/BluetoothService.ios.ts
+++ b/src/api/BluetoothService.ios.ts
@@ -93,6 +93,11 @@ class BluetoothServiceIOS implements IBluetoothService {
     private reconnectAttempts: number = 0;
     private readonly MAX_RECONNECT_ATTEMPTS = 5;
 
+    // ── WiFi (ELM327 TCP) transport state ──────────────────────────────
+    private wifiSocket: any | null = null;
+    private wifiDataBuffer: string = '';
+    private wifiTarget: string | null = null;
+
     async checkBluetoothState(): Promise<void> {
         const manager = BLEBridge.getInstance();
         const state = await manager.state();
@@ -217,6 +222,12 @@ class BluetoothServiceIOS implements IBluetoothService {
 
     async connect(deviceId: string): Promise<boolean> {
         this.isManualDisconnect = false;
+
+        // ── WiFi ELM327 (e.g. "WIFI:192.168.0.10:35000") ───────────────
+        if (deviceId.startsWith('WIFI:')) {
+            return this.connectWifi(deviceId.substring('WIFI:'.length));
+        }
+
         const manager = BLEBridge.getInstance();
         try {
             manager.stopDeviceScan();
@@ -351,6 +362,82 @@ class BluetoothServiceIOS implements IBluetoothService {
         }
     }
 
+    private async connectWifi(target: string): Promise<boolean> {
+        const parts = target.split(':');
+        const ip = parts[0] || '192.168.0.10';
+        const port = parts[1] ? parseInt(parts[1], 10) : 35000;
+
+        try {
+            let TcpSocket: any;
+            try {
+                TcpSocket = require('react-native-tcp-socket');
+            } catch (e) {
+                console.error('[BluetoothService iOS] react-native-tcp-socket not installed:', e);
+                return false;
+            }
+
+            this.disconnectWifiSocket();
+            this.wifiTarget = `${ip}:${port}`;
+            this.wifiDataBuffer = '';
+
+            return await Promise.race([
+                new Promise<boolean>((resolve) => {
+                    const socket = TcpSocket.createConnection({ port, host: ip, tls: false }, () => {
+                        Logger.log('WIFI_CONNECTED', `TCP socket connected to ${ip}:${port}`);
+                        this.wifiSocket = socket;
+                        this.reconnectAttempts = 0;
+                        this.startConnectionMonitor();
+                        resolve(true);
+                    });
+
+                    socket.on('data', (data: any) => {
+                        const chunk = typeof data === 'string' ? data : data.toString('utf8');
+                        this.processWifiChunk(chunk);
+                    });
+
+                    socket.on('error', (error: any) => {
+                        console.error('[BluetoothService iOS] WiFi socket error:', error?.message || error);
+                        this.disconnectWifiSocket();
+                        resolve(false);
+                    });
+
+                    socket.on('close', () => {
+                        Logger.log('WIFI_CLOSED', 'TCP socket closed');
+                        if (!this.isManualDisconnect) this.handleDroppedConnection();
+                    });
+                }),
+                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
+            ]);
+        } catch (err) {
+            console.error('[BluetoothService iOS] WiFi connect failed:', err);
+            return false;
+        }
+    }
+
+    private processWifiChunk(chunk: string) {
+        if (this.isDraining) return;
+        Logger.log('WIFI_READ_CHUNK_RAW', chunk);
+        this.wifiDataBuffer += chunk;
+        while (this.wifiDataBuffer.includes('>')) {
+            const index = this.wifiDataBuffer.indexOf('>');
+            const fullResponse = this.wifiDataBuffer.substring(0, index + 1);
+            this.wifiDataBuffer = this.wifiDataBuffer.substring(index + 1);
+            Logger.log('WIFI_READ_FULL_RESPONSE', fullResponse);
+            if (this.dataListener) {
+                this.dataListener(fullResponse);
+            }
+        }
+    }
+
+    private disconnectWifiSocket(keepTarget: boolean = false) {
+        if (this.wifiSocket) {
+            try { this.wifiSocket.destroy(); } catch (e) {}
+            this.wifiSocket = null;
+        }
+        this.wifiDataBuffer = '';
+        if (!keepTarget) this.wifiTarget = null;
+    }
+
     private processBleChunk(chunk: string) {
         if (this.isDraining) return;
         Logger.log('BLE_READ_CHUNK_RAW', chunk);
@@ -370,6 +457,11 @@ class BluetoothServiceIOS implements IBluetoothService {
     async disconnect() {
         this.isManualDisconnect = true;
         this.stopConnectionMonitor();
+        if (this.wifiSocket) {
+            this.disconnectWifiSocket();
+            this.disconnectCallback = null;
+            return;
+        }
         if (this.bleSubscription) { this.bleSubscription.remove(); this.bleSubscription = null; }
         if (this.bleConnectedDevice) {
             try { await BLEBridge.getInstance().cancelDeviceConnection(this.bleConnectedDevice.id); } catch (e) {}
@@ -397,6 +489,11 @@ class BluetoothServiceIOS implements IBluetoothService {
         }
 
         const command = data.endsWith('\r') ? data : data + '\r';
+        if (this.wifiSocket) {
+            Logger.log('WIFI_WRITE', command);
+            this.wifiSocket.write(command);
+            return;
+        }
         if (!this.bleConnectedDevice || !this.bleWriteCharacteristic) throw new Error('Not connected');
         Logger.log('BLE_WRITE', command);
         const b64 = base64Encode(command);
@@ -419,6 +516,7 @@ class BluetoothServiceIOS implements IBluetoothService {
     clearBuffer() {
         this.bleDataBuffer = '';
         this.iosBleBuffer = '';
+        this.wifiDataBuffer = '';
         this.isDraining = true;
         if (this.drainTimeout) clearTimeout(this.drainTimeout);
         this.drainTimeout = setTimeout(() => {
@@ -431,7 +529,9 @@ class BluetoothServiceIOS implements IBluetoothService {
         this.connectionMonitorId = setInterval(async () => {
             let connected = false;
             try {
-                if (this.bleConnectedDevice) {
+                if (this.wifiSocket) {
+                    connected = true; // liveness tracked via socket 'close'/'error' events
+                } else if (this.bleConnectedDevice) {
                     connected = await BLEBridge.getInstance().isDeviceConnected(this.bleConnectedDevice.id);
                 }
             } catch (e) {}
@@ -445,11 +545,12 @@ class BluetoothServiceIOS implements IBluetoothService {
 
     private async handleDroppedConnection() {
         console.warn('[Bluetooth iOS] Connection lost!');
-        const lastId = this.bleConnectedDevice?.id;
+        const lastId = this.wifiTarget ? `WIFI:${this.wifiTarget}` : this.bleConnectedDevice?.id;
         this.stopConnectionMonitor();
         if (this.bleSubscription) this.bleSubscription.remove();
         this.bleConnectedDevice = null;
         this.bleWriteCharacteristic = null;
+        this.disconnectWifiSocket();
 
         if (lastId && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
             this.reconnectAttempts++;
diff --git a/src/core/connection/CapabilityDiscoveryManager.ts b/src/core/connection/CapabilityDiscoveryManager.ts
index 2317428..cb20b0a 100644
--- a/src/core/connection/CapabilityDiscoveryManager.ts
+++ b/src/core/connection/CapabilityDiscoveryManager.ts
@@ -182,5 +182,51 @@ export class CapabilityDiscoveryManager {
         store.addLog(`CAPABILITY_DISCOVERY: UDS Services map: ${JSON.stringify(udsServicesMap)}`);
         return udsServicesMap;
     }
+
+    /**
+     * [Gap-fix] Probes manufacturer-specific (Mode 22) PIDs for the vehicle's
+     * detected make via OemPidRegistry. This is what actually turns the OEM
+     * PID data added for VAG/BMW/Mercedes/Ford/Toyota into a live capability,
+     * instead of a static table nothing ever queries.
+     *
+     * Safe by construction: only runs for makes present in OemPidRegistry,
+     * switches ECU header per-PID via "AT SH", and any single PID failure
+     * (unsupported DID, NO DATA, negative response) is swallowed so it can
+     * never block or fail the main connection/telemetry flow.
+     */
+    public static async discoverOemPids(make: string): Promise<Record<string, boolean>> {
+        const store = useBluetoothStore.getState();
+        const { OemPidRegistry } = require('../pids/OemPidRegistry');
+        const oemPids = OemPidRegistry.getPidsForMake(make);
+        const result: Record<string, boolean> = {};
+
+        if (oemPids.length === 0) {
+            return result;
+        }
+
+        store.addLog(`CAPABILITY_DISCOVERY: Probing ${oemPids.length} OEM-specific PID(s) for make="${make}"...`);
+        let lastHeader: string | null = null;
+
+        for (const def of oemPids) {
+            try {
+                if (def.ecuHeader && def.ecuHeader !== lastHeader) {
+                    await OBDCommandQueue.add(`AT SH ${def.ecuHeader}`, 800).catch(() => {});
+                    lastHeader = def.ecuHeader;
+                }
+                const cmd = `22 ${def.pid.substring(0, 2)} ${def.pid.substring(2, 4)}`;
+                const res = await OBDCommandQueue.add(cmd, 2000).catch(() => '');
+                const clean = res ? res.replace(/\s+/g, '').toUpperCase() : '';
+                const expectedEcho = `62${def.pid.toUpperCase()}`;
+                const supported = clean.includes(expectedEcho) && !clean.includes('NODATA') && !clean.includes('7F22');
+                result[def.name] = supported;
+            } catch (err: any) {
+                result[def.name] = false;
+                store.addLog(`CAPABILITY_DISCOVERY_WARN: OEM PID ${def.name} probe failed: ${err?.message || err}`);
+            }
+        }
+
+        store.addLog(`CAPABILITY_DISCOVERY: OEM PID map (${make}): ${JSON.stringify(result)}`);
+        return result;
+    }
 }
 export default CapabilityDiscoveryManager;
\ No newline at end of file
diff --git a/src/core/parser/FlowControlManager.ts b/src/core/parser/FlowControlManager.ts
index a8240d2..172a0f6 100644
--- a/src/core/parser/FlowControlManager.ts
+++ b/src/core/parser/FlowControlManager.ts
@@ -1,21 +1,42 @@
 import { useBluetoothStore } from '../../store/useBluetoothStore';
-import { AdapterProfileRegistry } from '../transport/AdapterProfileRegistry';
+import { AdapterProfileRegistry, AdapterProfile } from '../transport/AdapterProfileRegistry';
 
 export class FlowControlManager {
-    shouldInjectManualFlowControl(responseLines: string[]): boolean {
+    /**
+     * [Gap-fix] Resolves the brand-specific AdapterProfile.
+     *
+     * Previously this only ever matched 'OBDLink' (score >= 92) or fell back
+     * to 'ELM327_v1.5'/'CLONE_v2.1' — meaning every other named entry in
+     * AdapterProfileRegistry (e.g. 'Vgate') could never actually be selected,
+     * regardless of what adapter the user owned. adapterFirmware already
+     * captures the raw "ATI"/"AT@1" identity string during ProtocolNegotiator's
+     * post-reset benchmark, but nothing consulted it for profile selection.
+     */
+    private resolveAdapterProfile(): AdapterProfile {
         const store = useBluetoothStore.getState();
-        
-        let profile = AdapterProfileRegistry['ELM327_v1.5']; // default fallback
-        
+        const firmware = (store.adapterFirmware || '').toUpperCase();
+
+        if (firmware) {
+            if (firmware.includes('OBDLINK')) return AdapterProfileRegistry.OBDLink;
+            if (firmware.includes('VGATE') || firmware.includes('ICAR')) return AdapterProfileRegistry.Vgate;
+            if (firmware.includes('V1.5') || firmware.includes('V 1.5')) return AdapterProfileRegistry['ELM327_v1.5'];
+        }
+
         if (store.isCloneDevice) {
-            profile = AdapterProfileRegistry['CLONE_v2.1'];
-        } else {
-            const score = store.adapterCapabilityScore;
-            if (score >= 92) {
-                profile = AdapterProfileRegistry.OBDLink;
-            }
+            return AdapterProfileRegistry['CLONE_v2.1'];
         }
 
+        const score = store.adapterCapabilityScore;
+        if (score >= 92) {
+            return AdapterProfileRegistry.OBDLink;
+        }
+
+        return AdapterProfileRegistry['ELM327_v1.5']; // default fallback
+    }
+
+    shouldInjectManualFlowControl(responseLines: string[]): boolean {
+        const profile = this.resolveAdapterProfile();
+
         // Only inject if manual flow control is supported by the profile (Condition 5)
         if (!profile.supportsManualFlowControl) {
             return false;
diff --git a/src/core/pids/OemPidRegistry.ts b/src/core/pids/OemPidRegistry.ts
new file mode 100644
index 0000000..9a349b9
--- /dev/null
+++ b/src/core/pids/OemPidRegistry.ts
@@ -0,0 +1,147 @@
+import { PidDefinition } from './PidRegistry';
+
+/**
+ * OemPidRegistry
+ * ----------------------------------------------------------------------
+ * [Gap-fix] Addresses the AI code-review finding: "OEM PID setleri yok –
+ * VAG/BMW/Mercedes/Ford/Toyota özel kanalları yok".
+ *
+ * Generic OBD-II (Mode 01) only exposes the ~100 SAE-standardized PIDs in
+ * PidRegistry.ts. Manufacturer-specific live data (DSG/DCT oil temp,
+ * individual wheel speeds, per-cylinder trims, hybrid battery cell data,
+ * etc.) is exposed via UDS ReadDataByIdentifier (Mode 22) with vendor-owned
+ * DID ranges that differ per OEM and are NOT safe to broadcast to other
+ * manufacturers' ECUs — hence this is a separate, make-scoped registry
+ * rather than being merged into the global standardPidsList.
+ *
+ * Usage: only query these once VehicleProfileDB has matched a make (by VIN
+ * or manual selection), e.g.:
+ *   const profile = VehicleProfileDB.matchProfileByVin(vin);
+ *   const oemPids = OemPidRegistry.getPidsForMake(profile.make);
+ */
+
+export interface OemPidDefinition extends PidDefinition {
+    make: string;           // Scoping key — must match VehicleProfile.make
+    ecuHeader?: string;     // Recommended "AT SH" target header for this DID (functional address)
+}
+
+const oemPidsList: OemPidDefinition[] = [
+    // ── Volkswagen Group (VAG: VW/Audi/SEAT/Skoda/Cupra) ──────────────
+    // UDS Mode 22, engine ECU functional header 0x714 (varies by gateway/model year)
+    {
+        make: "Volkswagen", mode: "22", pid: "F40C", ecuHeader: "714",
+        name: "VAG_DSG_OIL_TEMP", description: "DSG/DCT gearbox oil temperature", min: -40, max: 200, unit: "°C",
+        decode: (bytes) => (bytes[0] || 0) - 40
+    },
+    {
+        make: "Volkswagen", mode: "22", pid: "1158", ecuHeader: "714",
+        name: "VAG_TURBO_BOOST_ACTUAL", description: "Actual turbocharger boost pressure", min: 0, max: 3000, unit: "mbar",
+        decode: (bytes) => ((bytes[0] || 0) << 8 | (bytes[1] || 0))
+    },
+    {
+        make: "Volkswagen", mode: "22", pid: "F442", ecuHeader: "714",
+        name: "VAG_HYBRID_BATTERY_SOC", description: "High-voltage hybrid battery state of charge", min: 0, max: 100, unit: "%",
+        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
+    },
+    {
+        make: "Volkswagen", mode: "22", pid: "0030", ecuHeader: "17FE",
+        name: "VAG_GATEWAY_VIN_ECHO", description: "Central gateway VIN echo (connectivity sanity check)", min: 0, max: 0, unit: "ASCII",
+        decode: (bytes) => bytes.map(b => String.fromCharCode(b)).join('')
+    },
+
+    // ── BMW / MINI (F/G-Series) ────────────────────────────────────────
+    {
+        make: "BMW", mode: "22", pid: "1C50", ecuHeader: "12",
+        name: "BMW_VALVETRONIC_ACTUAL_LIFT", description: "Valvetronic actual valve lift", min: 0, max: 10, unit: "mm",
+        decode: (bytes) => Number((((bytes[0] || 0)) / 25.5).toFixed(2))
+    },
+    {
+        make: "BMW", mode: "22", pid: "0A9F", ecuHeader: "12",
+        name: "BMW_HPFP_ACTUAL_PRESSURE", description: "High pressure fuel pump actual rail pressure", min: 0, max: 25000, unit: "kPa",
+        decode: (bytes) => ((bytes[0] || 0) << 8 | (bytes[1] || 0)) * 10
+    },
+    {
+        make: "BMW", mode: "22", pid: "4F42", ecuHeader: "F1",
+        name: "BMW_AC_ELECTRIC_MOTOR_TEMP", description: "Electric water pump / e-motor temperature (PHEV models)", min: -40, max: 200, unit: "°C",
+        decode: (bytes) => (bytes[0] || 0) - 40
+    },
+
+    // ── Mercedes-Benz ───────────────────────────────────────────────────
+    {
+        make: "Mercedes-Benz", mode: "22", pid: "2A04", ecuHeader: "7E0",
+        name: "MB_DPF_SOOT_LOAD", description: "Diesel particulate filter soot load", min: 0, max: 100, unit: "%",
+        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
+    },
+    {
+        make: "Mercedes-Benz", mode: "22", pid: "1104", ecuHeader: "7E0",
+        name: "MB_ADBLUE_LEVEL", description: "AdBlue (DEF) tank level", min: 0, max: 100, unit: "%",
+        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
+    },
+    {
+        make: "Mercedes-Benz", mode: "22", pid: "F190", ecuHeader: "7E0",
+        name: "MB_TRANSMISSION_TEMP", description: "7G-Tronic/9G-Tronic transmission oil temperature", min: -40, max: 200, unit: "°C",
+        decode: (bytes) => (bytes[0] || 0) - 40
+    },
+
+    // ── Ford (Sync 3 / Sync 4 platforms) ────────────────────────────────
+    {
+        make: "Ford", mode: "22", pid: "404C", ecuHeader: "7E0",
+        name: "FORD_TURBO_BOOST_DESIRED_VS_ACTUAL", description: "Desired vs actual turbo boost delta", min: -500, max: 500, unit: "mbar",
+        decode: (bytes) => ((bytes[0] || 0) - 128) * 10
+    },
+    {
+        make: "Ford", mode: "22", pid: "1E12", ecuHeader: "7E0",
+        name: "FORD_TRANS_FLUID_TEMP", description: "6F35/10R80 transmission fluid temperature", min: -40, max: 200, unit: "°C",
+        decode: (bytes) => (bytes[0] || 0) - 40
+    },
+
+    // ── Toyota / Lexus (Hybrid platforms) ───────────────────────────────
+    {
+        make: "Toyota", mode: "22", pid: "0107", ecuHeader: "7E2",
+        name: "TOYOTA_HV_BATTERY_TEMP", description: "Hybrid HV battery pack temperature", min: -40, max: 120, unit: "°C",
+        decode: (bytes) => (bytes[0] || 0) - 40
+    },
+    {
+        make: "Toyota", mode: "22", pid: "010A", ecuHeader: "7E2",
+        name: "TOYOTA_HV_BATTERY_SOC", description: "Hybrid HV battery state of charge", min: 0, max: 100, unit: "%",
+        decode: (bytes) => Number((((bytes[0] || 0) * 100) / 255).toFixed(1))
+    },
+];
+
+const oemPidsByMake = new Map<string, OemPidDefinition[]>();
+for (const p of oemPidsList) {
+    const key = p.make.toLowerCase();
+    if (!oemPidsByMake.has(key)) oemPidsByMake.set(key, []);
+    oemPidsByMake.get(key)!.push(p);
+}
+
+export class OemPidRegistry {
+    /**
+     * Returns all manufacturer-specific PIDs for a given make.
+     * Make matching is case-insensitive and tolerant of group naming
+     * (e.g. "Audi"/"SEAT"/"Skoda"/"Cupra" all resolve to the VAG PID set).
+     */
+    public static getPidsForMake(make: string): OemPidDefinition[] {
+        const normalized = this.normalizeMake(make);
+        return oemPidsByMake.get(normalized) ?? [];
+    }
+
+    public static getPid(make: string, mode: string, pid: string): OemPidDefinition | undefined {
+        return this.getPidsForMake(make).find(
+            p => p.mode.toUpperCase() === mode.toUpperCase() && p.pid.toUpperCase() === pid.toUpperCase()
+        );
+    }
+
+    public static getSupportedMakes(): string[] {
+        return Array.from(new Set(oemPidsList.map(p => p.make)));
+    }
+
+    private static normalizeMake(make: string): string {
+        const m = make.toLowerCase().trim();
+        if (["audi", "seat", "skoda", "cupra", "porsche", "vw", "volkswagen"].includes(m)) return "volkswagen";
+        if (["mini", "bmw"].includes(m)) return "bmw";
+        if (["mercedes", "mercedes-benz", "mb", "amg"].includes(m)) return "mercedes-benz";
+        if (["lexus", "toyota"].includes(m)) return "toyota";
+        return m;
+    }
+}
diff --git a/src/core/pids/VehicleProfileDB.ts b/src/core/pids/VehicleProfileDB.ts
index 7f0dfc3..92c9343 100644
--- a/src/core/pids/VehicleProfileDB.ts
+++ b/src/core/pids/VehicleProfileDB.ts
@@ -100,6 +100,93 @@ export class VehicleProfileDB {
             supportsManualFlowControl: true,
             description: "Toyota CAN 11-bit with Hybrid control module queries supported"
         },
+        {
+            id: "vag_meb_mqb_can",
+            make: "Volkswagen",
+            model: "MQB/MEB Platform (Audi/SEAT/Skoda/Cupra)",
+            year: 2018,
+            protocol: "6", // ISO 15765-4 CAN 11bit 500k
+            initCommands: [
+                "AT Z",
+                "AT E0",
+                "AT SP 6",
+                "AT H1",       // Headers on — VAG gateway (0x17FE) fans out to sub-ECUs (0x714 engine, 0x713 ABS, etc.)
+                "AT CAF 1",    // Auto flow-control — required for VAG's multi-frame UDS (0x22/0x19) responses
+                "AT AT 1"      // Adaptive timing — VAG central gateway response latency varies by module
+            ],
+            settleDelayMs: 80,
+            supportsManualFlowControl: true,
+            description: "VAG Group (VW/Audi/SEAT/Skoda/Cupra) CAN profile — routes through central gateway, UDS mode 22/19 aware"
+        },
+        {
+            id: "bmw_fseries_can",
+            make: "BMW",
+            model: "F/G-Series (incl. MINI)",
+            year: 2015,
+            protocol: "6",
+            initCommands: [
+                "AT Z",
+                "AT E0",
+                "AT SP 6",
+                "AT H1",
+                "AT CAF 1",
+                "AT AT 1"      // BMW DS2/D-CAN gateway can be slow on cold boot; adaptive timing avoids false timeouts
+            ],
+            settleDelayMs: 80,
+            supportsManualFlowControl: true,
+            description: "BMW/MINI F/G-Series CAN profile via central gateway (ZGW), UDS mode 22/2E aware"
+        },
+        {
+            id: "mercedes_can",
+            make: "Mercedes-Benz",
+            model: "W205/W213/C257 Platform",
+            year: 2015,
+            protocol: "6",
+            initCommands: [
+                "AT Z",
+                "AT E0",
+                "AT SP 6",
+                "AT H1",
+                "AT CAF 1"
+            ],
+            settleDelayMs: 60,
+            supportsManualFlowControl: true,
+            description: "Mercedes-Benz CAN 11-bit profile for post-2014 SPC/HU-Nav gateway platforms"
+        },
+        {
+            id: "ford_sync_can",
+            make: "Ford",
+            model: "Sync 3 / Sync 4 Platform",
+            year: 2016,
+            protocol: "6",
+            initCommands: [
+                "AT Z",
+                "AT E0",
+                "AT SP 6",
+                "AT H1",
+                "AT CAF 1"
+            ],
+            settleDelayMs: 60,
+            supportsManualFlowControl: true,
+            description: "Ford CAN 11-bit profile for Sync 3/4 (MS-CAN + HS-CAN) equipped models"
+        },
+        {
+            id: "stellantis_can",
+            make: "Stellantis",
+            model: "PSA/Fiat/Jeep EMP2/CMP Platform",
+            year: 2017,
+            protocol: "6",
+            initCommands: [
+                "AT Z",
+                "AT E0",
+                "AT SP 6",
+                "AT H1",
+                "AT CAF 1"
+            ],
+            settleDelayMs: 60,
+            supportsManualFlowControl: true,
+            description: "Stellantis (Peugeot/Citroen/Fiat/Jeep) BSI-gateway CAN profile"
+        },
         {
             id: "generic_obd2_auto",
             make: "Generic",
@@ -189,6 +276,26 @@ export class VehicleProfileDB {
             // Toyota VIN prefixes
             return this.getProfileById("toyota_hybrid_can");
         }
+        // [Gap-fix] VAG Group: VW (WVW/WV1/WV2/3VW/1VW), Audi (WAU/TRU), SEAT (VSS), Skoda (TMB)
+        if (["WVW", "WV1", "WV2", "3VW", "1VW", "WAU", "TRU", "VSS", "TMB"].some(p => cleanVin.startsWith(p))) {
+            return this.getProfileById("vag_meb_mqb_can");
+        }
+        // [Gap-fix] BMW / MINI: WBA/WBS/WBY (BMW), 4US/5UX (BMW NA), WMW (MINI)
+        if (["WBA", "WBS", "WBY", "4US", "5UX", "WMW"].some(p => cleanVin.startsWith(p))) {
+            return this.getProfileById("bmw_fseries_can");
+        }
+        // [Gap-fix] Mercedes-Benz: WDD/WDB/WDC/4JG
+        if (["WDD", "WDB", "WDC", "4JG"].some(p => cleanVin.startsWith(p))) {
+            return this.getProfileById("mercedes_can");
+        }
+        // [Gap-fix] Ford: 1FA/1FT/1FM/WF0/3FA
+        if (["1FA", "1FT", "1FM", "WF0", "3FA"].some(p => cleanVin.startsWith(p))) {
+            return this.getProfileById("ford_sync_can");
+        }
+        // [Gap-fix] Stellantis: VF3 (Peugeot), VF7 (Citroen), ZFA (Fiat), 1C4/1C6 (Jeep/RAM)
+        if (["VF3", "VF7", "ZFA", "1C4", "1C6"].some(p => cleanVin.startsWith(p))) {
+            return this.getProfileById("stellantis_can");
+        }
         return this.getProfileById("generic_obd2_auto");
     }
 }
diff --git a/src/hooks/useBluetooth.ts b/src/hooks/useBluetooth.ts
index c0011f5..7c57436 100644
--- a/src/hooks/useBluetooth.ts
+++ b/src/hooks/useBluetooth.ts
@@ -143,6 +143,12 @@ export const useBluetooth = () => {
         btStore.setSuggestedVehicleProfile(profile);
         btStore.setSensorData({ vehicleMake: profile.make });  
 
+        // [Gap-fix] Probe manufacturer-specific (Mode 22) PIDs now that the make is known.
+        // Fire-and-forget: never allowed to block or fail the main connection flow.
+        if (profile.make) {
+            CapabilityDiscoveryManager.discoverOemPids(profile.make).catch(() => {});
+        }
+
         const telemetryState = useTelemetryStore.getState();  
         if (telemetryState.activeSessionVehicle) {  
             telemetryState.setActiveSessionVehicle({ ...telemetryState.activeSessionVehicle, vin });  
diff --git a/src/screens/ConnectionFlowScreen.tsx b/src/screens/ConnectionFlowScreen.tsx
index 459a148..08cc7f4 100644
--- a/src/screens/ConnectionFlowScreen.tsx
+++ b/src/screens/ConnectionFlowScreen.tsx
@@ -13,7 +13,8 @@ import {
   Alert,
   Linking,
   Clipboard,
-  Animated
+  Animated,
+  TextInput
 } from 'react-native';
 import { useTranslation } from 'react-i18next';
 import { useBluetooth } from '../hooks/useBluetooth';
@@ -35,6 +36,8 @@ export default function ConnectionFlowScreen({ onBack, onNavigateToHealth }: Con
   const { fs, ms, vs } = useResponsive();
 
   const [selectedType, setSelectedType] = useState<'BLUETOOTH' | 'WIFI' | null>('BLUETOOTH');
+  const [wifiIp, setWifiIp] = useState('192.168.0.10');
+  const [wifiPort, setWifiPort] = useState('35000');
   const [scannedDevices, setScannedDevices] = useState<any[]>([]);
   const [isScanning, setIsScanning] = useState(false);
   const [showPairingOverlay, setShowPairingOverlay] = useState(false);
@@ -156,21 +159,16 @@ export default function ConnectionFlowScreen({ onBack, onNavigateToHealth }: Con
   // Connect via Wi-Fi (IP/Port)
   const handleConnectWifi = async () => {
     triggerHaptic();
+    const wifiId = `WIFI:${wifiIp.trim() || '192.168.0.10'}:${wifiPort.trim() || '35000'}`;
     const store = useBluetoothStore.getState();
-    store.setSensorData({ connectionType: 'WIFI', deviceId: '192.168.0.10:35000', deviceName: 'Wi-Fi OBDII' });
-    
-    // Delegate connection to single source of truth: useBluetooth hook
-    proceedWithConnection('192.168.0.10:35000', 'Wi-Fi OBDII');
-  };
+    store.setSensorData({ connectionType: 'WIFI', deviceId: wifiId, deviceName: 'Wi-Fi OBDII' });
 
-  const MotoCortexOBDModuleConnect = async (type: 'bluetooth' | 'ble' | 'wifi', target: string): Promise<boolean> => {
-    try {
-      const { connectDevice } = require('motocortex-obd');
-      return await connectDevice(type, target);
-    } catch (e) {
-      // Fallback if native module call fails
-      return false;
-    }
+    // Delegate connection to single source of truth: useBluetooth hook.
+    // NOTE: previously this passed a bare "ip:port" string, which BluetoothService.connect()
+    // could not distinguish from a Bluetooth MAC address and always routed into the Classic
+    // Bluetooth pairing fallback (guaranteed PAIRING_FAILED). The "WIFI:" prefix now routes
+    // it to the real TCP-socket transport in BluetoothService.(android|ios).ts.
+    proceedWithConnection(wifiId, 'Wi-Fi OBDII');
   };
 
   // 7-Tier Diagnostic Error Troubleshooting Advice mapper
@@ -411,6 +409,37 @@ export default function ConnectionFlowScreen({ onBack, onNavigateToHealth }: Con
             </Text>
           </View>
 
+          <View style={styles.wifiIpRow}>
+            <View style={{ flex: 3, marginRight: ms(8) }}>
+              <Text style={[styles.wifiInputLabel, { color: colors.textSec, fontSize: fs(10) }]}>
+                {t('connection.wifiIpLabel', 'IP ADDRESS')}
+              </Text>
+              <TextInput
+                value={wifiIp}
+                onChangeText={setWifiIp}
+                placeholder="192.168.0.10"
+                placeholderTextColor={colors.textSec}
+                keyboardType="numbers-and-punctuation"
+                autoCapitalize="none"
+                autoCorrect={false}
+                style={[styles.wifiInput, { color: colors.text, borderColor: colors.border, fontFamily: colors.mono }]}
+              />
+            </View>
+            <View style={{ flex: 2 }}>
+              <Text style={[styles.wifiInputLabel, { color: colors.textSec, fontSize: fs(10) }]}>
+                {t('connection.wifiPortLabel', 'PORT')}
+              </Text>
+              <TextInput
+                value={wifiPort}
+                onChangeText={setWifiPort}
+                placeholder="35000"
+                placeholderTextColor={colors.textSec}
+                keyboardType="number-pad"
+                style={[styles.wifiInput, { color: colors.text, borderColor: colors.border, fontFamily: colors.mono }]}
+              />
+            </View>
+          </View>
+
           <View style={styles.wifiActions}>
             <TouchableOpacity 
               style={[styles.settingsBtn, { borderColor: colors.cyan }]}
@@ -850,6 +879,23 @@ const styles = StyleSheet.create({
     flexDirection: 'row',
     gap: 12,
   },
+  wifiIpRow: {
+    flexDirection: 'row',
+    marginBottom: 20,
+  },
+  wifiInputLabel: {
+    fontWeight: '700',
+    marginBottom: 6,
+    letterSpacing: 0.5,
+  },
+  wifiInput: {
+    borderWidth: 1.5,
+    borderRadius: 10,
+    paddingVertical: 10,
+    paddingHorizontal: 12,
+    fontSize: 14,
+    fontWeight: '700',
+  },
   settingsBtn: {
     flex: 1,
     borderRadius: 12,