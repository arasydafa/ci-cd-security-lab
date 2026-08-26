import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard.js';
import { ChallengeList } from './pages/ChallengeList.js';
import { ChallengeWorkspace } from './pages/ChallengeWorkspace.js';
import { Navbar } from './components/Navbar.js';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/challenges" element={<ChallengeList />} />
          <Route path="/challenges/:id" element={<ChallengeWorkspace />} />
        </Routes>
      </main>
    </div>
  );
}
