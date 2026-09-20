import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkoutActive from './components/WorkoutActive';
import HistoryList from './components/HistoryList';
import StatsView from './components/StatsView';
import ProfileView from './components/ProfileView';
import DietView from './components/DietView';
import CoachView from './components/CoachView';
import ExerciseInfo from './components/ExerciseInfo';
import { Exercise } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);

  const handleOpenExerciseInfo = (exercise: Exercise) => {
    const normalizeExerciseName = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const videoMap: Record<string, string> = {
      'prensa de piernas': 'https://www.youtube-nocookie.com/embed/P8TfK9wmFVo',
    };
    const normalizedName = normalizeExerciseName(exercise.name || '');
    const videoUrl = exercise.video_url || videoMap[normalizedName] || null;
    setSelectedExercise({ ...exercise, video_url: videoUrl });
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

  if (checkingSession) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-lime-400 font-bold">Iniciando...</div>;
  }
  if (!user) return <Login onLoginSuccess={(u: any) => { setUser(u); setActiveTab('home'); }} />;

  if (activeRoutineId) {
    return (
      <div className="bg-neutral-950 min-h-screen">
        <WorkoutActive
          user={user}
          routineId={activeRoutineId}
          existingWorkoutId={activeWorkoutId}
          onWorkoutFinished={() => { setActiveWorkoutId(null); setActiveRoutineId(null); setActiveTab('history'); }}
          onWorkoutExit={() => { setActiveWorkoutId(null); setActiveRoutineId(null); setActiveTab('home'); }}
          onOpenExerciseInfo={handleOpenExerciseInfo}
        />
        <ExerciseInfo exercise={selectedExercise} isOpen={isExerciseInfoOpen} onClose={() => setIsExerciseInfoOpen(false)} />
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 min-h-screen">
      {activeTab === 'home' && (
        <Dashboard user={user} onStartWorkout={(id) => { setActiveWorkoutId(null); setActiveRoutineId(id); }}
          onNavigateToTab={(tab) => setActiveTab(tab)} onOpenExerciseInfo={handleOpenExerciseInfo} />
      )}
      {activeTab === 'history' && <HistoryList user={user} onOpenExerciseInfo={handleOpenExerciseInfo} />}
      {activeTab === 'stats' && <StatsView user={user} />}
      {activeTab === 'diet' && <DietView user={user} />}
      {activeTab === 'coach' && <CoachView user={user} />}
      {activeTab === 'profile' && <ProfileView user={user} onLogout={() => { setUser(null); setActiveRoutineId(null); setActiveTab('home'); }} />}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <ExerciseInfo exercise={selectedExercise} isOpen={isExerciseInfoOpen} onClose={() => setIsExerciseInfoOpen(false)} />
    </div>
  );
}
