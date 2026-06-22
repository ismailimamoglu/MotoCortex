const { TransportRateLimiter } = require('../src/core/transport/TransportRateLimiter');
const { useBluetoothStore } = require('../src/store/useBluetoothStore');

console.log("Starting test...");
useBluetoothStore.getState().adapterCapabilityScore = 50;
useBluetoothStore.getState().isCloneDevice = true;

TransportRateLimiter.initialize();

const promises = [];
for (let i = 0; i < 4; i++) {
    console.log(`Acquiring token ${i}...`);
    promises.push(TransportRateLimiter.acquireToken());
}

Promise.all(promises).then(() => {
    console.log("First 4 tokens acquired successfully!");
    
    console.log("Acquiring 5th token (should block)...");
    TransportRateLimiter.acquireToken().then(() => {
        console.log("5th token acquired!");
        TransportRateLimiter.cleanup();
        process.exit(0);
    });
});
