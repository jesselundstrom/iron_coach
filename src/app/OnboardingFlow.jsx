import { useMemo, useState } from 'react';
import { useStore } from 'zustand';
import { profileStore } from '../stores/profile-store';
import { buildOnboardingRecommendation } from '../domain/planning';
import { programStore } from '../stores/program-store';
import { t } from './services/i18n';

const GOAL_OPTIONS = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'sport_support', label: 'Sport Support' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'returning', label: 'Returning' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const GUIDANCE_OPTIONS = [
  { value: 'guided', label: 'Guided' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'self_directed', label: 'Self Directed' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'full_gym', label: 'Full Gym' },
  { value: 'basic_gym', label: 'Basic Gym' },
  { value: 'home_gym', label: 'Home Gym' },
  { value: 'minimal', label: 'Minimal' },
];

function defaultDraft(profile, schedule) {
  return {
    goal: profile?.preferences?.goal || 'strength',
    experienceLevel: profile?.coaching?.experienceLevel || 'returning',
    guidanceMode: profile?.coaching?.guidanceMode || 'balanced',
    trainingDaysPerWeek: profile?.preferences?.trainingDaysPerWeek || 3,
    sessionMinutes: profile?.preferences?.sessionMinutes || 60,
    equipmentAccess: profile?.preferences?.equipmentAccess || 'full_gym',
    sportName: schedule?.sportName || '',
    sportSessionsPerWeek: profile?.coaching?.sportProfile?.sessionsPerWeek || 0,
    inSeason: profile?.coaching?.sportProfile?.inSeason === true,
  };
}

function StepButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      className={`rounded-2xl border p-4 text-left text-sm font-bold transition ${
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border bg-white/[0.03] text-text'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function OnboardingFlow({ onDone, onSkip }) {
  const profile = useStore(profileStore, (state) => state.profile);
  const schedule = useStore(profileStore, (state) => state.schedule);
  const getProgramById = useStore(programStore, (state) => state.getProgramById);
  const getProgramInitialState = useStore(
    programStore,
    (state) => state.getProgramInitialState
  );
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => defaultDraft(profile, schedule));

  const recommendation = useMemo(
    () => buildOnboardingRecommendation(draft) || null,
    [draft]
  );
  const recommendedProgram = recommendation?.programId
    ? getProgramById(recommendation.programId)
    : null;

  async function completeSetup() {
    const currentPrograms =
      profile?.programs && typeof profile.programs === 'object'
        ? profile.programs
        : {};
    const nextProgramId = recommendation?.programId || 'forge';
    const nextProfile = {
      ...(profile || {}),
      activeProgram: nextProgramId,
      preferences: {
        ...(profile?.preferences || {}),
        goal: draft.goal,
        trainingDaysPerWeek: draft.trainingDaysPerWeek,
        sessionMinutes: draft.sessionMinutes,
        equipmentAccess: draft.equipmentAccess,
      },
      coaching: {
        ...(profile?.coaching || {}),
        experienceLevel: draft.experienceLevel,
        guidanceMode: draft.guidanceMode,
        onboardingCompleted: true,
        onboardingSeen: true,
        sportProfile: {
          ...(profile?.coaching?.sportProfile || {}),
          name: draft.sportName,
          inSeason: draft.inSeason,
          sessionsPerWeek: draft.sportSessionsPerWeek,
        },
      },
      programs: {
        ...currentPrograms,
        [nextProgramId]:
          currentPrograms?.[nextProgramId] ||
          getProgramInitialState(nextProgramId) ||
          {},
      },
    };

    await profileStore.getState().setProfile(nextProfile);
    await profileStore.getState().setSchedule({
      ...(schedule || {}),
      sportName: draft.sportName,
    });
    onDone?.();
  }

  return (
    <div className="grid gap-4">
      <div className="flex gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index <= step ? 'bg-accent' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className="grid gap-3">
          <div className="text-2xl font-black tracking-[-0.04em] text-text">
            {t('onboarding.goal.title', 'What do you want from training?')}
          </div>
          {GOAL_OPTIONS.map((option) => (
            <StepButton
              key={option.value}
              active={draft.goal === option.value}
              label={option.label}
              onClick={() => setDraft((current) => ({ ...current, goal: option.value }))}
            />
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid gap-3">
          <div className="text-2xl font-black tracking-[-0.04em] text-text">
            {t('onboarding.experience.title', 'How experienced are you?')}
          </div>
          {EXPERIENCE_OPTIONS.map((option) => (
            <StepButton
              key={option.value}
              active={draft.experienceLevel === option.value}
              label={option.label}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  experienceLevel: option.value,
                }))
              }
            />
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4">
          <div className="text-2xl font-black tracking-[-0.04em] text-text">
            {t('onboarding.envelope.title', 'Set your weekly envelope')}
          </div>
          <label className="grid gap-2 text-sm font-semibold text-text">
            <span>{t('onboarding.frequency', 'Sessions per week')}</span>
            <select
              className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
              value={String(draft.trainingDaysPerWeek)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  trainingDaysPerWeek: Number(event.target.value),
                }))
              }
            >
              {[2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text">
            <span>{t('onboarding.duration', 'Session length')}</span>
            <select
              className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
              value={String(draft.sessionMinutes)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sessionMinutes: Number(event.target.value),
                }))
              }
            >
              {[30, 45, 60, 75, 90].map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text">
            <span>{t('onboarding.equipment', 'Equipment access')}</span>
            <select
              className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
              value={draft.equipmentAccess}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  equipmentAccess: event.target.value,
                }))
              }
            >
              {EQUIPMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4">
          <div className="text-2xl font-black tracking-[-0.04em] text-text">
            {t('onboarding.sport.title', 'What else affects recovery?')}
          </div>
          <label className="grid gap-2 text-sm font-semibold text-text">
            <span>{t('onboarding.sport_name', 'Sport or cardio')}</span>
            <input
              className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
              type="text"
              value={draft.sportName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sportName: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text">
            <span>{t('onboarding.sport_sessions', 'Sessions per week')}</span>
            <select
              className="h-12 rounded-xl border border-border bg-white/[0.03] px-3 text-text"
              value={String(draft.sportSessionsPerWeek)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  sportSessionsPerWeek: Number(event.target.value),
                }))
              }
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            <div className="text-sm font-semibold text-text">
              {t('onboarding.guidance', 'Coaching style')}
            </div>
            {GUIDANCE_OPTIONS.map((option) => (
              <StepButton
                key={option.value}
                active={draft.guidanceMode === option.value}
                label={option.label}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    guidanceMode: option.value,
                  }))
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4">
          <div className="text-2xl font-black tracking-[-0.04em] text-text">
            {t('onboarding.recommend.title', 'Your recommended starting plan')}
          </div>
          <div className="rounded-card border border-accent/30 bg-accent/10 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {t('onboarding.recommend.kicker', 'Recommended')}
            </div>
            <div className="mt-2 text-2xl font-black tracking-[-0.04em] text-text">
              {recommendedProgram?.name || recommendation?.programId || 'Forge'}
            </div>
            <div className="mt-2 text-sm leading-6 text-muted">
              {recommendedProgram?.description ||
                t(
                  'onboarding.recommend.sub',
                  'This is the best current fit for your training goal, weekly time, and sport load.'
                )}
            </div>
            {recommendation?.fitReasons?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {recommendation.fitReasons.slice(0, 3).map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full border border-accent/30 bg-white/5 px-3 py-2 text-xs font-bold text-text"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-border bg-white/[0.03] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-text"
          onClick={() => {
            if (step === 0) {
              onSkip?.();
              return;
            }
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          {step === 0 ? t('onboarding.skip', 'Skip') : t('common.back', 'Back')}
        </button>
        <button
          type="button"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff983d,#f5821f)] px-4 py-3 font-condensed text-base font-bold uppercase tracking-[0.05em] text-white"
          onClick={() => {
            if (step === 4) {
              void completeSetup();
              return;
            }
            setStep((current) => Math.min(4, current + 1));
          }}
        >
          {step === 4 ? t('onboarding.finish', 'Use This Plan') : t('common.continue', 'Continue')}
        </button>
      </div>
    </div>
  );
}
