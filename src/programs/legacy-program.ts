import type { ProgramPlugin } from '../domain/program-plugin';

type AnyProgramPlugin = ProgramPlugin<Record<string, unknown>>;

type LegacyProgramWindow = Window & {
  PROGRAMS?: Record<string, AnyProgramPlugin>;
  getProgramById?: (programId?: string | null) => AnyProgramPlugin | null;
};

type LegacyProgramSeed = Pick<
  AnyProgramPlugin,
  'id' | 'name' | 'description' | 'icon'
> & {
  legLifts?: string[];
};

function cloneJson<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function getLegacyProgramWindow(): LegacyProgramWindow | null {
  if (typeof window === 'undefined') return null;
  return window as LegacyProgramWindow;
}

function getLegacyProgram(programId: string) {
  const runtimeWindow = getLegacyProgramWindow();
  return (
    runtimeWindow?.getProgramById?.(programId) ||
    runtimeWindow?.PROGRAMS?.[programId] ||
    null
  );
}

export function createLegacyProgramAdapter(seed: LegacyProgramSeed): AnyProgramPlugin {
  const base: AnyProgramPlugin = {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    icon: seed.icon,
    legLifts: [...(seed.legLifts || [])],
    getInitialState: () => {
      const legacy = getLegacyProgram(seed.id);
      if (typeof legacy?.getInitialState !== 'function') return {};
      return cloneJson(legacy.getInitialState() || {});
    },
  };

  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      const legacy = getLegacyProgram(seed.id);
      const value = legacy?.[prop as keyof AnyProgramPlugin];
      return typeof value === 'function' ? value.bind(legacy) : value;
    },
    has(target, prop) {
      if (prop in target) return true;
      const legacy = getLegacyProgram(seed.id);
      return !!legacy && prop in legacy;
    },
    ownKeys(target) {
      const legacy = getLegacyProgram(seed.id);
      return [...new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(legacy || {})])];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop in target) {
        return Reflect.getOwnPropertyDescriptor(target, prop);
      }
      const legacy = getLegacyProgram(seed.id);
      if (!legacy || !(prop in legacy)) return undefined;
      return {
        configurable: true,
        enumerable: true,
        value: legacy[prop as keyof AnyProgramPlugin],
        writable: false,
      };
    },
  });
}
