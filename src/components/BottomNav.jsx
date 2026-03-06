import { Briefcase, LineChart, BookOpen, Activity } from 'lucide-react'

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'portfolio', label: 'Portofolio', icon: Briefcase },
    { id: 'saham', label: 'Saham', icon: LineChart },
    { id: 'jurnal', label: 'Jurnal', icon: BookOpen },
    { id: 'monitor', label: 'Monitor', icon: Activity },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-lg border-t border-brand-border pb-safe pt-2 px-6 z-50">
      <div className="flex justify-between items-center mb-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-1 min-w-[64px]"
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-brand-green/10 text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'text-brand-green' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}