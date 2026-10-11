export type PublicPlanVisibility = {
  id: string;
  name: string;
  isActive: boolean;
  isPublished: boolean;
  displayOrder: number;
};

export function publicPlansForDisplay<T extends PublicPlanVisibility>(plans: readonly T[]): T[] {
  return [...plans]
    .filter((plan) => plan.isActive && plan.isPublished)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.name.localeCompare(right.name, 'tr'));
}

export function pricingLayout(planCount: number): 'empty' | 'grid' | 'carousel' {
  if (planCount === 0) return 'empty';
  return planCount > 5 ? 'carousel' : 'grid';
}
