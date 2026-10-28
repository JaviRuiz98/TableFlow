/** Stable step ids used by CTAs and workspace setup intents. */
export type OnboardingStepId = 'plan' | 'products' | 'users';

export interface OnboardingFacts {
  hasPlan: boolean;
  hasProduct: boolean;
  hasAdditionalUser: boolean;
}

export interface OnboardingStepState {
  id: OnboardingStepId;
  title: string;
  description: string;
  ctaLabel: string;
  completed: boolean;
  locked: boolean;
  active: boolean;
}

export interface OnboardingProgress {
  facts: OnboardingFacts;
  steps: OnboardingStepState[];
  /** Next actionable step, or null when onboarding is finished. */
  activeStep: OnboardingStepId | null;
  isComplete: boolean;
  completedCount: number;
}

const STEP_COPY: Record<
  OnboardingStepId,
  { title: string; description: string; ctaLabel: string }
> = {
  plan: {
    title: 'Crear primer plano',
    description: 'Diseña el plano inicial de mesas y reservados.',
    ctaLabel: 'Crear primer plano',
  },
  products: {
    title: 'Configurar productos',
    description: 'Añade bebidas, botellas y productos que utilizarás en la operativa.',
    ctaLabel: 'Configurar productos',
  },
  users: {
    title: 'Configurar usuarios',
    description: 'Da de alta al personal que trabajará con TableFlow.',
    ctaLabel: 'Configurar usuarios',
  },
};

const STEP_ORDER: OnboardingStepId[] = ['plan', 'products', 'users'];

/** Derives checklist UI state from persisted domain facts (not ephemeral UI flags). */
export function computeOnboardingProgress(facts: OnboardingFacts): OnboardingProgress {
  const done: Record<OnboardingStepId, boolean> = {
    plan: facts.hasPlan,
    products: facts.hasProduct,
    users: facts.hasAdditionalUser,
  };

  const isComplete = STEP_ORDER.every((id) => done[id]);
  const activeStep = isComplete ? null : (STEP_ORDER.find((id) => !done[id]) ?? null);

  const steps: OnboardingStepState[] = STEP_ORDER.map((id) => {
    const copy = STEP_COPY[id];
    const completed = done[id];
    const locked = !completed && activeStep !== null && STEP_ORDER.indexOf(id) > STEP_ORDER.indexOf(activeStep);
    return {
      id,
      title: copy.title,
      description: copy.description,
      ctaLabel: copy.ctaLabel,
      completed,
      locked,
      active: id === activeStep,
    };
  });

  return {
    facts,
    steps,
    activeStep,
    isComplete,
    completedCount: STEP_ORDER.filter((id) => done[id]).length,
  };
}

export function emptyOnboardingProgress(): OnboardingProgress {
  return computeOnboardingProgress({
    hasPlan: false,
    hasProduct: false,
    hasAdditionalUser: false,
  });
}
