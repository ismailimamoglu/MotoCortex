module.exports = {
  preset: 'react-native',
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
      statements: 85,
      branches: 80,
      functions: 90,
    },
  },
};
