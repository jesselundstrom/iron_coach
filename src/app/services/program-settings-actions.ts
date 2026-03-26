import { callLegacyWindowFunction } from './legacy-call';

type ProgramSettingsInlineEvent = {
  target?: {
    checked?: boolean;
  } | null;
} | null;

function readCheckedValue(event?: ProgramSettingsInlineEvent) {
  return event?.target?.checked === true;
}

function runAllowedLegacyCall(
  code: string,
  event?: ProgramSettingsInlineEvent
) {
  const checked = readCheckedValue(event);
  const patterns: Array<{
    matcher: RegExp;
    execute: (match: RegExpMatchArray) => void;
  }> = [
    {
      matcher: /^window\._forgePickMain\('([^']+)',(\d+)\)$/,
      execute: (match) => {
        callLegacyWindowFunction('_forgePickMain', match[1], Number(match[2]));
      },
    },
    {
      matcher: /^window\._forgePickBack\('([^']+)'\)$/,
      execute: (match) => {
        callLegacyWindowFunction('_forgePickBack', match[1]);
      },
    },
    {
      matcher: /^window\._slPickAccessory\('([^']+)','([^']+)'\)$/,
      execute: (match) => {
        callLegacyWindowFunction('_slPickAccessory', match[1], match[2]);
      },
    },
    {
      matcher: /^window\._slSetNextWorkoutBasic\('([AB])'\)$/,
      execute: (match) => {
        callLegacyWindowFunction('_slSetNextWorkoutBasic', match[1]);
      },
    },
    {
      matcher: /^window\._slToggleAccessoryConfig\('([^']+)',this\.checked\)$/,
      execute: (match) => {
        callLegacyWindowFunction('_slToggleAccessoryConfig', match[1], checked);
      },
    },
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern.matcher);
    if (!match) continue;
    pattern.execute(match);
    return true;
  }

  return false;
}

export function runProgramSettingsInlineAction(
  code?: string | null,
  event?: ProgramSettingsInlineEvent
) {
  const normalizedCode = String(code || '').trim();
  if (!normalizedCode) return true;
  return runAllowedLegacyCall(normalizedCode, event);
}
