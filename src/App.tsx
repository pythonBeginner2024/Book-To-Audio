import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { GlobalAudioBar } from './components/GlobalAudioBar';
import { ToastContainer } from './components/ToastContainer';
import { ConsentModal } from './components/ConsentModal';

// Views
import { DashboardView } from './views/DashboardView';
import { NewBookView } from './views/NewBookView';
import { BookOutlineView } from './views/BookOutlineView';
import { SummaryStudioView } from './views/SummaryStudioView';
import { AudioGenView } from './views/AudioGenView';
import { AudioPlayerView } from './views/AudioPlayerView';
import { ApiKeysView } from './views/ApiKeysView';
import { SettingsView } from './views/SettingsView';

const AppContent: React.FC = () => {
  const { activeView } = useApp();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'new-book' && <NewBookView />}
        {activeView === 'sections' && <BookOutlineView />}
        {activeView === 'studio' && <SummaryStudioView />}
        {activeView === 'audio' && <AudioGenView />}
        {activeView === 'player' && <AudioPlayerView />}
        {activeView === 'api-keys' && <ApiKeysView />}
        {activeView === 'settings' && <SettingsView />}
      </main>

      <GlobalAudioBar />
      <ToastContainer />
      <ConsentModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
