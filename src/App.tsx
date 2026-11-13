import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { apiFetch } from './lib/api';
import Login from './components/Login';
import { Exercise } from './types';

const Dashboard = lazy(() => import('./components/Dashboard'));
const WorkoutActive = lazy(() => import('./components/WorkoutActive'));
const HistoryList = lazy(() => import('./components/HistoryList'));
const StatsView = lazy(() => import('./components/StatsView'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const Onboarding = lazy(() => import('./components/Onboarding/Onboarding'));
const DietView = lazy(() => import('./components/DietView'));
const ExerciseInfo = lazy(() => import('./components/ExerciseInfo'));
const BottomNav = lazy(() => import('./components/BottomNav'));

function ScreenFallback() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-lime-400 font-bold">
      Cargando...
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);

  // Navegación con historial del navegador: cada cambio de pestaña añade una
  // entrada, de modo que "Atrás" vuelve a la sección anterior en lugar de salir
  // de la app. Con un entreno activo, "Atrás" no abandona la sesión.
  const activeTabRef = useRef(activeTab);
  const workoutActiveRef = useRef(false);
  activeTabRef.current = activeTab;
  workoutActiveRef.current = !!activeRoutineId;

  const navigateToTab = (tab: string) => {
    if (tab !== activeTabRef.current) {
      window.history.pushState({ tab }, '');
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    window.history.replaceState({ tab: activeTabRef.current }, '');
    const onPop = (e: PopStateEvent) => {
      if (workoutActiveRef.current) {
        // No salir del entreno con "Atrás": se repone la entrada del historial.
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      const tab = e.state && typeof e.state.tab === 'string' ? e.state.tab : 'home';
      setActiveTab(tab);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // El modal pide la ficha completa (pasos, claves, errores, vídeo...) a /api/exercises/{id}.
  const handleOpenExerciseInfo = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsExerciseInfoOpen(true);
  };

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!mounted) return;
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          apiFetch('/api/onboarding').then(r => r.json()).then(d => setNeedsOnboarding(!!d.required)).catch(() => {});
          try {
            const workoutResponse = await fetch('/api/workouts/in-progress', { credentials: 'include' });
            if (workoutResponse.ok) {
              const activeWorkout = await workoutResponse.json();
              if (activeWorkout?.id && activeWorkout?.routine_id) {
                setActiveWorkoutId(activeWorkout.id);
                setActiveRoutineId(activeWorkout.routine_id);
              }
            }
          } catch {}
        } else setUser(null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };
    checkSession();
    const handleUnauthorized = () => {
      if (mounted) { setUser(null); setActiveRoutineId(null); setActiveTab('home'); }
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => { mounted = false; window.removeEventListener('unauthorized', handleUnauthorized); };
  }, []);

  useEffect(() => {
    if (!user) return;
    import('./lib/push').then((m) => m.ensurePushReady()).catch(() => {});
  }, [user]);

  const infoModal = (
    <Suspense fallback={null}>
      <ExerciseInfo
        exercise={selectedExercise}
        isOpen={isExerciseInfoOpen}
        onClose={() => setIsExerciseInfoOpen(false)}
        userId={user?.id}
      />
    </Suspense>
  );

  if (checkingSession) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-lime-400 font-bold">Iniciando...</div>;
  }
  if (!user) return <Login onLoginSuccess={(u: any) => { setUser(u); setActiveTab('home'); apiFetch('/api/onboarding').then(r => r.json()).then(d => setNeedsOnboarding(!!d.required)).catch(() => {}); }} />;
  if (needsOnboarding) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Onboarding user={user} onComplete={() => setNeedsOnboarding(false)} />
      </Suspense>
    );
  }

  if (activeRoutineId) {
    return (
      <div className="bg-neutral-950 min-h-screen">
        <Suspense fallback={<ScreenFallback />}>
          <WorkoutActive user={user} routineId={activeRoutineId} existingWorkoutId={activeWorkoutId}
            onWorkoutFinished={() => { setActiveWorkoutId(null); setActiveRoutineId(null); navigateToTab('history'); }}
            onWorkoutExit={() => { setActiveWorkoutId(null); setActiveRoutineId(null); navigateToTab('home'); }}
            onOpenExerciseInfo={handleOpenExerciseInfo} />
        </Suspense>
        {infoModal}
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 min-h-screen">
      <Suspense fallback={<ScreenFallback />}>
        {activeTab === 'home' && (
          <Dashboard user={user} onStartWorkout={(id) => { setActiveWorkoutId(null); setActiveRoutineId(id); }}
            onNavigateToTab={(tab) => navigateToTab(tab)} onOpenExerciseInfo={handleOpenExerciseInfo} />
        )}
        {activeTab === 'history' && <HistoryList user={user} onOpenExerciseInfo={handleOpenExerciseInfo} />}
        {activeTab === 'stats' && <StatsView user={user} />}
        {activeTab === 'diet' && <DietView user={user} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={() => { setUser(null); setActiveRoutineId(null); setActiveTab('home'); }} />}
        <BottomNav activeTab={activeTab} setActiveTab={navigateToTab} />
      </Suspense>
      {infoModal}
    </div>
  );
}
