import { useEffect, useMemo, useRef, useState } from 'react';
import { useRuntimeStore } from '../app/store/runtime-store.ts';
import { saveSchedule } from '../app/services/settings-actions.ts';

type SettingsScheduleLabels = {
  statusBar: string;
  title: string;
  subtitle: string;
  activitySection: string;
  activitySectionSub: string;
  activityName: string;
  activityPlaceholder: string;
  profileSection: string;
  profileSectionSub: string;
  intensityLabel: string;
  intensityEasy: string;
  intensityModerate: string;
  intensityHard: string;
  legHeavy: string;
  legHeavySub: string;
  regularSportDays: string;
};

type SportIntensity = 'easy' | 'moderate' | 'hard';

type SettingsScheduleValues = {
  sportName: string;
  sportIntensity: SportIntensity;
  sportLegsHeavy: boolean;
  sportDays: number[];
  dayNames: string[];
};

type SettingsScheduleFormValues = Omit<SettingsScheduleValues, 'dayNames'>;

type SettingsScheduleSnapshot = {
  labels: SettingsScheduleLabels;
  values: SettingsScheduleValues;
};

function getSnapshot(): SettingsScheduleSnapshot {
  return {
    labels: {
      statusBar: '',
      title: 'My Sport',
      subtitle: 'Set the sport or cardio that most affects your training week.',
      activitySection: 'Sport',
      activitySectionSub:
        'Name the recurring sport or cardio that affects your training week.',
      activityName: 'Activity name',
      activityPlaceholder: 'e.g. Hockey, Soccer, Running',
      profileSection: 'Load profile',
      profileSectionSub:
        'Shape how strongly sport load should push training away from hard lower-body work.',
      intensityLabel: 'Intensity',
      intensityEasy: 'Easy',
      intensityModerate: 'Moderate',
      intensityHard: 'Hard',
      legHeavy: 'Leg-heavy',
      legHeavySub: 'Warns when scheduling legs after sport',
      regularSportDays: 'Regular Sport Days',
    },
    values: {
      sportName: '',
      sportIntensity: 'hard',
      sportLegsHeavy: true,
      sportDays: [],
      dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
  };
}

function toSportIntensity(value: unknown): SportIntensity {
  return value === 'easy' || value === 'moderate' || value === 'hard'
    ? value
    : 'hard';
}

function toScheduleSnapshot(input: unknown): SettingsScheduleSnapshot {
  const fallback = getSnapshot();
  if (!input || typeof input !== 'object') return fallback;
  const candidate = input as {
    labels?: Partial<SettingsScheduleLabels>;
    values?: Partial<SettingsScheduleValues>;
  };
  const values = candidate.values || {};
  return {
    labels: {
      ...fallback.labels,
      ...(candidate.labels || {}),
    },
    values: {
      ...fallback.values,
      ...values,
      sportIntensity: toSportIntensity(values.sportIntensity),
      sportDays: Array.isArray(values.sportDays)
        ? values.sportDays.map(Number).filter(Number.isFinite)
        : fallback.values.sportDays,
      dayNames: Array.isArray(values.dayNames)
        ? values.dayNames.map((day) => String(day || ''))
        : fallback.values.dayNames,
    },
  };
}

function getFormValues(
  snapshot: SettingsScheduleSnapshot
): SettingsScheduleFormValues {
  return {
    sportName: snapshot.values.sportName ?? '',
    sportIntensity: snapshot.values.sportIntensity ?? 'hard',
    sportLegsHeavy: snapshot.values.sportLegsHeavy !== false,
    sportDays: Array.isArray(snapshot.values.sportDays) ? [...snapshot.values.sportDays] : [],
  };
}

function SettingsScheduleIsland() {
  const rawSnapshot = useRuntimeStore((state) => state.pages.settingsScheduleView);
  const snapshot = useMemo(
    () => toScheduleSnapshot(rawSnapshot),
    [rawSnapshot]
  );
  const [formValues, setFormValues] = useState(() => getFormValues(snapshot));
  const sportNameSaveTimerRef = useRef<number | null>(null);
  const latestSportNameRef = useRef(formValues.sportName);
  const lastSavedSportNameRef = useRef(formValues.sportName);
  const pendingSportNameRef = useRef<string | null>(null);

  useEffect(() => {
    const nextFormValues = getFormValues(snapshot);
    if (
      typeof pendingSportNameRef.current === 'string' &&
      nextFormValues.sportName !== pendingSportNameRef.current
    ) {
      nextFormValues.sportName = pendingSportNameRef.current;
    } else if (
      typeof pendingSportNameRef.current === 'string' &&
      nextFormValues.sportName === pendingSportNameRef.current
    ) {
      pendingSportNameRef.current = null;
    }
    if (sportNameSaveTimerRef.current !== null) {
      window.clearTimeout(sportNameSaveTimerRef.current);
    }
    latestSportNameRef.current = nextFormValues.sportName;
    lastSavedSportNameRef.current = nextFormValues.sportName;
    setFormValues((current) => ({
      ...current,
      ...nextFormValues,
    }));
  }, [snapshot]);

  const labels = snapshot.labels;

  function updateField<K extends keyof SettingsScheduleFormValues>(
    key: K,
    value: SettingsScheduleFormValues[K]
  ) {
    if (key === 'sportName') latestSportNameRef.current = String(value);
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function savePartial(nextValues: Partial<SettingsScheduleFormValues>) {
    saveSchedule(nextValues);
  }

  function flushSportName(nextValue?: string) {
    const resolvedValue =
      typeof nextValue === 'string' ? nextValue : latestSportNameRef.current;
    if (sportNameSaveTimerRef.current !== null) {
      window.clearTimeout(sportNameSaveTimerRef.current);
      sportNameSaveTimerRef.current = null;
    }
    if (resolvedValue === lastSavedSportNameRef.current) return;
    lastSavedSportNameRef.current = resolvedValue;
    pendingSportNameRef.current = resolvedValue;
    savePartial({ sportName: resolvedValue });
  }

  useEffect(() => {
    latestSportNameRef.current = formValues.sportName;
    if (formValues.sportName === lastSavedSportNameRef.current) return;
    sportNameSaveTimerRef.current = window.setTimeout(() => {
      flushSportName(formValues.sportName);
    }, 350);
    return () => {
      if (sportNameSaveTimerRef.current !== null) {
        window.clearTimeout(sportNameSaveTimerRef.current);
        sportNameSaveTimerRef.current = null;
      }
    };
  }, [formValues.sportName]);

  useEffect(
    () => () => {
      flushSportName();
    },
    []
  );

  useEffect(() => {
    const flushOnVisibilityChange = () => {
      if (document.hidden) flushSportName();
    };
    const flushOnPageHide = () => {
      flushSportName();
    };
    document.addEventListener('visibilitychange', flushOnVisibilityChange);
    window.addEventListener('pagehide', flushOnPageHide);
    return () => {
      document.removeEventListener('visibilitychange', flushOnVisibilityChange);
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, []);

  return (
    <>
      <div className="settings-status-bar" id="sport-status-bar">
        {labels.statusBar}
      </div>
      <div className="card sport-load-card">
        <div className="card-title">{labels.title}</div>
        <div className="sport-load-intro">{labels.subtitle}</div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">{labels.activitySection}</div>
          <div className="settings-subsection-sub">{labels.activitySectionSub}</div>
          <label htmlFor="sport-name">{labels.activityName}</label>
          <input
            id="sport-name"
            type="text"
            placeholder={labels.activityPlaceholder}
            value={formValues.sportName}
            onChange={(event) => updateField('sportName', event.target.value)}
            onBlur={(event) => flushSportName(event.target.value)}
          />
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-title">{labels.profileSection}</div>
          <div className="settings-subsection-sub">{labels.profileSectionSub}</div>
          <label>{labels.intensityLabel}</label>
          <div className="segment-control segment-control-equal" id="sport-intensity-btns">
            {[
              ['easy', labels.intensityEasy] as const,
              ['moderate', labels.intensityModerate] as const,
              ['hard', labels.intensityHard] as const,
            ].map(([value, label]) => (
              <button
                key={value}
                className={`btn btn-secondary sport-intensity-btn${
                  formValues.sportIntensity === value ? ' active' : ''
                }`}
                type="button"
                data-intensity={value}
                onClick={() => {
                  updateField('sportIntensity', value);
                  savePartial({ sportIntensity: value });
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="toggle-row" htmlFor="sport-legs-heavy">
            <div>
              <div className="toggle-row-title">{labels.legHeavy}</div>
              <div className="toggle-row-sub">{labels.legHeavySub}</div>
            </div>
            <div className="toggle-switch warning-toggle">
              <input
                type="checkbox"
                id="sport-legs-heavy"
                checked={formValues.sportLegsHeavy}
                onChange={(event) => {
                  updateField('sportLegsHeavy', event.target.checked);
                  savePartial({ sportLegsHeavy: event.target.checked });
                }}
              />
              <span className="toggle-track">
                <span className="toggle-thumb"></span>
              </span>
            </div>
          </label>

          <div className="settings-inline-label">{labels.regularSportDays}</div>
          <div className="day-toggle-grid" id="sport-day-toggles">
            {snapshot.values.dayNames.map((dayLabel, index) => {
              const dow = (index + 1) % 7;
              const active = formValues.sportDays.includes(dow);
              return (
                <button
                  key={dow}
                  type="button"
                  className={`day-toggle${active ? ' sport-day' : ''}`}
                  onClick={() => {
                    const nextDays = active
                      ? formValues.sportDays.filter((day) => day !== dow)
                      : [...formValues.sportDays, dow];
                    updateField('sportDays', nextDays);
                    savePartial({ sportDays: nextDays });
                  }}
                >
                  {dayLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export { SettingsScheduleIsland };
