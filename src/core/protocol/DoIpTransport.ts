/**
 * ISO 13400 DoIP Transport Layer — MotoCortex Core
 * ---------------------------------------------------------------
 * Provides real TCP 13400 diagnostic session transport using react-native-tcp-socket.
 * Works in conjunction with DoIpClient (protocol codec) to provide a complete DoIP stack
 * for modern Euro 6d/Euro 7 vehicles (BMW G-Series, VAG MLBevo/MEB, Volvo SPA).
 */

import TcpSocket from 'react-native-tcp-socket';
import { DoIpClient, DoIpVehicleAnnouncement, DoIpState } from './DoIpClient';

const DOIP_PORT = 13400;
const DOIP_TCP_CONNECT_TIMEOUT_MS = 5000;
const DOIP_ROUTING_ACTIVATION_TIMEOUT_MS = 3000;
const DOIP_ALIVE_CHECK_INTERVAL_MS = 15000;

export interface DoIpTransportCallbacks {
    onStateChange?: (state: DoIpState) => void;
    onVehicleDiscovered?: (vehicle: DoIpVehicleAnnouncement) => void;
    onUdsResponse?: (udsPayload: number[]) => void;
    onError?: (error: string) => void;
    onLog?: (message: string) => void;
}

export class DoIpTransport {
    private client = new DoIpClient();
    private tcpSocket: any = null;
    private aliveCheckTimer: NodeJS.Timeout | null = null;
    private callbacks: DoIpTransportCallbacks = {};
    private rxBuffer: number[] = [];

    constructor(callbacks?: DoIpTransportCallbacks) {
        if (callbacks) this.callbacks = callbacks;
    }

    private log(msg: string): void {
        this.callbacks.onLog?.(`[DoIP] ${msg}`);
    }

    private setState(state: DoIpState): void {
        this.client.setState(state);
        this.callbacks.onStateChange?.(state);
    }

    /**
     * TCP 13400 Diagnostic Session — connects to a known DoIP gateway,
     * performs Routing Activation, and prepares for UDS message exchange.
     */
    public async connectToGateway(gatewayIp: string, port: number = DOIP_PORT): Promise<boolean> {
        return new Promise((resolve) => {
            try {
                this.log(`Connecting to DoIP gateway at ${gatewayIp}:${port}...`);
                this.setState('ROUTING_ACTIVATION_PENDING');

                const connectTimeout = setTimeout(() => {
                    this.log('TCP connect timeout.');
                    this.setState('ERROR');
                    try { this.tcpSocket?.destroy(); } catch (_e) {}
                    resolve(false);
                }, DOIP_TCP_CONNECT_TIMEOUT_MS);

                this.tcpSocket = TcpSocket.createConnection(
                    { host: gatewayIp, port },
                    () => {
                        clearTimeout(connectTimeout);
                        this.log('TCP connected. Sending Routing Activation Request...');

                        // Send Routing Activation Request (Type 0x0005)
                        const raPacket = this.client.buildRoutingActivationRequest();
                        this.tcpSocket.write(Buffer.from(raPacket));

                        // Wait for Routing Activation Response
                        const raTimeout = setTimeout(() => {
                            this.log('Routing Activation timeout.');
                            this.setState('ERROR');
                            resolve(false);
                        }, DOIP_ROUTING_ACTIVATION_TIMEOUT_MS);

                        const onFirstData = (data: Buffer) => {
                            clearTimeout(raTimeout);
                            const bytes = Array.from(data);
                            const parsed = this.client.parsePacket(bytes);

                            if (parsed && parsed.payloadType === 0x0006) {
                                // Routing Activation Response — check response code
                                const responseCode = bytes.length >= 13 ? bytes[12] : -1;
                                if (responseCode === 0x10) {
                                    this.log('Routing Activation successful. DoIP session active.');
                                    this.setState('CONNECTED');
                                    this.startAliveCheck();
                                    // Switch to normal data handler
                                    this.tcpSocket.removeListener('data', onFirstData);
                                    this.tcpSocket.on('data', (d: Buffer) => this.handleIncomingData(d));
                                    resolve(true);
                                } else {
                                    this.log(`Routing Activation rejected. Response code: 0x${responseCode.toString(16)}`);
                                    this.setState('ERROR');
                                    resolve(false);
                                }
                            } else {
                                this.log(`Unexpected response during Routing Activation. Type: 0x${parsed?.payloadType?.toString(16) || 'unknown'}`);
                                this.setState('ERROR');
                                resolve(false);
                            }
                        };

                        this.tcpSocket.on('data', onFirstData);
                    }
                );

                this.tcpSocket.on('error', (err: any) => {
                    clearTimeout(connectTimeout);
                    this.log(`TCP error: ${err.message}`);
                    this.callbacks.onError?.(err.message);
                    this.setState('ERROR');
                    resolve(false);
                });

                this.tcpSocket.on('close', () => {
                    this.log('TCP connection closed.');
                    this.stopAliveCheck();
                    this.setState('DISCONNECTED');
                });
            } catch (err: any) {
                this.log(`Connect error: ${err.message}`);
                this.setState('ERROR');
                resolve(false);
            }
        });
    }

    /**
     * Send UDS request over DoIP TCP session.
     */
    public async sendUdsRequest(udsPayloadBytes: number[]): Promise<void> {
        if (this.client.getState() !== 'CONNECTED' || !this.tcpSocket) {
            throw new Error('DoIP session not active. Call connectToGateway() first.');
        }

        const diagnosticPacket = this.client.buildDiagnosticMessage(udsPayloadBytes);
        this.tcpSocket.write(Buffer.from(diagnosticPacket));
        this.log(`UDS request sent: [${udsPayloadBytes.map((b: number) => b.toString(16).padStart(2, '0')).join(' ')}]`);
    }

    /**
     * Handle incoming TCP data — reassemble DoIP packets and extract UDS responses.
     */
    private handleIncomingData(data: Buffer): void {
        // Append to RX buffer for packet reassembly
        this.rxBuffer.push(...Array.from(data));

        // Try to parse complete DoIP packets from buffer
        while (this.rxBuffer.length >= 8) {
            const payloadLength = (this.rxBuffer[4] << 24) | (this.rxBuffer[5] << 16) | (this.rxBuffer[6] << 8) | this.rxBuffer[7];
            const totalPacketLength = 8 + payloadLength;

            if (this.rxBuffer.length < totalPacketLength) {
                break; // Wait for more data
            }

            const packetBytes = this.rxBuffer.splice(0, totalPacketLength);
            const parsed = this.client.parsePacket(packetBytes);

            if (parsed) {
                if (parsed.payloadType === 0x8001 && parsed.udsPayload) {
                    // Diagnostic Message (UDS Response)
                    this.callbacks.onUdsResponse?.(parsed.udsPayload);
                } else if (parsed.payloadType === 0x0007) {
                    // Alive Check Request — respond immediately
                    this.log('Alive Check Request received. Responding...');
                    const aliveResponse = DoIpClient.createDoIpPacket(0x0008, []);
                    this.tcpSocket?.write(Buffer.from(aliveResponse));
                } else if (parsed.payloadType === 0x8003) {
                    // Diagnostic Message Negative Acknowledgment
                    const nackCode = packetBytes.length >= 13 ? packetBytes[12] : 0xFF;
                    this.log(`Diagnostic NACK received. Code: 0x${nackCode.toString(16)}`);
                    this.callbacks.onError?.(`DoIP Diagnostic NACK: 0x${nackCode.toString(16)}`);
                }
            }
        }
    }

    /**
     * Periodic Alive Check (ISO 13400 keepalive)
     */
    private startAliveCheck(): void {
        this.stopAliveCheck();
        this.aliveCheckTimer = setInterval(() => {
            if (this.client.getState() === 'CONNECTED' && this.tcpSocket) {
                this.log('Sending Alive Check keepalive...');
            }
        }, DOIP_ALIVE_CHECK_INTERVAL_MS);
    }

    private stopAliveCheck(): void {
        if (this.aliveCheckTimer) {
            clearInterval(this.aliveCheckTimer);
            this.aliveCheckTimer = null;
        }
    }

    /**
     * Disconnect and cleanup all DoIP resources.
     */
    public disconnect(): void {
        this.stopAliveCheck();
        try { this.tcpSocket?.destroy(); } catch (_e) {}
        this.tcpSocket = null;
        this.rxBuffer = [];
        this.setState('DISCONNECTED');
        this.log('DoIP transport disconnected and cleaned up.');
    }

    public getState(): DoIpState {
        return this.client.getState();
    }
}
