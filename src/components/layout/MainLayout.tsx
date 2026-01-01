import { Link, useLocation } from 'react-router-dom'
import { Home, Scroll, BookOpen, BarChart3 } from 'lucide-react'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

const navItems: NavItem[] = [
  { to: '/', icon: <Home size={24} />, label: 'Dashboard' },
  { to: '/quests', icon: <Scroll size={24} />, label: 'Quests' },
  { to: '/journal', icon: <BookOpen size={24} />, label: 'Journal' },
  { to: '/stats', icon: <BarChart3 size={24} />, label: 'Stats' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* Main Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border-subtle shadow-card">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`
                    flex flex-col items-center justify-center py-3 px-2
                    transition-all duration-200 corner-clip-sm
                    ${
                      isActive
                        ? 'text-accent-red bg-accent-red/10'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-secondary'
                    }
                  `}
                >
                  <div className="mb-1">{item.icon}</div>
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
