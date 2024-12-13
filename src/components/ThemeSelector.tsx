import { useTestStore } from '@/store/testStore'
import { colorThemes, ColorTheme } from '@/types/theme'

export const ThemeSelector = () => {
  const { theme, setTheme } = useTestStore()

  return (
    <div className="absolute top-4 right-6">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as ColorTheme)}
        className={`bg-white/50 ${colorThemes[theme].border} focus:border-violet-300 focus:ring-violet-200/50 rounded-xl p-2`}
      >
        <option value="ocean">Ocean</option>
        <option value="lavender">Lavender</option>
        <option value="sunset">Sunset</option>
        <option value="forest">Forest</option>
        <option value="rose">Rose</option>
        <option value="monochrome">Monochrome</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  )
} 