import { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { dataStore } from '../stores/data-store';
import { profileStore } from '../stores/profile-store';
import { programStore } from '../stores/program-store';
import { i18nStore } from '../stores/i18n-store';
import { t } from './services/i18n';
import { useRuntimeStore } from './store/runtime-store';

const TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'program', label: 'Program' },
  { id: 'body', label: 'Body' },
  { id: 'account', label: 'Account' },
];

function SectionCard({ title, children }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {title}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }) {
  return <label className="grid gap-1 text-sm font-semibold text-text">{children}</label>;
}

function ScheduleSettings() {
  const schedule = useStore(profileStore, (state) => state.schedule);
  const [draft, setDraft] = useState(schedule || {});

  useEffect(() => {
    setDraft(schedule || {});
  }, [schedule]);

  const sportDays = Array.isArray(draft.sportDays) ? draft.sportDays : [];

  return (
    <SectionCard title={t('settings.schedule', 'Training Context')}>
      <FieldLabel>
        <span>{t('settings.sport_name', 'Sport or cardio')}</span>
        <input
          className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
          type="text"
          value={String(draft.sportName || '')}
          onChange={(event) =>
            setDraft((current) => ({ ...current, sportName: event.target.value }))
          }
        />
      </FieldLabel>

      <div className="grid gap-2">
        <div className="text-sm font-semibold text-text">
          {t('settings.sport_days', 'Regular sport days')}
        </div>
        <div className="flex flex-wrap gap-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => {
            const active = sportDays.includes(index);
            return (
              <button
                key={`${label}-${index}`}
                type="button"
                className={`rounded-full border px-3 py-2 text-sm font-bold ${
                  active
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-white/[0.03] text-text'
                }`}
                onClick={() =>
                  setDraft((current) => {
                    const nextDays = new Set(
                      Array.isArray(current.sportDays) ? current.sportDays : []
                    );
                    if (nextDays.has(index)) nextDays.delete(index);
                    else nextDays.add(index);
                    return {
                      ...current,
                      sportDays: [...nextDays].sort((left, right) => left - right),
                    };
                  })
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel>
          <span>{t('settings.sport_intensity', 'Sport intensity')}</span>
          <select
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            value={String(draft.sportIntensity || 'hard')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sportIntensity: event.target.value,
              }))
            }
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </FieldLabel>

        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-white/[0.03] px-4 py-3 text-sm font-semibold text-text">
          <span>{t('settings.legs_heavy', 'Leg-heavy sport')}</span>
          <input
            type="checkbox"
            checked={draft.sportLegsHeavy !== false}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sportLegsHeavy: event.target.checked,
              }))
            }
          />
        </label>
      </div>

      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff983d,#f5821f)] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-white"
        onClick={() => void profileStore.getState().setSchedule(draft)}
      >
        {t('common.save', 'Save')}
      </button>
    </SectionCard>
  );
}

function PreferenceSettings() {
  const profile = useStore(profileStore, (state) => state.profile);
  const [draft, setDraft] = useState(profile || {});

  useEffect(() => {
    setDraft(profile || {});
  }, [profile]);

  const preferences = {
    ...(draft.preferences || {}),
  };

  return (
    <SectionCard title={t('settings.preferences', 'Training Preferences')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel>
          <span>{t('settings.goal', 'Goal')}</span>
          <select
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            value={String(preferences.goal || 'strength')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...(current.preferences || {}),
                  goal: event.target.value,
                },
              }))
            }
          >
            <option value="strength">Strength</option>
            <option value="hypertrophy">Hypertrophy</option>
            <option value="general_fitness">General Fitness</option>
            <option value="sport_support">Sport Support</option>
          </select>
        </FieldLabel>

        <FieldLabel>
          <span>{t('settings.frequency', 'Sessions per week')}</span>
          <select
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            value={String(preferences.trainingDaysPerWeek || 3)}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...(current.preferences || {}),
                  trainingDaysPerWeek: Number(event.target.value),
                },
              }))
            }
          >
            {[2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FieldLabel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel>
          <span>{t('settings.session_minutes', 'Session length')}</span>
          <select
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            value={String(preferences.sessionMinutes || 60)}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...(current.preferences || {}),
                  sessionMinutes: Number(event.target.value),
                },
              }))
            }
          >
            {[30, 45, 60, 75, 90].map((value) => (
              <option key={value} value={value}>
                {value} min
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel>
          <span>{t('settings.equipment', 'Equipment')}</span>
          <select
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            value={String(preferences.equipmentAccess || 'full_gym')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                preferences: {
                  ...(current.preferences || {}),
                  equipmentAccess: event.target.value,
                },
              }))
            }
          >
            <option value="full_gym">Full Gym</option>
            <option value="basic_gym">Basic Gym</option>
            <option value="home_gym">Home Gym</option>
            <option value="minimal">Minimal</option>
          </select>
        </FieldLabel>
      </div>

      <FieldLabel>
        <span>{t('settings.default_rest', 'Default rest timer')}</span>
        <input
          className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
          type="number"
          min="0"
          value={String(draft.defaultRest || 120)}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              defaultRest: Number(event.target.value),
            }))
          }
        />
      </FieldLabel>

      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff983d,#f5821f)] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-white"
        onClick={() => void profileStore.getState().setProfile(draft)}
      >
        {t('common.save', 'Save')}
      </button>
    </SectionCard>
  );
}

function ProgramSettings() {
  const profile = useStore(profileStore, (state) => state.profile);
  const programState = useStore(programStore, (state) => state);
  const [selectedProgram, setSelectedProgram] = useState(
    profile?.activeProgram || programState.activeProgramId || 'forge'
  );

  useEffect(() => {
    setSelectedProgram(profile?.activeProgram || programState.activeProgramId || 'forge');
  }, [profile?.activeProgram, programState.activeProgramId]);

  return (
    <SectionCard title={t('settings.program', 'Program')}>
      <div className="grid gap-3">
        {programState.programs.map((program) => {
          const active = selectedProgram === program.id;
          return (
            <button
              key={program.id}
              type="button"
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-accent bg-accent/10'
                  : 'border-border bg-white/[0.03]'
              }`}
              onClick={() => setSelectedProgram(program.id)}
            >
              <div className="text-base font-bold text-text">{program.name}</div>
              <div className="mt-2 text-sm leading-6 text-muted">
                {program.description}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff983d,#f5821f)] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-white"
        onClick={async () => {
          const initialState =
            programState.getProgramInitialState(selectedProgram) || {};
          const currentPrograms =
            profile?.programs && typeof profile.programs === 'object'
              ? profile.programs
              : {};
          await profileStore.getState().updateProfile({
            activeProgram: selectedProgram,
            programs: {
              ...currentPrograms,
              [selectedProgram]:
                currentPrograms?.[selectedProgram] || initialState,
            },
          });
        }}
      >
        {t('settings.use_program', 'Use Program')}
      </button>
    </SectionCard>
  );
}

function BodySettings() {
  const profile = useStore(profileStore, (state) => state.profile);
  const [draft, setDraft] = useState(profile || {});

  useEffect(() => {
    setDraft(profile || {});
  }, [profile]);

  const bodyMetrics = {
    ...(draft.bodyMetrics || {}),
  };

  return (
    <SectionCard title={t('settings.body', 'Body Metrics')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel>
          <span>{t('settings.weight', 'Weight')}</span>
          <input
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            type="number"
            value={String(bodyMetrics.weight || '')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bodyMetrics: {
                  ...(current.bodyMetrics || {}),
                  weight: event.target.value,
                },
              }))
            }
          />
        </FieldLabel>
        <FieldLabel>
          <span>{t('settings.height', 'Height')}</span>
          <input
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            type="number"
            value={String(bodyMetrics.height || '')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bodyMetrics: {
                  ...(current.bodyMetrics || {}),
                  height: event.target.value,
                },
              }))
            }
          />
        </FieldLabel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldLabel>
          <span>{t('settings.age', 'Age')}</span>
          <input
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            type="number"
            value={String(bodyMetrics.age || '')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bodyMetrics: {
                  ...(current.bodyMetrics || {}),
                  age: event.target.value,
                },
              }))
            }
          />
        </FieldLabel>
        <FieldLabel>
          <span>{t('settings.target_weight', 'Target weight')}</span>
          <input
            className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
            type="number"
            value={String(bodyMetrics.targetWeight || '')}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bodyMetrics: {
                  ...(current.bodyMetrics || {}),
                  targetWeight: event.target.value,
                },
              }))
            }
          />
        </FieldLabel>
      </div>

      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff983d,#f5821f)] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-white"
        onClick={() => void profileStore.getState().setProfile(draft)}
      >
        {t('common.save', 'Save')}
      </button>
    </SectionCard>
  );
}

function AccountSettings() {
  const currentUser = useStore(dataStore, (state) => state.currentUser);
  const syncStatus = useStore(dataStore, (state) => state.syncStatus);
  const language = useStore(i18nStore, (state) => state.language);

  return (
    <SectionCard title={t('settings.account', 'Account')}>
      <div className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-text">
        {String(currentUser?.email || '')}
      </div>
      <div className="rounded-2xl border border-border bg-white/[0.03] px-4 py-3 text-sm text-text">
        {t('settings.sync_status', 'Sync')}: {syncStatus.state}
      </div>
      <FieldLabel>
        <span>{t('settings.language', 'Language')}</span>
        <select
          className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
          value={language}
          onChange={(event) =>
            i18nStore.getState().setLanguage(event.target.value)
          }
        >
          <option value="en">English</option>
          <option value="fi">Finnish</option>
        </select>
      </FieldLabel>
      <button
        type="button"
        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-white/[0.03] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-text"
        onClick={() => void dataStore.getState().logout()}
      >
        {t('settings.sign_out', 'Sign Out')}
      </button>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const activeTab = useRuntimeStore((state) => state.navigation.activeSettingsTab);
  const setActiveTab = useRuntimeStore((state) => state.setActiveSettingsTab);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-bold ${
                active
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-white/[0.03] text-text'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'schedule' ? <ScheduleSettings /> : null}
      {activeTab === 'preferences' ? <PreferenceSettings /> : null}
      {activeTab === 'program' ? <ProgramSettings /> : null}
      {activeTab === 'body' ? <BodySettings /> : null}
      {activeTab === 'account' ? <AccountSettings /> : null}
    </div>
  );
}
