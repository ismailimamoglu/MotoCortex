import { useState, useCallback, useRef } from 'react';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { TransportAdapter } from '../core/transport/TransportAdapter';
import * as Logger from '../services/Logger';

export class WifiTransport implements TransportAdapter {
  private socket: any = null;
  private dataCallback: ((data: string) => void) | null = null;
  private isConnectedDevice = false;

  async connect(address: string): Promise<boolean> {
    const parts = address.split(':');
    const ip = parts[0] || '192.168.0.10';
    const port = parts[1] ? parseInt(parts[1], 10) : 35000;
    
    Logger.log('WIFI_CONNECT', `Connecting to TCP socket ${ip}:${port}`);
    
    try {
      let TcpSocket: any;
      try {
        TcpSocket = require('react-native-tcp-socket');
      } catch (e) {
        Logger.log('WIFI_WARN', 'react-native-tcp-socket not found, using simulation mode.');
        this.isConnectedDevice = true;
        this.startSimulatedResponse();
        return true;
      }

      return new Promise((resolve) => {
        this.socket = TcpSocket.createConnection(
          { port, host: ip, localAddress: '127.0.0.1', reuseAddress: true },
          () => {
            this.isConnectedDevice = true;
            Logger.log('WIFI_CONNECTED', 'TCP Socket connected successfully.');
            resolve(true);
          }
        );

        this.socket.on('data', (data: any) => {
          const str = data.toString('utf8');
          Logger.log('WIFI_READ', str);
          if (this.dataCallback) {
            this.dataCallback(str);
          }
        });

        this.socket.on('error', (error: any) => {
          Logger.log('WIFI_ERROR', error.message);
          this.disconnect();
          resolve(false);
        });

        this.socket.on('close', () => {
          Logger.log('WIFI_CLOSED', 'Socket closed');
          this.disconnect();
        });
      });
    } catch (err) {
      console.error('[WifiTransport] Connection failed:', err);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnectedDevice = false;
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch (e) {}
      this.socket = null;
    }
  }

  async write(data: string): Promise<void> {
    const cleanCmd = data.replace(/[\r\n]/g, '').trim();
    if (cleanCmd.length > 0) {
      const { assertHardwareGate } = require('../core/security/CommandClassificationRegistry');
      const { useAppStore } = require('../store/useAppStore');
      const { useBluetoothStore } = require('../store/useBluetoothStore');
      const isPro = useAppStore.getState().isPro;
      const btState = useBluetoothStore.getState();
      const isMoving = (btState.speed ?? 0) > 0 || (btState.rpm ?? 0) > 0;
      assertHardwareGate(cleanCmd, isPro, isMoving);
    }

    const command = data.endsWith('\r') ? data : data + '\r';
    Logger.log('WIFI_WRITE', command);

    if (this.socket) {
      this.socket.write(command, 'utf8');
    } else if (this.isConnectedDevice) {
      this.simulateCommandResponse(command);
    } else {
      throw new Error('WifiTransport: Not connected');
    }
  }

  onDataReceived(callback: (data: string) => void): void {
    this.dataCallback = callback;
  }

  private startSimulatedResponse() {
    // Warm start response timer
  }

  private simulateCommandResponse(command: string) {
    const cleanCmd = command.trim().toUpperCase();
    let response = '?';
    
    if (cleanCmd === 'ATZ' || cleanCmd === 'ATI') {
      response = 'ELM327 v1.5\r';
    } else if (cleanCmd.startsWith('AT')) {
      response = 'OK\r';
    } else if (cleanCmd === '01 0C') {
      const rpm = Math.round(800 + Math.random() * 200);
      const rpmA = Math.floor((rpm * 4) / 256).toString(16).toUpperCase().padStart(2, '0');
      const rpmB = Math.floor((rpm * 4) % 256).toString(16).toUpperCase().padStart(2, '0');
      response = `41 0C ${rpmA} ${rpmB}\r`;
    } else if (cleanCmd === '01 0D') {
      response = '41 0D 3C\r'; // 60 km/h
    }
    
    setTimeout(() => {
      if (this.dataCallback) {
        this.dataCallback(response + '>');
      }
    }, 40);
  }
}

export const useWifiTransport = () => {
  const [wifiIp, setWifiIp] = useState('192.168.0.10');
  const [wifiPort, setWifiPort] = useState(35000);
  const wifiTransportRef = useRef<WifiTransport | null>(null);

  const getWifiTransport = useCallback(() => {
    if (!wifiTransportRef.current) {
      wifiTransportRef.current = new WifiTransport();
    }
    return wifiTransportRef.current;
  }, []);

  const connectWifi = useCallback(async (ip: string = '192.168.0.10', port: number = 35000) => {
    setWifiIp(ip);
    setWifiPort(port);
    const store = useBluetoothStore.getState();
    store.setSensorData({ connectionType: 'WIFI', deviceName: 'Wifi-OBDII', deviceId: `${ip}:${port}` });
    
    const transport = getWifiTransport();
    const success = await transport.connect(`${ip}:${port}`);
    if (success) {
      store.setSensorData({ status: 'connected', adapterStatus: 'connected' });
    } else {
      store.setSensorData({ status: 'error', adapterStatus: 'error' });
    }
    return success;
  }, [getWifiTransport]);

  const disconnectWifi = useCallback(async () => {
    const transport = getWifiTransport();
    await transport.disconnect();
    const store = useBluetoothStore.getState();
    store.reset();
  }, [getWifiTransport]);

  return {
    wifiIp,
    wifiPort,
    connectWifi,
    disconnectWifi,
    getWifiTransport,
  };
};
