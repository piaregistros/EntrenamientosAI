import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), 'data', 'entrenamiento_db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
}

// Interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  passwordHash: string; // "pablo123" or similar simple plain text for ease
  created_at: string;
}

interface Exercise {
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
  progression_type: string;
  rep_progression_enabled: boolean;
}

interface Routine {
  id: string;
  user_id: string; // or null if global/system
  name: string;
  day_order: number;
  is_active: boolean;
  created_at: string;
}

interface RoutineExercise {
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
}

interface WorkoutLog {
  id: string;
  user_id: string;
  routine_id: string;
  date: string;
  duration_minutes: number;
  notes: string;
  status: 'in_progress' | 'completed' | 'cancelled';
}

interface WorkoutSet {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number;
  reps: number;
  rir: number | null;
  is_warmup: boolean;
  notes?: string;
}

interface BodyMetric {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  notes?: string;
}

interface ExerciseSubstitution {
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

interface WorkoutExerciseSubstitution {
  id: string;
  workout_log_id: string;
  original_exercise_id: string;
  substitute_exercise_id: string;
  reason: string;
  created_at: string;
}

interface DB {
  users: User[];
  exercises: Exercise[];
  routines: Routine[];
  routine_exercises: RoutineExercise[];
  workout_logs: WorkoutLog[];
  workout_sets: WorkoutSet[];
  body_metrics: BodyMetric[];
  exercise_substitutions: ExerciseSubstitution[];
  workout_exercise_substitutions: WorkoutExerciseSubstitution[];
}

// Initial DB state
const INITIAL_DB: DB = {
  users: [
    {
      id: 'pablo-uuid-1111-2222-333333333333',
      name: 'Pablo',
      email: 'piaregistros@gmail.com',
      role: 'admin',
      passwordHash: 'pablo123',
      created_at: '2026-09-01T12:00:00.000Z'
    },
    {
      id: 'estefi-uuid-4444-5555-666666666666',
      name: 'Estefi',
      email: 'estefi@example.com',
      role: 'user',
      passwordHash: 'estefi123',
      created_at: '2026-09-01T12:00:00.000Z'
    }
  ],
  exercises: [
    { id: 'ex-1', name: 'Curl de bíceps en máquina', target_muscle: 'Bíceps', category: 'brazos', equipment: 'Máquina', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-2', name: 'Curl femoral', target_muscle: 'Isquiosurales', category: 'pierna', equipment: 'Máquina', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-3', name: 'Elevaciones laterales en máquina', target_muscle: 'Deltoides lateral', category: 'hombro', equipment: 'Máquina', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 1.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-4', name: 'Extensión de tríceps en polea', target_muscle: 'Tríceps', category: 'brazos', equipment: 'Polea', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-5', name: 'Face pull', target_muscle: 'Deltoides posterior y espalda alta', category: 'hombro', equipment: 'Polea', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-6', name: 'Hip thrust', target_muscle: 'Glúteos', category: 'pierna', equipment: 'Barra o máquina', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 5.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-7', name: 'Jalón al pecho agarre neutro', target_muscle: 'Dorsal', category: 'tirón', equipment: 'Polea', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-8', name: 'Plancha', target_muscle: 'Core', category: 'core', equipment: 'Peso corporal', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 0.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-9', name: 'Prensa de piernas', target_muscle: 'Cuádriceps y glúteos', category: 'pierna', equipment: 'Máquina', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 5.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-10', name: 'Press banca plano', target_muscle: 'Pectoral', category: 'empuje', equipment: 'Barra', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-11', name: 'Press de hombro con mancuernas agarre neutro', target_muscle: 'Deltoides', category: 'empuje', equipment: 'Mancuernas', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-12', name: 'Press inclinado con mancuernas 30 grados', target_muscle: 'Pectoral superior', category: 'empuje', equipment: 'Mancuernas', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-13', name: 'Remo con pecho apoyado', target_muscle: 'Dorsal y espalda media', category: 'tirón', equipment: 'Máquina o banco', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.5, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-14', name: 'Remo unilateral con mancuerna', target_muscle: 'Dorsal y espalda media', category: 'tirón', equipment: 'Mancuerna', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-15', name: 'Sentadilla búlgara', target_muscle: 'Cuádriceps y glúteos', category: 'unilateral', equipment: 'Mancuernas o peso corporal', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.0, progression_type: 'reps_then_weight', rep_progression_enabled: true },
    { id: 'ex-16', name: 'Zancadas', target_muscle: 'Cuádriceps y glúteos', category: 'unilateral', equipment: 'Mancuernas o peso corporal', is_active: true, created_at: '2026-09-01T12:00:00.000Z', weight_increment_kg: 2.0, progression_type: 'reps_then_weight', rep_progression_enabled: true }
  ],
  routines: [
    { id: 'routine-a', user_id: 'pablo-uuid-1111-2222-333333333333', name: 'Rutina A', day_order: 1, is_active: true, created_at: '2026-09-01T12:00:00.000Z' },
    { id: 'routine-b', user_id: 'pablo-uuid-1111-2222-333333333333', name: 'Rutina B', day_order: 2, is_active: true, created_at: '2026-09-01T12:00:00.000Z' },
    { id: 'routine-c', user_id: 'pablo-uuid-1111-2222-333333333333', name: 'Rutina C', day_order: 3, is_active: true, created_at: '2026-09-01T12:00:00.000Z' }
  ],
  routine_exercises: [
    // Routine A
    { id: 're-a1', routine_id: 'routine-a', exercise_id: 'ex-9', order: 1, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-a2', routine_id: 'routine-a', exercise_id: 'ex-10', order: 2, target_sets: 3, target_rep_min: 6, target_rep_max: 8, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-a3', routine_id: 'routine-a', exercise_id: 'ex-13', order: 3, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 120, is_optional: false },
    { id: 're-a4', routine_id: 'routine-a', exercise_id: 'ex-2', order: 4, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 90, is_optional: false },
    { id: 're-a5', routine_id: 'routine-a', exercise_id: 'ex-3', order: 5, target_sets: 3, target_rep_min: 12, target_rep_max: 15, target_rir: 2, rest_seconds: 75, is_optional: false },
    { id: 're-a6', routine_id: 'routine-a', exercise_id: 'ex-1', order: 6, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 75, is_optional: false },
    { id: 're-a7', routine_id: 'routine-a', exercise_id: 'ex-4', order: 7, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 75, is_optional: false },

    // Routine B
    { id: 're-b1', routine_id: 'routine-b', exercise_id: 'ex-11', order: 1, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-b2', routine_id: 'routine-b', exercise_id: 'ex-9', order: 2, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-b3', routine_id: 'routine-b', exercise_id: 'ex-7', order: 3, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 120, is_optional: false },
    { id: 're-b4', routine_id: 'routine-b', exercise_id: 'ex-6', order: 4, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-b5', routine_id: 'routine-b', exercise_id: 'ex-5', order: 5, target_sets: 3, target_rep_min: 12, target_rep_max: 15, target_rir: 2, rest_seconds: 90, is_optional: false },
    { id: 're-b6', routine_id: 'routine-b', exercise_id: 'ex-3', order: 6, target_sets: 2, target_rep_min: 12, target_rep_max: 15, target_rir: 2, rest_seconds: 75, is_optional: false },
    { id: 're-b7', routine_id: 'routine-b', exercise_id: 'ex-8', order: 7, target_sets: 2, target_rep_min: 30, target_rep_max: 60, target_rir: 2, rest_seconds: 60, is_optional: false },

    // Routine C
    { id: 're-c1', routine_id: 'routine-c', exercise_id: 'ex-12', order: 1, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 150, is_optional: false },
    { id: 're-c2', routine_id: 'routine-c', exercise_id: 'ex-15', order: 2, target_sets: 3, target_rep_min: 8, target_rep_max: 10, target_rir: 2, rest_seconds: 120, is_optional: false },
    { id: 're-c3', routine_id: 'routine-c', exercise_id: 'ex-14', order: 3, target_sets: 3, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 120, is_optional: false },
    { id: 're-c4', routine_id: 'routine-c', exercise_id: 'ex-2', order: 4, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 90, is_optional: false },
    { id: 're-c5', routine_id: 'routine-c', exercise_id: 'ex-3', order: 5, target_sets: 3, target_rep_min: 12, target_rep_max: 15, target_rir: 2, rest_seconds: 75, is_optional: false },
    { id: 're-c6', routine_id: 'routine-c', exercise_id: 'ex-1', order: 6, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 75, is_optional: false },
    { id: 're-c7', routine_id: 'routine-c', exercise_id: 'ex-4', order: 7, target_sets: 2, target_rep_min: 10, target_rep_max: 12, target_rir: 2, rest_seconds: 75, is_optional: false }
  ],
  workout_logs: [
    {
      id: 'workout-historical-1',
      user_id: 'pablo-uuid-1111-2222-333333333333',
      routine_id: 'routine-a',
      date: '2026-09-03T18:00:00.000Z',
      duration_minutes: 0,
      notes: 'Sesión de vuelta al entrenamiento. Histórico inicial.',
      status: 'completed'
    }
  ],
  workout_sets: [
    // Press banca ex-10
    { id: 'set-1', workout_log_id: 'workout-historical-1', exercise_id: 'ex-10', set_number: 1, weight_kg: 35, reps: 8, rir: 2, is_warmup: false },
    { id: 'set-2', workout_log_id: 'workout-historical-1', exercise_id: 'ex-10', set_number: 2, weight_kg: 35, reps: 8, rir: 2, is_warmup: false },
    { id: 'set-3', workout_log_id: 'workout-historical-1', exercise_id: 'ex-10', set_number: 3, weight_kg: 35, reps: 8, rir: 2, is_warmup: false },

    // Remo ex-13
    { id: 'set-4', workout_log_id: 'workout-historical-1', exercise_id: 'ex-13', set_number: 1, weight_kg: 45, reps: 8, rir: 3, is_warmup: false },
    { id: 'set-5', workout_log_id: 'workout-historical-1', exercise_id: 'ex-13', set_number: 2, weight_kg: 45, reps: 8, rir: 3, is_warmup: false },
    { id: 'set-6', workout_log_id: 'workout-historical-1', exercise_id: 'ex-13', set_number: 3, weight_kg: 45, reps: 8, rir: 3, is_warmup: false },

    // Elevaciones ex-3
    { id: 'set-7', workout_log_id: 'workout-historical-1', exercise_id: 'ex-3', set_number: 1, weight_kg: 10, reps: 12, rir: 2, is_warmup: false, notes: '10 kg resultaron mucho más cómodos' },
    { id: 'set-8', workout_log_id: 'workout-historical-1', exercise_id: 'ex-3', set_number: 2, weight_kg: 10, reps: 12, rir: 2, is_warmup: false },
    { id: 'set-9', workout_log_id: 'workout-historical-1', exercise_id: 'ex-3', set_number: 3, weight_kg: 10, reps: 12, rir: 2, is_warmup: false },

    // Curl biceps ex-1
    { id: 'set-10', workout_log_id: 'workout-historical-1', exercise_id: 'ex-1', set_number: 1, weight_kg: 15, reps: 15, rir: 2, is_warmup: true },
    { id: 'set-11', workout_log_id: 'workout-historical-1', exercise_id: 'ex-1', set_number: 2, weight_kg: 17.5, reps: 12, rir: 2, is_warmup: false },

    // Triceps ex-4
    { id: 'set-12', workout_log_id: 'workout-historical-1', exercise_id: 'ex-4', set_number: 1, weight_kg: 11.25, reps: 15, rir: 2, is_warmup: true },
    { id: 'set-13', workout_log_id: 'workout-historical-1', exercise_id: 'ex-4', set_number: 2, weight_kg: 13.75, reps: 12, rir: 2, is_warmup: false },

    // Plancha ex-8
    { id: 'set-14', workout_log_id: 'workout-historical-1', exercise_id: 'ex-8', set_number: 1, weight_kg: 0, reps: 60, rir: 2, is_warmup: false },
    { id: 'set-15', workout_log_id: 'workout-historical-1', exercise_id: 'ex-8', set_number: 2, weight_kg: 0, reps: 45, rir: 2, is_warmup: false }
  ],
  body_metrics: [
    { id: 'bm-1', user_id: 'pablo-uuid-1111-2222-333333333333', date: '2026-09-03', weight_kg: 71.8, notes: 'Medida por la mañana en ayunas' }
  ],
  exercise_substitutions: [
    // Press banca plano -> Press inclinado con mancuernas
    { id: 'es-1', exercise_id: 'ex-10', alternative_exercise_id: 'ex-12', priority: 1, reason: 'Alternativa excelente por molestias o falta de equipamiento', same_muscle: true, same_movement_pattern: true, is_active: true, created_at: '2026-09-01T12:00:00.000Z' },
    // Prensa de piernas -> Sentadilla búlgara
    { id: 'es-2', exercise_id: 'ex-9', alternative_exercise_id: 'ex-15', priority: 1, reason: 'Alternativa unilateral recomendada', same_muscle: true, same_movement_pattern: true, is_active: true, created_at: '2026-09-01T12:00:00.000Z' },
    // Prensa de piernas -> Zancadas
    { id: 'es-3', exercise_id: 'ex-9', alternative_exercise_id: 'ex-16', priority: 2, reason: 'Fácil ejecución peso corporal o mancuernas', same_muscle: true, same_movement_pattern: true, is_active: true, created_at: '2026-09-01T12:00:00.000Z' },
    // Remo con pecho apoyado -> Remo unilateral con mancuerna
    { id: 'es-4', exercise_id: 'ex-13', alternative_exercise_id: 'ex-14', priority: 1, reason: 'Gran trabajo dorsal unilateral con mancuerna', same_muscle: true, same_movement_pattern: true, is_active: true, created_at: '2026-09-01T12:00:00.000Z' }
  ],
  workout_exercise_substitutions: []
};

// Load database
function readDB(): DB {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading DB, resetting to initial', e);
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
  return INITIAL_DB;
}

// Write database
function writeDB(data: DB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing DB', e);
  }
}

// Ensure seeded on boot
readDB();

// Middlewares
app.use(express.json());

// Simple helper to parse cookies
function getCookies(req: express.Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

// Authentication check
function getLoggedInUser(req: express.Request): User | null {
  // 1. Try to get session ID from Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  let sessionId: string | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7);
  }
  
  // 2. Fallback to cookie
  if (!sessionId) {
    const cookies = getCookies(req);
    sessionId = cookies['entrenamiento_session'];
  }

  if (!sessionId) return null;
  const db = readDB();
  return db.users.find(u => u.id === sessionId) || null;
}

// CSRF validation helper
function validateCSRF(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Exclude login and health checks, and GET requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/api/auth/login' || req.path === '/api/health') {
    return next();
  }

  // If request is authenticated via Bearer token (stored in app state / localStorage),
  // it is immune to CSRF exploits. We can safely bypass CSRF cookie checks.
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  const cookies = getCookies(req);
  const sessionActive = !!cookies['entrenamiento_session'];
  if (!sessionActive) {
    return next(); // No session, no CSRF check needed (will hit auth checks later)
  }

  const csrfCookie = cookies['entrenamiento_csrf'];
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  next();
}

app.use(validateCSRF);

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, name, password } = req.body;
  const db = readDB();

  // Find user by email, name or lowercase name
  const user = db.users.find(u => 
    (email && u.email.toLowerCase() === email.toLowerCase()) || 
    (name && u.name.toLowerCase() === name.toLowerCase())
  );

  // For this application, passwords are simple string matches for pablo123 / estefi123
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const csrfToken = 'csrf_' + Math.random().toString(36).substring(2, 15);

  res.setHeader('Set-Cookie', [
    `entrenamiento_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`,
    `entrenamiento_csrf=${csrfToken}; Path=/; SameSite=Lax; Max-Age=31536000`
  ]);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    csrf_token: csrfToken // Provide in response as well for ease of SPA reading
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', [
    `entrenamiento_session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `entrenamiento_csrf=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ]);
  res.json({ status: 'ok' });
});

app.post('/api/auth/change-password', (req, res) => {
  const user = getLoggedInUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { current_password, new_password } = req.body;
  const db = readDB();
  const dbUser = db.users.find(u => u.id === user.id)!;

  if (dbUser.passwordHash !== current_password) {
    return res.status(400).json({ error: 'Contraseña actual incorrecta' });
  }

  dbUser.passwordHash = new_password;
  writeDB(db);
  res.json({ status: 'ok' });
});

// Middleware for requiring auth
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getLoggedInUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  next();
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server_time: new Date().toISOString() });
});

// Exercises API
app.get('/api/exercises', requireAuth, (req, res) => {
  const db = readDB();
  res.json(db.exercises.filter(e => e.is_active));
});

app.get('/api/exercises/:exercise_id', requireAuth, (req, res) => {
  const { exercise_id } = req.params;
  const db = readDB();
  const exercise = db.exercises.find(e => e.id === exercise_id);
  if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });
  res.json(exercise);
});

app.get('/api/exercises/:exercise_id/substitutions', requireAuth, (req, res) => {
  const { exercise_id } = req.params;
  const db = readDB();
  
  const subs = db.exercise_substitutions.filter(
    s => s.exercise_id === exercise_id && s.is_active
  );

  const enriched = subs.map(sub => {
    const altEx = db.exercises.find(e => e.id === sub.alternative_exercise_id);
    return {
      ...sub,
      alternative_exercise: altEx
    };
  });

  res.json(enriched);
});

// Routines API
app.get('/api/routines', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const db = readDB();
  
  // Admin can query everything, user can only query theirs (or pablo's routine if shared, but we filter or allow)
  const routines = db.routines.filter(r => r.is_active && (user.role === 'admin' || r.user_id === user.id));
  
  const enriched = routines.map(routine => {
    const re = db.routine_exercises
      .filter(re => re.routine_id === routine.id)
      .sort((a, b) => a.order - b.order)
      .map(reItem => {
        const exercise = db.exercises.find(e => e.id === reItem.exercise_id);
        return {
          ...reItem,
          exercise
        };
      });
    return {
      ...routine,
      exercises: re
    };
  });
  
  res.json(enriched);
});

app.get('/api/routines/:routine_id', requireAuth, (req, res) => {
  const { routine_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const routine = db.routines.find(r => r.id === routine_id && r.is_active);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  if (user.role !== 'admin' && routine.user_id !== user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver esta rutina' });
  }

  const re = db.routine_exercises
    .filter(re => re.routine_id === routine.id)
    .sort((a, b) => a.order - b.order)
    .map(reItem => {
      const exercise = db.exercises.find(e => e.id === reItem.exercise_id);
      return {
        ...reItem,
        exercise
      };
    });

  res.json({
    ...routine,
    exercises: re
  });
});

app.get('/api/routines/:routine_id/with-last-performance', requireAuth, (req, res) => {
  const { routine_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const routine = db.routines.find(r => r.id === routine_id && r.is_active);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  const re = db.routine_exercises
    .filter(re => re.routine_id === routine.id)
    .sort((a, b) => a.order - b.order)
    .map(reItem => {
      const exercise = db.exercises.find(e => e.id === reItem.exercise_id);
      
      // Get last completed workout sets for this exercise (by this user)
      const lastUserWorkouts = db.workout_logs
        .filter(w => w.user_id === user.id && w.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let lastSets: WorkoutSet[] = [];
      let lastDate: string | null = null;

      for (const wo of lastUserWorkouts) {
        const sets = db.workout_sets.filter(s => s.workout_log_id === wo.id && s.exercise_id === reItem.exercise_id);
        if (sets.length > 0) {
          lastSets = sets;
          lastDate = wo.date;
          break;
        }
      }

      return {
        ...reItem,
        exercise,
        last_performance: lastSets.length > 0 ? {
          date: lastDate,
          sets: lastSets
        } : null
      };
    });

  res.json({
    ...routine,
    exercises: re
  });
});

app.get('/api/routines/:routine_id/recommendations', requireAuth, (req, res) => {
  const { routine_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const routine = db.routines.find(r => r.id === routine_id && r.is_active);
  if (!routine) return res.status(404).json({ error: 'Rutina no encontrada' });

  const reList = db.routine_exercises.filter(re => re.routine_id === routine.id);

  const recommendations = reList.map(re => {
    // 1. Get last workout of this user
    const userCompletedWorkouts = db.workout_logs
      .filter(wl => wl.user_id === user.id && wl.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let lastPerformanceSets: WorkoutSet[] = [];
    for (const wl of userCompletedWorkouts) {
      const sets = db.workout_sets.filter(ws => ws.workout_log_id === wl.id && ws.exercise_id === re.exercise_id);
      if (sets.length > 0) {
        lastPerformanceSets = sets;
        break;
      }
    }

    const exercise = db.exercises.find(e => e.id === re.exercise_id)!;

    if (lastPerformanceSets.length === 0) {
      // Default initial recommendation based on routine targets
      // Plancha special case
      const defaultWeight = re.exercise_id === 'ex-8' ? 0 : 20; // 20kg bar or default
      return {
        exercise_id: re.exercise_id,
        recommended_weight_kg: defaultWeight,
        recommended_reps: re.target_rep_min,
        reason: 'Primer registro. Recomendación inicial según objetivos de rutina.'
      };
    }

    // Progression logic (reps_then_weight):
    // Compare sets to target_rep_max
    const workSets = lastPerformanceSets.filter(s => !s.is_warmup);
    
    if (workSets.length === 0) {
      return {
        exercise_id: re.exercise_id,
        recommended_weight_kg: 20,
        recommended_reps: re.target_rep_min,
        reason: 'No hay series de trabajo previas.'
      };
    }

    // Check if they completed all targeted reps at maximum
    const reachedMaxOnAll = workSets.every(s => s.reps >= re.target_rep_max);
    const lastWeight = workSets[0].weight_kg;

    if (reachedMaxOnAll) {
      // Increase weight!
      const nextWeight = lastWeight + exercise.weight_increment_kg;
      return {
        exercise_id: re.exercise_id,
        recommended_weight_kg: nextWeight,
        recommended_reps: re.target_rep_min,
        reason: `¡Objetivo cumplido! Subimos peso (+${exercise.weight_increment_kg} kg) y bajamos al rango mínimo de repeticiones (${re.target_rep_min}).`
      };
    } else {
      // Keep weight, try to improve reps
      return {
        exercise_id: re.exercise_id,
        recommended_weight_kg: lastWeight,
        recommended_reps: re.target_rep_max,
        reason: `Mantenemos ${lastWeight} kg. Intenta completar todas las series a ${re.target_rep_max} repeticiones.`
      };
    }
  });

  res.json({
    routine_id: routine.id,
    recommendations
  });
});

// Workouts API
app.get('/api/workouts', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const logs = db.workout_logs
    .filter(wl => user.role === 'admin' || wl.user_id === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const enriched = logs.map(wl => {
    const routine = db.routines.find(r => r.id === wl.routine_id);
    const sets = db.workout_sets.filter(ws => ws.workout_log_id === wl.id);
    return {
      ...wl,
      routine_name: routine ? routine.name : 'Rutina Libre',
      sets
    };
  });

  res.json(enriched);
});

app.post('/api/workouts', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const { routine_id, notes } = req.body;
  const db = readDB();

  const newWorkout: WorkoutLog = {
    id: 'wo-' + Math.random().toString(36).substring(2, 11),
    user_id: user.id,
    routine_id: routine_id || '',
    date: new Date().toISOString(),
    duration_minutes: 0,
    notes: notes || '',
    status: 'in_progress'
  };

  db.workout_logs.push(newWorkout);
  writeDB(db);

  res.status(201).json(newWorkout);
});

app.get('/api/workouts/:workout_id', requireAuth, (req, res) => {
  const { workout_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const wl = db.workout_logs.find(w => w.id === workout_id);
  if (!wl) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No tienes permiso para ver este entrenamiento' });
  }

  const routine = db.routines.find(r => r.id === wl.routine_id);
  const sets = db.workout_sets
    .filter(ws => ws.workout_log_id === wl.id)
    .sort((a, b) => a.set_number - b.set_number);

  res.json({
    ...wl,
    routine_name: routine ? routine.name : 'Rutina Libre',
    sets
  });
});

app.put('/api/workouts/:workout_id', requireAuth, (req, res) => {
  const { workout_id } = req.params;
  const user = getLoggedInUser(req)!;
  const { status, duration_minutes, notes } = req.body;
  const db = readDB();

  const wlIndex = db.workout_logs.findIndex(w => w.id === workout_id);
  if (wlIndex === -1) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  const wl = db.workout_logs[wlIndex];
  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No tienes permiso' });
  }

  if (wl.status === 'completed' || wl.status === 'cancelled') {
    return res.status(400).json({ error: 'El entrenamiento ya está completado o cancelado y no se puede modificar' });
  }

  if (status) wl.status = status;
  if (duration_minutes !== undefined) wl.duration_minutes = duration_minutes;
  if (notes !== undefined) wl.notes = notes;

  writeDB(db);
  res.json(wl);
});

// Sets API
app.post('/api/workouts/:workout_id/sets', requireAuth, (req, res) => {
  const { workout_id } = req.params;
  const user = getLoggedInUser(req)!;
  const { exercise_id, weight_kg, reps, rir, is_warmup, notes } = req.body;
  const db = readDB();

  const wl = db.workout_logs.find(w => w.id === workout_id);
  if (!wl) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (wl.status !== 'in_progress') {
    return res.status(400).json({ error: 'Solo se pueden añadir series a entrenamientos en curso' });
  }

  // Get current sets for this exercise to compute set_number
  const currentSets = db.workout_sets.filter(
    s => s.workout_log_id === workout_id && s.exercise_id === exercise_id
  );
  const nextSetNumber = currentSets.length > 0 
    ? Math.max(...currentSets.map(s => s.set_number)) + 1 
    : 1;

  const newSet: WorkoutSet = {
    id: 'set-' + Math.random().toString(36).substring(2, 11),
    workout_log_id: workout_id,
    exercise_id,
    set_number: nextSetNumber,
    weight_kg: Number(weight_kg),
    reps: Number(reps),
    rir: rir !== undefined && rir !== null ? Number(rir) : null,
    is_warmup: !!is_warmup,
    notes: notes || ''
  };

  db.workout_sets.push(newSet);
  writeDB(db);

  res.status(201).json(newSet);
});

app.put('/api/workouts/:workout_id/sets/:set_id', requireAuth, (req, res) => {
  const { workout_id, set_id } = req.params;
  const user = getLoggedInUser(req)!;
  const { weight_kg, reps, rir, is_warmup, notes, set_number } = req.body;
  const db = readDB();

  const wl = db.workout_logs.find(w => w.id === workout_id);
  if (!wl) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (wl.status !== 'in_progress') {
    return res.status(400).json({ error: 'Solo se pueden modificar series de entrenamientos en curso' });
  }

  const setIndex = db.workout_sets.findIndex(s => s.id === set_id && s.workout_log_id === workout_id);
  if (setIndex === -1) return res.status(404).json({ error: 'Serie no encontrada' });

  const set = db.workout_sets[setIndex];

  if (weight_kg !== undefined) set.weight_kg = Number(weight_kg);
  if (reps !== undefined) set.reps = Number(reps);
  if (rir !== undefined) set.rir = rir !== null ? Number(rir) : null;
  if (is_warmup !== undefined) set.is_warmup = !!is_warmup;
  if (notes !== undefined) set.notes = notes;
  if (set_number !== undefined) set.set_number = Number(set_number);

  writeDB(db);
  res.json(set);
});

app.delete('/api/workouts/:workout_id/sets/:set_id', requireAuth, (req, res) => {
  const { workout_id, set_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const wl = db.workout_logs.find(w => w.id === workout_id);
  if (!wl) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (wl.status !== 'in_progress') {
    return res.status(400).json({ error: 'Solo se pueden eliminar series de entrenamientos en curso' });
  }

  const setIndex = db.workout_sets.findIndex(s => s.id === set_id && s.workout_log_id === workout_id);
  if (setIndex === -1) return res.status(404).json({ error: 'Serie no encontrada' });

  const deletedSet = db.workout_sets[setIndex];
  db.workout_sets.splice(setIndex, 1);

  // Re-number subsequent sets for this exercise context
  const remainingSets = db.workout_sets
    .filter(s => s.workout_log_id === workout_id && s.exercise_id === deletedSet.exercise_id)
    .sort((a, b) => a.set_number - b.set_number);
  
  remainingSets.forEach((s, idx) => {
    s.set_number = idx + 1;
  });

  writeDB(db);
  res.json({ status: 'ok' });
});

// Substitution API during workout
app.post('/api/workouts/:workout_id/substitute-exercise', requireAuth, (req, res) => {
  const { workout_id } = req.params;
  const user = getLoggedInUser(req)!;
  const { original_exercise_id, substitute_exercise_id, reason } = req.body;
  const db = readDB();

  const wl = db.workout_logs.find(w => w.id === workout_id);
  if (!wl) return res.status(404).json({ error: 'Entrenamiento no encontrado' });

  if (user.role !== 'admin' && wl.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // Conflict 409 check: verify if original already has registered sets in this session
  const originalSets = db.workout_sets.filter(
    s => s.workout_log_id === workout_id && s.exercise_id === original_exercise_id
  );
  if (originalSets.length > 0) {
    return res.status(409).json({ error: 'No se puede sustituir el ejercicio porque ya tiene series registradas en esta sesión.' });
  }

  // Record substitution
  const newSub: WorkoutExerciseSubstitution = {
    id: 'wosub-' + Math.random().toString(36).substring(2, 11),
    workout_log_id: workout_id,
    original_exercise_id,
    substitute_exercise_id,
    reason: reason || 'Sustitución durante la sesión',
    created_at: new Date().toISOString()
  };

  db.workout_exercise_substitutions.push(newSub);
  writeDB(db);

  // Return the substitute details, including last performance of substitute
  const altEx = db.exercises.find(e => e.id === substitute_exercise_id);
  
  // Find last performance of substitute for recommendation
  const lastWorkouts = db.workout_logs
    .filter(w => w.user_id === user.id && w.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let lastSets: WorkoutSet[] = [];
  for (const wo of lastWorkouts) {
    const sets = db.workout_sets.filter(s => s.workout_log_id === wo.id && s.exercise_id === substitute_exercise_id);
    if (sets.length > 0) {
      lastSets = sets;
      break;
    }
  }

  res.json({
    substitution: newSub,
    substitute_exercise: altEx,
    last_performance: lastSets.length > 0 ? lastSets : null
  });
});

// Body Metrics API
app.get('/api/body-metrics', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const metrics = db.body_metrics
    .filter(m => user.role === 'admin' || m.user_id === user.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(metrics);
});

app.post('/api/body-metrics', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const { date, weight_kg, notes } = req.body;
  const db = readDB();

  // "No se permiten dos registros para el mismo usuario y fecha."
  const targetDate = date || new Date().toISOString().split('T')[0];
  const existing = db.body_metrics.find(m => m.user_id === user.id && m.date === targetDate);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un registro de peso para esta fecha' });
  }

  const newMetric: BodyMetric = {
    id: 'bm-' + Math.random().toString(36).substring(2, 11),
    user_id: user.id,
    date: targetDate,
    weight_kg: Number(weight_kg),
    notes: notes || ''
  };

  db.body_metrics.push(newMetric);
  writeDB(db);

  res.status(201).json(newMetric);
});

app.put('/api/body-metrics/:metric_id', requireAuth, (req, res) => {
  const { metric_id } = req.params;
  const user = getLoggedInUser(req)!;
  const { weight_kg, notes, date } = req.body;
  const db = readDB();

  const mIndex = db.body_metrics.findIndex(m => m.id === metric_id);
  if (mIndex === -1) return res.status(404).json({ error: 'Métrica no encontrada' });

  const metric = db.body_metrics[mIndex];
  if (user.role !== 'admin' && metric.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (date !== undefined) {
    // Check if duplicate date
    const dup = db.body_metrics.find(m => m.id !== metric_id && m.user_id === user.id && m.date === date);
    if (dup) return res.status(400).json({ error: 'Ya existe una métrica para esa fecha' });
    metric.date = date;
  }

  if (weight_kg !== undefined) metric.weight_kg = Number(weight_kg);
  if (notes !== undefined) metric.notes = notes;

  writeDB(db);
  res.json(metric);
});

app.delete('/api/body-metrics/:metric_id', requireAuth, (req, res) => {
  const { metric_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const mIndex = db.body_metrics.findIndex(m => m.id === metric_id);
  if (mIndex === -1) return res.status(404).json({ error: 'Métrica no encontrada' });

  const metric = db.body_metrics[mIndex];
  if (user.role !== 'admin' && metric.user_id !== user.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  db.body_metrics.splice(mIndex, 1);
  writeDB(db);

  res.json({ status: 'ok' });
});

// Statistics & PRs API
app.get('/api/stats/summary', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const db = readDB();

  // Get completed workouts for user
  const userWorkouts = db.workout_logs.filter(
    w => w.user_id === user.id && w.status === 'completed'
  );

  let totalDuration = 0;
  let totalWorkingSets = 0;
  let totalReps = 0;
  let timedSeconds = 0;
  let totalVolume = 0;

  userWorkouts.forEach(wl => {
    totalDuration += wl.duration_minutes;
    const sets = db.workout_sets.filter(ws => ws.workout_log_id === wl.id);
    sets.forEach(s => {
      if (!s.is_warmup) {
        totalWorkingSets += 1;
        
        // If plancha (ex-8), reps means duration in seconds, weight 0
        if (s.exercise_id === 'ex-8') {
          timedSeconds += s.reps;
        } else {
          totalReps += s.reps;
          totalVolume += s.weight_kg * s.reps;
        }
      }
    });
  });

  res.json({
    completed_workouts: userWorkouts.length,
    total_duration_minutes: totalDuration,
    working_sets: totalWorkingSets,
    total_reps: totalReps,
    timed_seconds: timedSeconds,
    total_volume_kg: totalVolume
  });
});

app.get('/api/stats/prs', requireAuth, (req, res) => {
  const user = getLoggedInUser(req)!;
  const db = readDB();

  // Calculate Personal Records
  // PRs: highest weight, reps, or estimated 1RM from completed workouts and non-warmup sets. Plancha is excluded.
  const userWorkouts = db.workout_logs.filter(w => w.user_id === user.id && w.status === 'completed');
  const workoutIds = new Set(userWorkouts.map(w => w.id));

  const validSets = db.workout_sets.filter(
    s => workoutIds.has(s.workout_log_id) && !s.is_warmup && s.exercise_id !== 'ex-8'
  );

  // Group by exercise
  const prsByExercise: Record<string, { weight_kg: number; reps: number; date: string; e1rm: number }> = {};

  validSets.forEach(set => {
    const wl = userWorkouts.find(w => w.id === set.workout_log_id)!;
    // e1rm calculation (Epley formula: weight * (1 + reps/30))
    const e1rm = Number((set.weight_kg * (1 + set.reps / 30)).toFixed(1));

    const existing = prsByExercise[set.exercise_id];
    if (!existing || e1rm > existing.e1rm) {
      prsByExercise[set.exercise_id] = {
        weight_kg: set.weight_kg,
        reps: set.reps,
        date: wl.date,
        e1rm: e1rm
      };
    }
  });

  const prsList = Object.entries(prsByExercise).map(([exercise_id, data]) => {
    const exercise = db.exercises.find(e => e.id === exercise_id);
    return {
      exercise_id,
      exercise_name: exercise ? exercise.name : 'Ejercicio Desconocido',
      weight_kg: data.weight_kg,
      reps: data.reps,
      date: data.date,
      estimated_1rm: data.e1rm
    };
  });

  res.json(prsList);
});

app.get('/api/stats/exercise/:exercise_id', requireAuth, (req, res) => {
  const { exercise_id } = req.params;
  const user = getLoggedInUser(req)!;
  const db = readDB();

  const userWorkouts = db.workout_logs
    .filter(w => w.user_id === user.id && w.status === 'completed')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const workoutIds = new Set(userWorkouts.map(w => w.id));

  const exerciseSets = db.workout_sets.filter(
    s => s.exercise_id === exercise_id && workoutIds.has(s.workout_log_id) && !s.is_warmup
  );

  // Group by workout to find max weight / max e1rm per workout session
  const history = userWorkouts.map(wl => {
    const sets = exerciseSets.filter(s => s.workout_log_id === wl.id);
    if (sets.length === 0) return null;

    const maxWeight = Math.max(...sets.map(s => s.weight_kg));
    const maxReps = Math.max(...sets.filter(s => s.weight_kg === maxWeight).map(s => s.reps));
    const totalVolume = sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);

    return {
      date: wl.date,
      workout_id: wl.id,
      max_weight_kg: maxWeight,
      max_reps: maxReps,
      total_volume_kg: totalVolume,
      sets: sets
    };
  }).filter(h => h !== null);

  res.json(history);
});

// Vite Setup (or Static serving in Production)
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Entrenamiento Server] running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
