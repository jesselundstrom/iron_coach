import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRuntimeStore } from '../app/store/runtime-store.ts';
import {
  restartOnboarding,
  saveRestTimer,
  saveTrainingPreferences,
} from '../app/services/settings-actions.ts';

type SettingsPreferencesLabels = {
  statusBar: string;
  title: string;
  help: string;
  goalsSection: string;
  goalLabel: string;
  goalStrength: string;
  goalHypertrophy: string;
  goalGeneralFitness: string;
  goalSportSupport: string;
  trainingDaysLabel: string;
  trainingDays2: string;
  trainingDays3: string;
  trainingDays4: string;
  trainingDays5: string;
  trainingDays6: string;
  sessionDurationLabel: string;
  duration30: string;
  duration45: string;
  duration60: string;
  duration75: string;
  duration90: string;
  equipmentSection: string;
  equipmentLabel: string;
  equipmentFullGym: string;
  equipmentBasicGym: string;
  equipmentHomeGym: string;
  equipmentMinimal: string;
  warmupTitle: string;
  warmupHelp: string;
  sportCheckTitle: string;
  sportCheckHelp: string;
  detailedViewTitle: string;
  detailedViewHelp: string;
  sessionSection: string;
  restLabel: string;
  off: string;
  notesLabel: string;
  notesPlaceholder: string;
  restartOnboarding: string;
};

type SettingsPreferencesValues = {
  summary: string;
  goal: string;
  trainingDaysPerWeek: string;
  sessionMinutes: string;
  equipmentAccess: string;
  warmupSetsEnabled: boolean;
  sportReadinessCheckEnabled: boolean;
  detailedView: boolean;
  defaultRest: string;
  notes: string;
};

type SettingsPreferencesSnapshot = {
  labels: SettingsPreferencesLabels;
  values: SettingsPreferencesValues;
};

type PreferencesField = keyof Omit<SettingsPreferencesValues, 'summary'>;

function getSnapshot(): SettingsPreferencesSnapshot {
  return {
    labels: {
      statusBar: '',
      title: 'Training Preferences',
      help: 'These preferences shape future smart recommendations and AI-generated training.',
      goalsSection: 'Goals & Volume',
      goalLabel: 'Primary Goal',
      goalStrength: 'Strength',
      goalHypertrophy: 'Hypertrophy',
      goalGeneralFitness: 'General Fitness',
      goalSportSupport: 'Sport Support',
      trainingDaysLabel: 'Target Training Frequency',
      trainingDays2: '2 sessions / week',
      trainingDays3: '3 sessions / week',
      trainingDays4: '4 sessions / week',
      trainingDays5: '5 sessions / week',
      trainingDays6: '6 sessions / week',
      sessionDurationLabel: 'Target Session Length',
      duration30: '30 min',
      duration45: '45 min',
      duration60: '60 min',
      duration75: '75 min',
      duration90: '90 min',
      equipmentSection: 'Equipment & Session Prep',
      equipmentLabel: 'Equipment Access',
      equipmentFullGym: 'Full Gym',
      equipmentBasicGym: 'Basic Gym',
      equipmentHomeGym: 'Home Gym',
      equipmentMinimal: 'Minimal Equipment',
      warmupTitle: 'Automatic warm-up sets',
      warmupHelp:
        'Prepend warm-up ramp sets (50%-85%) to main compound lifts at the start of each workout.',
      sportCheckTitle: 'Pre-workout sport check-in',
      sportCheckHelp:
        'Ask about sport load around today before recommending the session.',
      detailedViewTitle: 'Show detailed metrics',
      detailedViewHelp:
        'Show advanced stats like individual fatigue gauges and training maxes on the dashboard.',
      sessionSection: 'Session Settings',
      restLabel: 'Default Rest Timer',
      off: 'Off',
      notesLabel: 'Notes, limitations, preferences',
      notesPlaceholder:
        'e.g. Avoid high-impact jumps, prefer barbell compounds, 60 min cap',
      restartOnboarding: 'Run Guided Setup Again',
    },
    values: {
      summary: '',
      goal: 'strength',
      trainingDaysPerWeek: '3',
      sessionMinutes: '60',
      equipmentAccess: 'full_gym',
      warmupSetsEnabled: true,
      sportReadinessCheckEnabled: true,
      detailedView: false,
      defaultRest: '120',
      notes: '',
    },
  };
}

function toPreferencesSnapshot(input: unknown): SettingsPreferencesSnapshot {
  const fallback = getSnapshot();
  if (!input || typeof input !== 'object') return fallback;
  const candidate = input as {
    labels?: Partial<SettingsPreferencesLabels>;
    values?: Partial<SettingsPreferencesValues>;
  };
  return {
    labels: {
      ...fallback.labels,
      ...(candidate.labels || {}),
    },
    values: {
      ...fallback.values,
      ...(candidate.values || {}),
      warmupSetsEnabled: candidate.values?.warmupSetsEnabled === true,
      sportReadinessCheckEnabled:
        candidate.values?.sportReadinessCheckEnabled === true,
      detailedView: candidate.values?.detailedView === true,
    },
  };
}

function getFormValues(
  snapshot: SettingsPreferencesSnapshot
): Omit<SettingsPreferencesValues, 'summary'> {
  return {
    goal: snapshot.values.goal ?? 'strength',
    trainingDaysPerWeek: snapshot.values.trainingDaysPerWeek ?? '3',
    sessionMinutes: snapshot.values.sessionMinutes ?? '60',
    equipmentAccess: snapshot.values.equipmentAccess ?? 'full_gym',
    warmupSetsEnabled: snapshot.values.warmupSetsEnabled === true,
    sportReadinessCheckEnabled: snapshot.values.sportReadinessCheckEnabled === true,
    detailedView: snapshot.values.detailedView === true,
    defaultRest: snapshot.values.defaultRest ?? '120',
    notes: snapshot.values.notes ?? '',
  };
}

function SettingsPreferencesIsland() {
  const rawSnapshot = useRuntimeStore(
    (state) => state.pages.settingsPreferencesView
  );
  const snapshot = useMemo(
    () => toPreferencesSnapshot(rawSnapshot),
    [rawSnapshot]
  );
  const [formValues, setFormValues] = useState(() => getFormValues(snapshot));
  const pendingToggleOverridesRef = useRef<{
    warmupSetsEnabled: boolean | null;
    sportReadinessCheckEnabled: boolean | null;
  }>({
    warmupSetsEnabled: null,
    sportReadinessCheckEnabled: null,
  });

  useEffect(() => {
    const nextFormValues = getFormValues(snapshot);
    setFormValues((current) => {
      const next = { ...nextFormValues };

      (
        ['warmupSetsEnabled', 'sportReadinessCheckEnabled'] as const
      ).forEach((key) => {
        const pendingValue = pendingToggleOverridesRef.current[key];
        if (typeof pendingValue !== 'boolean') return;
        if (next[key] === pendingValue) {
          pendingToggleOverridesRef.current[key] = null;
          return;
        }
        next[key] = current[key];
      });

      return next;
    });
  }, [snapshot]);

  const labels = snapshot.labels;

  function updateField<K extends PreferencesField>(
    key: K,
    value: Omit<SettingsPreferencesValues, 'summary'>[K]
  ) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function getCheckboxValue(id: string, fallbackValue: boolean) {
    const input = document.getElementById(id);
    return input instanceof HTMLInputElement ? input.checked : fallbackValue;
  }

  function saveWarmupSetsEnabled(nextValue: boolean) {
    pendingToggleOverridesRef.current.warmupSetsEnabled = nextValue;
    updateField('warmupSetsEnabled', nextValue);
    saveTrainingPreferences({
      warmupSetsEnabledOverride: nextValue,
      sportReadinessCheckEnabledOverride: getCheckboxValue(
        'training-sport-check',
        formValues.sportReadinessCheckEnabled
      ),
    });
  }

  function saveSportReadinessCheckEnabled(nextValue: boolean) {
    pendingToggleOverridesRef.current.sportReadinessCheckEnabled = nextValue;
    updateField('sportReadinessCheckEnabled', nextValue);
    saveTrainingPreferences({
      warmupSetsEnabledOverride: getCheckboxValue(
        'training-warmup-sets',
        formValues.warmupSetsEnabled
      ),
      sportReadinessCheckEnabledOverride: nextValue,
    });
  }

  function isCheckboxInputTarget(target: EventTarget) {
    return target instanceof HTMLInputElement;
  }

  function handleToggleLabelClick(
    event: MouseEvent<HTMLLabelElement>,
    action: () => void
  ) {
    if (isCheckboxInputTarget(event.target)) return;
    event.preventDefault();
    action();
  }

  return (
    <>
      <div className="settings-status-bar" id="training-status-bar">
        {snapshot.values.summary || labels.statusBar}
      </div>
      <details className="settings-panel" id="training-preferences-panel" open>
        <summary className="settings-panel-summary">
          <div>
            <div className="settings-panel-title">{labels.title}</div>
            <div className="settings-panel-sub" id="training-preferences-summary">
              {snapshot.values.summary}
            </div>
          </div>
          <div className="settings-panel-chevron">⌄</div>
        </summary>
        <div className="settings-panel-body">
          <div className="settings-help-text">{labels.help}</div>

          <div className="settings-subsection">
            <div className="settings-subsection-title">{labels.goalsSection}</div>
            <label htmlFor="training-goal">{labels.goalLabel}</label>
            <select
              id="training-goal"
              value={formValues.goal}
              onChange={(event) => {
                updateField('goal', event.target.value);
                saveTrainingPreferences();
              }}
            >
              <option value="strength">{labels.goalStrength}</option>
              <option value="hypertrophy">{labels.goalHypertrophy}</option>
              <option value="general_fitness">{labels.goalGeneralFitness}</option>
              <option value="sport_support">{labels.goalSportSupport}</option>
            </select>

            <label className="label-spaced" htmlFor="training-days-per-week">
              {labels.trainingDaysLabel}
            </label>
            <select
              id="training-days-per-week"
              value={formValues.trainingDaysPerWeek}
              onChange={(event) => {
                updateField('trainingDaysPerWeek', event.target.value);
                saveTrainingPreferences();
              }}
            >
              <option value="2">{labels.trainingDays2}</option>
              <option value="3">{labels.trainingDays3}</option>
              <option value="4">{labels.trainingDays4}</option>
              <option value="5">{labels.trainingDays5}</option>
              <option value="6">{labels.trainingDays6}</option>
            </select>

            <label className="label-spaced" htmlFor="training-session-minutes">
              {labels.sessionDurationLabel}
            </label>
            <select
              id="training-session-minutes"
              value={formValues.sessionMinutes}
              onChange={(event) => {
                updateField('sessionMinutes', event.target.value);
                saveTrainingPreferences();
              }}
            >
              <option value="30">{labels.duration30}</option>
              <option value="45">{labels.duration45}</option>
              <option value="60">{labels.duration60}</option>
              <option value="75">{labels.duration75}</option>
              <option value="90">{labels.duration90}</option>
            </select>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-title">{labels.equipmentSection}</div>
            <label htmlFor="training-equipment">{labels.equipmentLabel}</label>
            <select
              id="training-equipment"
              value={formValues.equipmentAccess}
              onChange={(event) => {
                updateField('equipmentAccess', event.target.value);
                saveTrainingPreferences();
              }}
            >
              <option value="full_gym">{labels.equipmentFullGym}</option>
              <option value="basic_gym">{labels.equipmentBasicGym}</option>
              <option value="home_gym">{labels.equipmentHomeGym}</option>
              <option value="minimal">{labels.equipmentMinimal}</option>
            </select>

            <label
              className="toggle-row toggle-row-spaced"
              htmlFor="training-warmup-sets"
              onClick={(event) =>
                handleToggleLabelClick(event, () =>
                  saveWarmupSetsEnabled(!formValues.warmupSetsEnabled)
                )
              }
            >
              <div>
                <div className="toggle-row-title">{labels.warmupTitle}</div>
                <div className="toggle-row-sub">{labels.warmupHelp}</div>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="training-warmup-sets"
                  checked={formValues.warmupSetsEnabled}
                  onChange={(event) => {
                    saveWarmupSetsEnabled(event.target.checked);
                  }}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb"></span>
                </span>
              </div>
            </label>

            <label
              className="toggle-row"
              htmlFor="training-sport-check"
              onClick={(event) =>
                handleToggleLabelClick(event, () =>
                  saveSportReadinessCheckEnabled(
                    !formValues.sportReadinessCheckEnabled
                  )
                )
              }
            >
              <div>
                <div className="toggle-row-title">{labels.sportCheckTitle}</div>
                <div className="toggle-row-sub">{labels.sportCheckHelp}</div>
              </div>
              <div className="toggle-switch sport-toggle">
                <input
                  type="checkbox"
                  id="training-sport-check"
                  checked={formValues.sportReadinessCheckEnabled}
                  onChange={(event) => {
                    saveSportReadinessCheckEnabled(event.target.checked);
                  }}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb"></span>
                </span>
              </div>
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-title">{labels.sessionSection}</div>

            <label className="toggle-row" htmlFor="training-detailed-view" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <div>
                <div className="toggle-row-title">{labels.detailedViewTitle || 'Show detailed metrics'}</div>
                <div className="toggle-row-sub">{labels.detailedViewHelp || 'Show advanced stats like individual fatigue gauges and training maxes on the dashboard.'}</div>
              </div>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="training-detailed-view"
                  checked={formValues.detailedView}
                  onChange={(event) => {
                    updateField('detailedView', event.target.checked);
                    saveTrainingPreferences({
                      detailedViewOverride: event.target.checked,
                    });
                  }}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb"></span>
                </span>
              </div>
            </label>

            <div
              className="settings-panel-inline-row"
              style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}
            >
              <label className="settings-inline-control-label" htmlFor="default-rest">
                {labels.restLabel}
              </label>
              <select
                id="default-rest"
                className="settings-inline-control-select"
                value={formValues.defaultRest}
                onChange={(event) => {
                  updateField('defaultRest', event.target.value);
                  saveRestTimer();
                }}
              >
                <option value="60">1 min</option>
                <option value="90">90 sec</option>
                <option value="120">2 min</option>
                <option value="180">3 min</option>
                <option value="300">5 min</option>
                <option value="0">{labels.off}</option>
              </select>
            </div>

            <label className="label-spaced" htmlFor="training-preferences-notes">
              {labels.notesLabel}
            </label>
            <textarea
              id="training-preferences-notes"
              rows={4}
              placeholder={labels.notesPlaceholder}
              value={formValues.notes}
              onChange={(event) => {
                updateField('notes', event.target.value);
                saveTrainingPreferences();
              }}
            ></textarea>
          </div>

          <button
            className="btn btn-secondary settings-action-primary"
            type="button"
            onClick={() => restartOnboarding()}
          >
            {labels.restartOnboarding}
          </button>
        </div>
      </details>
    </>
  );
}

export { SettingsPreferencesIsland };
