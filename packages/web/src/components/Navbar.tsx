import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <nav className="bg-dark-800 border-b border-dark-600">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-dark-900 font-bold text-sm">
            CI
          </div>
          <span className="font-bold text-lg">CI/CD Security Lab</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link to="/challenges" className="text-gray-400 hover:text-white transition-colors">
            Challenges
          </Link>
        </div>
      </div>
    </nav>
  );
}
