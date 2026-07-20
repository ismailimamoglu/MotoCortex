// scratch/test_error.js
const { OBD2ProtocolEngine } = require('../../src/api/OBD2ProtocolEngine');
const { useBluetoothStore } = require('../../src/store/useBluetoothStore');
const { useAppStore } = require('../../src/store/useAppStore');
const BluetoothService = require('../../src/api/BluetoothService').default;

let mockRegisteredCallback = null;
jest.mock('../../src/api/BluetoothService', () => {
    return {
        __esModule: true,
        default: {
            onDataReceived: (cb) => {
                mockRegisteredCallback = cb;
            },
            write: () => {
                setTimeout(() => {
                    if (mockRegisteredCallback) {
                        mockRegisteredCallback('?\r\n>');
                    }
                }, 0);
                return Promise.resolve(true);
            },
            clearBuffer: () => {}
        }
    };
});

// Since we are running in normal node, let's just mock what we need
console.log("Mocking finished");
