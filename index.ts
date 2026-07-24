import { registerRootComponent } from 'expo';
import { NativeModules } from 'react-native';

if (__DEV__) {
  try {
    const Inspector = require('react-native/Libraries/Inspector/Inspector');
    if (Inspector && typeof Inspector.isShown === 'function' && Inspector.isShown()) {
      if (NativeModules.DevSettings && typeof NativeModules.DevSettings.toggleElementInspector === 'function') {
        NativeModules.DevSettings.toggleElementInspector();
      }
    }
  } catch (e) {}
}

import App from './App';

registerRootComponent(App);
