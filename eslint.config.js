// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // React Native's Animated API reads ref-held values (Animated.Value) during
      // render by design (e.g. `.interpolate()`, `transform: [{ scale }]`). The new
      // React 19.2 compiler rules flag this as a false positive, so we disable them
      // for the RN Animated patterns used across the app.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
