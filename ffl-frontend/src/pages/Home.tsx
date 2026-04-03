import { Link as RouterLink } from 'react-router-dom'
import { Card } from '@heroui/react'

const SeasonIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" className="mb-4">
    <rect x="6" y="10" width="36" height="28" rx="4" fill="#c9a66b" opacity="0.2"/>
    <rect x="10" y="14" width="28" height="20" rx="2" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <path d="M10 20 L38 20" stroke="#c9a66b" strokeWidth="2"/>
    <circle cx="16" cy="17" r="2" fill="#c9a66b"/>
    <text x="24" y="30" fontSize="10" fill="#c9a66b" textAnchor="middle" fontWeight="bold">25/26</text>
  </svg>
)

const TeamIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" className="mb-4">
    <circle cx="24" cy="24" r="20" fill="#c9a66b" opacity="0.2"/>
    <circle cx="24" cy="24" r="18" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <circle cx="24" cy="24" r="12" fill="none" stroke="#c9a66b" strokeWidth="1.5"/>
    <path d="M24 6 L24 12" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <path d="M24 36 L24 42" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <path d="M6 24 L12 24" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <path d="M36 24 L42 24" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="3" fill="#c9a66b"/>
  </svg>
)

const PlayerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" className="mb-4">
    <circle cx="24" cy="16" r="8" fill="#c9a66b" opacity="0.3"/>
    <circle cx="24" cy="16" r="6" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <path d="M12 44 L12 32 C12 26 18 22 24 22 C30 22 36 26 36 32 L36 44" fill="#c9a66b" opacity="0.2"/>
    <path d="M12 44 L12 32 C12 26 18 22 24 22 C30 22 36 26 36 32 L36 44" fill="none" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 28 L24 32 L28 28" stroke="#c9a66b" strokeWidth="1.5" fill="none"/>
  </svg>
)

const ManagerIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" className="mb-4">
    <rect x="8" y="8" width="32" height="32" rx="6" fill="#c9a66b" opacity="0.2"/>
    <rect x="8" y="8" width="32" height="32" rx="6" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <circle cx="24" cy="20" r="6" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <path d="M14 38 L14 32 C14 28 18 24 24 24 C30 24 34 28 34 32 L34 38" fill="none" stroke="#c9a66b" strokeWidth="2"/>
    <path d="M28 14 L32 10" stroke="#c9a66b" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="34" cy="8" r="3" fill="#c9a66b"/>
  </svg>
)

export default function Home() {
  return (
    <div className="text-center py-12">
      <h1 className="text-4xl font-bold text-[#f5f5f5] mb-4">
        Willkommen bei FFL
      </h1>
      <p className="text-xl text-[#a0aec0] mb-8">
        Fantasy Football League Manager
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] hover:bg-[#242d38] transition-all cursor-pointer">
          <RouterLink to="/seasons" className="block link">
            <div className="flex justify-center">
              <SeasonIcon />
            </div>
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">Saisons</h3>
            <p className="text-[#a0aec0]">Verwalte deine Spielzeiten</p>
          </RouterLink>
        </Card>
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] hover:bg-[#242d38] transition-all cursor-pointer">
          <RouterLink to="/teams" className="block link">
            <div className="flex justify-center">
              <TeamIcon />
            </div>
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">Teams</h3>
            <p className="text-[#a0aec0]">Alle Bundesligisten im Überblick</p>
          </RouterLink>
        </Card>
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] hover:bg-[#242d38] transition-all cursor-pointer">
          <RouterLink to="/players" className="block link">
            <div className="flex justify-center">
              <PlayerIcon />
            </div>
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">Spieler</h3>
            <p className="text-[#a0aec0]">Wähle deine Top11</p>
          </RouterLink>
        </Card>
        <Card className="p-6 bg-[#1a2028] border border-[#2d3748] hover:border-[#c9a66b] hover:bg-[#242d38] transition-all cursor-pointer">
          <RouterLink to="/managers" className="block link">
            <div className="flex justify-center">
              <ManagerIcon />
            </div>
            <h3 className="text-lg font-semibold text-[#f5f5f5] mb-2">Manager</h3>
            <p className="text-[#a0aec0]">Tritt gegen andere an</p>
          </RouterLink>
        </Card>
      </div>
    </div>
  )
}