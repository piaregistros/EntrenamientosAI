export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  target_muscle: string;
  category: string;
  equipment: string;
  safety_notes?: string;
  is_active: boolean;
  created_at: string;
  instructions?: string;
  contraindications?: string;
  weight_increment_kg: number;
  progression_type: string; // e.g. 'reps_then_weight'
  rep_progression_enabled: boolean;
  steps?: string[];
  common_mistakes?: string[];
  technical_cues?: string[];
  video_url?: string;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  day_order: number;
  is_active: boolean;
  created_at: string;
  exercises?: RoutineExercise[];
}

export interface RoutineExercise {
  id: string;
  routine_id: string;
  exercise_id: string;
  order: number;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  target_rir: number;
  rest_seconds: number;
  is_optional: boolean;
  exercise?: Exercise;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  routine_id: string | null;
  date: string;
  duration_minutes: number;
  notes: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  routine_name?: string;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_warmup: boolean;
  notes?: string;
  exercise_name?: string;
}

export interface BodyMetric {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  visceral_fat?: number | null;
  basal_metabolic_rate_kcal?: number | null;
  bone_mass_kg?: number | null;
  notes?: string | null;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  waist_cm?: number | null;
  chest_cm?: number | null;
  arm_left_cm?: number | null;
  arm_right_cm?: number | null;
  thigh_left_cm?: number | null;
  thigh_right_cm?: number | null;
  hip_cm?: number | null;
  neck_cm?: number | null;
  notes?: string | null;
}

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: 'muscle_gain' | 'strength' | 'fat_loss' | 'maintenance' | 'other';
  title: string;
  description?: string | null;
  start_date: string; // YYYY-MM-DD
  target_date?: string | null; // YYYY-MM-DD
  is_active: boolean;
  created_at?: string;
}

export interface ExerciseSubstitution {
  id: string;
  exercise_id: string;
  alternative_exercise_id: string;
  priority: number;
  reason: string;
  same_muscle: boolean;
  same_movement_pattern: boolean;
  is_active: boolean;
  created_at: string;
}

export interface WorkoutExerciseSubstitution {
  id: string;
  workout_log_id: string;
  original_exercise_id: string;
  substitute_exercise_id: string;
  reason: string;
  created_at: string;
}

export interface WorkoutStats {
  completed_workouts: number;
  total_duration_minutes: number;
  working_sets: number;
  total_reps: number;
  timed_seconds: number;
  total_volume_kg: number;
}

export interface PRRecord {
  exercise_id: string;
  exercise_name: string;
  weight_kg: number;
  reps: number;
  date: string;
  estimated_1rm: number;
}
