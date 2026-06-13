'use client'

interface Team {
  id: string
  name: string
  slug: string
  color: string
  secondary_color: string | null
}

const TEAM_MOTTO: Record<string, { icon: string; tagline: string }> = {
  'invictos':           { icon: '🦅', tagline: 'Força e excelência' },
  'os-setenta':        { icon: '⚡', tagline: 'Intensidade e missão' },
  'evolution-team-12': { icon: '🔥', tagline: 'Missão e crescimento' },
  'inconformados':     { icon: '✊', tagline: 'Ousadia e transformação' },
}

interface TeamSelectorProps {
  teams: Team[]
  selectedId: string
  onChange: (id: string) => void
}

export function TeamSelector({ teams, selectedId, onChange }: TeamSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {teams.map((team) => {
        const isSelected = selectedId === team.id
        const { icon, tagline } = TEAM_MOTTO[team.slug] ?? { icon: '🏆', tagline: '' }
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onChange(team.id)}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
              isSelected
                ? 'border-transparent shadow-lg scale-[1.02]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            style={
              isSelected
                ? { backgroundColor: team.color, borderColor: team.color }
                : {}
            }
          >
            {/* Check */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                  <path
                    d="M3 8l3 3 7-7"
                    stroke="white"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            <div className="text-2xl mb-2">{icon}</div>
            <div
              className={`font-black text-sm leading-tight mb-0.5 ${isSelected ? 'text-white' : 'text-gray-900'}`}
            >
              {team.name}
            </div>
            <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
              {tagline}
            </div>
          </button>
        )
      })}
    </div>
  )
}
