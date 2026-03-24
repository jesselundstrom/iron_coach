import { getFatigueConfig, getMuscleLoadConfig } from './planning.js';

function createGetterBackedConstant(name, getter) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return name;
        const source = getter() || {};
        return source[prop];
      },
      has(_target, prop) {
        const source = getter() || {};
        return prop in source;
      },
      ownKeys() {
        const source = getter() || {};
        return Reflect.ownKeys(source);
      },
      getOwnPropertyDescriptor(_target, prop) {
        const source = getter() || {};
        if (!(prop in source)) return undefined;
        return {
          configurable: true,
          enumerable: true,
          value: source[prop],
          writable: false,
        };
      },
    }
  );
}

export const FATIGUE_CONFIG = createGetterBackedConstant(
  'FATIGUE_CONFIG',
  getFatigueConfig
);
export const MUSCLE_LOAD_CONFIG = createGetterBackedConstant(
  'MUSCLE_LOAD_CONFIG',
  getMuscleLoadConfig
);
