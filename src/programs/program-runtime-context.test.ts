import { describe, expect, it } from 'vitest';

import { forgeProgram } from './forge';
import { wendler531Program } from './wendler531';

describe('typed program runtime context', () => {
  it('lets Forge use explicit runtime days-per-week for options and progression', () => {
    const program = forgeProgram as Record<string, any>;
    const state = program.getInitialState();

    const twoDayOptions = program.getSessionOptions?.(
      state,
      [],
      {},
      {
        programRuntime: {
          daysPerWeek: 2,
          weekStartDate: '2026-04-06T00:00:00.000Z',
        },
      }
    );
    const fourDayOptions = program.getSessionOptions?.(
      state,
      [],
      {},
      {
        programRuntime: {
          daysPerWeek: 4,
          weekStartDate: '2026-04-06T00:00:00.000Z',
        },
      }
    );
    const unchanged = program.advanceState?.(state, 2);
    const advanced = program.advanceState?.(state, 2, {
      programRuntime: {
        daysPerWeek: 2,
      },
    });

    expect(twoDayOptions).toHaveLength(2);
    expect(fourDayOptions).toHaveLength(4);
    expect(unchanged?.week).toBe(1);
    expect(advanced?.week).toBe(2);
  });

  it('lets Wendler use explicit runtime readiness and frequency without ambient globals', () => {
    const program = wendler531Program as Record<string, any>;
    const state = program.getInitialState();

    const fullSession = program.buildSession?.('1', state, {
      programRuntime: {
        daysPerWeek: 4,
        sessionReadiness: 'default',
      },
    });
    const liftsOnlySession = program.buildSession?.('1', state, {
      programRuntime: {
        daysPerWeek: 4,
        sessionReadiness: 'none',
      },
    });
    const lightRecommendation = program.getSessionModeRecommendation?.(
      state,
      {
        programRuntime: {
          sessionReadiness: 'none',
        },
      }
    );
    const advanced = program.advanceState?.(state, 0, {
      programRuntime: {
        daysPerWeek: 3,
      },
    });

    expect(fullSession?.length).toBeGreaterThan(1);
    expect(liftsOnlySession).toHaveLength(1);
    expect(lightRecommendation).toBe('light');
    expect(advanced?.weekSessionIndex).toBe(1);
  });
});
