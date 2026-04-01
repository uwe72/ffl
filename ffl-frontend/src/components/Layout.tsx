import { Outlet, Link } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold">FFL</Link>
            <nav className="flex gap-6">
              <Link to="/seasons" className="hover:text-blue-200 transition">Saisons</Link>
              <Link to="/teams" className="hover:text-blue-200 transition">Teams</Link>
              <Link to="/players" className="hover:text-blue-200 transition">Spieler</Link>
              <Link to="/managers" className="hover:text-blue-200 transition">Manager</Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}