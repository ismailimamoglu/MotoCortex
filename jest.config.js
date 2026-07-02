module.exports = {
  roots: ['<rootDir>/src'],
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: [
    'android.ts',
    'ios.ts',
    'ts',
    'tsx',
    'android.js',
    'ios.js',
    'js',
    'jsx',
    'json',
    'node'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
  collectCoverageFrom: [
    'src/core/security/CommandClassificationRegistry.ts',
    'src/core/telemetry/TelemetryHealthCollector.ts',
    'src/utils/IapBridge.ts',
    'src/core/connection/ProtocolCircuitBreaker.ts',
    'src/core/queue/AdaptivePollingController.ts',
    'src/core/queue/CommandRateLimiter.ts',
    'src/core/queue/CommandScheduler.ts',
    'src/core/parser/BLEMultiFrameAssembler.ts',
    'src/core/parser/ELMParser.ts',
    'src/core/parser/FlowControlManager.ts',
    'src/core/parser/ISOTPDecoder.ts',
    'src/core/parser/KWPFrameDecoder.ts',
    'src/core/transport/TransportRateLimiter.ts',
  ],
};
