import { Shuffle } from 'lucide-react';

export type AppView =
  | 'dictionary'
  | 'sentences'
  | 'a1-certificate'
  | 'sound-guide'
  | 'minimal-pairs'
  | 'saved';

interface HeaderProps {
  activeView: AppView;
  savedCount: number;
  onNavigate: (view: AppView) => void;
  onRandomWord: () => void;
}

export function Header({ activeView, savedCount, onNavigate, onRandomWord }: HeaderProps) {
  const navItems: { id: AppView; label: string }[] = [
    { id: 'dictionary', label: 'Dictionary' },
    { id: 'sentences', label: 'Sentences' },
    { id: 'a1-certificate', label: 'A1 Certificate' },
    { id: 'sound-guide', label: 'Sound Guide' },
    { id: 'minimal-pairs', label: 'Minimal Pairs' },
    { id: 'saved', label: savedCount > 0 ? `Revision (${savedCount})` : 'Revision' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-6">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('dictionary')}
          className="font-display text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 rounded-sm cursor-pointer"
        >
          LautBhasha
        </button>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 rounded-sm ${
                  isActive
                    ? 'text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onRandomWord}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Shuffle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Random Word</span>
          </button>
        </div>
      </div>
    </header>
  );
}
