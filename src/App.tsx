import { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkoutActive from './components/WorkoutActive';
import HistoryList from './components/HistoryList';
import StatsView from './components/StatsView';
import ProfileView from './components/ProfileView';
import ExerciseInfo from './components/ExerciseInfo';
import { Exercise } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);

  const handleOpenExerciseInfo = (exercise: Exercise) => {
    // Temporary client-side decorator for video URLs while waiting for DB migration
    let videoUrl = exercise.video_url;
    if (!videoUrl) {
      const videoMap: Record<string, string> = {
        'ex-1': 'https://www.youtube-nocookie.com/embed/Ja6ZlIDONac',
        'ex-2': 'https://www.youtube-nocookie.com/embed/_2Kd0d-JEUM',
        'ex-3': 'https://www.youtube-nocookie.com/embed/0o07iGKUarI',
        'ex-4': 'https://www.youtube-nocookie.com/embed/6Fzep104f0s',
        'ex-5': 'https://www.youtube-nocookie.com/embed/eTCBSFlCJ_s',
        'ex-6': 'https://www.youtube-nocookie.com/embed/U5U6JNIiZ_Q',
        'ex-7': 'https://www.youtube-nocookie.com/embed/4y-GyEQ74Hk',
        'ex-8': 'https://www.youtube-nocookie.com/embed/mwlp75MS6Rg',
        'ex-9': 'https://www.youtube-nocookie.com/embed/P8TfK9wmFVo',
        'ex-10': 'https://www.youtube-nocookie.com/embed/CayG6UYqL8g',
        'ex-11': 'https://www.youtube-nocookie.com/embed/y03eDnIFfK8',
        'ex-12': 'https://www.youtube-nocookie.com/embed/0f6-uCUKqgA',
        'ex-13': 'https://www.youtube-nocookie.com/embed/0UBRfiO4zDs',
        'ex-14': 'https://www.youtube-nocookie.com/embed/IOy2k0Cb6Vo?start=44',
        'ex-15': 'https://www.youtube-nocookie.com/embed/bwhl_9jN_3o',
        'ex-16': 'https://www.youtube-nocookie.com/embed/eFWCn5iEbTU',
      };
      videoUrl = videoMap[exercise.id] || null;
    }

    setSelectedExercise({
      ...exercise,
      video_url: videoUrl
    });
    setIsExerciseInfoOpen(true);
  };

  // Restore the authenticated session from the HttpOnly session cookie.
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!mounted) return;

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    const handleUnauthorized = () => {
      if (mounted) {
        setUser(null);
        setActiveRoutineId(null);
        setActiveTab("home");
      }
    };

    window.addEventListener("unauthorized", handleUnauthorized);

    return () => {
      mounted = false;
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (userData: any) => {
    setUser(userData);
    setActiveTab("home");
  };

  const handleLogout = () => {
    setUser(null);
    setActiveRoutineId(null);
    setActiveTab("home");
  };

  // Global fetch proxy is now handled via apiFetch utility to prevent read-only window.fetch assignment error
  useEffect(() => {
    // No-op - we will use apiFetch in individual components
  }, []);

  if (checkingSession) {
    return (
      <div id="app-loading" className="min-h-screen bg-neutral-950 flex items-center justify-center text-lime-400 font-bold select-none">
        Iniciando...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Active workout session takes over the entire viewport without bottom tabs
  if (activeRoutineId) {
    return (
      <div className="bg-neutral-950 min-h-screen">
        <WorkoutActive
          user={user}
          routineId={activeRoutineId}
          onWorkoutFinished={() => {
            setActiveRoutineId(null);
            setActiveTab('history'); // direct to history after finish
          }}
          onOpenExerciseInfo={handleOpenExerciseInfo}
        />
        <ExerciseInfo
          exercise={selectedExercise}
          isOpen={isExerciseInfoOpen}
          onClose={() => setIsExerciseInfoOpen(false)}
        />
      </div>
    );
  }

  return (
    <div id="app-view-wrapper" className="bg-neutral-950 min-h-screen">
      {/* Tab rendering */}
      {activeTab === 'home' && (
        <Dashboard
          user={user}
          onStartWorkout={(id) => setActiveRoutineId(id)}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          onOpenExerciseInfo={handleOpenExerciseInfo}
        />
      )}

      {activeTab === 'history' && (
        <HistoryList
          user={user}
          onOpenExerciseInfo={handleOpenExerciseInfo}
        />
      )}

      {activeTab === 'stats' && <StatsView user={user} />}

      {activeTab === 'profile' && (
        <ProfileView user={user} onLogout={handleLogout} />
      )}

      {/* Main bottom tabs navigator */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Reusable Exercise Information Sheet */}
      <ExerciseInfo
        exercise={selectedExercise}
        isOpen={isExerciseInfoOpen}
        onClose={() => setIsExerciseInfoOpen(false)}
      />
    </div>
  );
}
