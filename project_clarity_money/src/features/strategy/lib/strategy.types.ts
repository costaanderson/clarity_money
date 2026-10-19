export type StrategicPlanGoals = {
  mrrCurrent: number;
  mrrTarget: number;
  mainGoal: string;
  constraints: string;
};

export type StrategicPlan = {
  id: string;
  quarter: string;
  periodStart: string;
  periodEnd: string;
  goals: StrategicPlanGoals;
  snapshot: Record<string, any>;
  content: string;
  createdAt: string;
};
