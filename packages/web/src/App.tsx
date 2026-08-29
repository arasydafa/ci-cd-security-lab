import { Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard.js';
import { ChallengeList } from './pages/ChallengeList.js';
import { ChallengeWorkspace } from './pages/ChallengeWorkspace.js';
import { Navbar } from './components/Navbar.js';
import { ReferenceLayout } from './components/ReferenceLayout.js';
import { ReferenceHome } from './pages/reference/ReferenceHome.js';
import { GitHubActions } from './pages/reference/GitHubActions.js';
import { Docker } from './pages/reference/Docker.js';
import { Kubernetes } from './pages/reference/Kubernetes.js';
import { Terraform } from './pages/reference/Terraform.js';
import { Monitoring } from './pages/reference/Monitoring.js';

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/challenges" element={<ChallengeList />} />
          <Route path="/challenges/:id" element={<ChallengeWorkspace />} />
          <Route path="/reference" element={<ReferenceLayout />}>
            <Route index element={<ReferenceHome />} />
            <Route path="github-actions" element={<GitHubActions />} />
            <Route path="docker" element={<Docker />} />
            <Route path="kubernetes" element={<Kubernetes />} />
            <Route path="terraform" element={<Terraform />} />
            <Route path="monitoring" element={<Monitoring />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}
