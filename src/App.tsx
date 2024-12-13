import { ConfigSection } from "@/components/ConfigSection"
import { ResultsSection } from "@/components/ResultsSection"
import { useTestStore } from '@/store/testStore'
import { colorThemes, ColorTheme } from '@/types/theme'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Github, Palette, ExternalLink, Globe } from "lucide-react"
import { useI18nStore, translations, Language } from '@/store/i18nStore'

function App() {
  const { theme, setTheme } = useTestStore()
  const { language, setLanguage } = useI18nStore()
  const t = translations[language]

  return (
    <div className={`h-screen w-screen overflow-hidden bg-gradient-to-br ${colorThemes[theme].background}`}>
      {/* Header */}
      <div className={`w-full h-16 bg-white/70 backdrop-blur-md border-b ${colorThemes[theme].border} sticky top-0 z-10 shadow-sm`}>
        <div className="w-full h-full max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold bg-gradient-to-r ${colorThemes[theme].header} bg-clip-text text-transparent`}>
              {t.title}
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              {t.subtitle}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="w-10 h-10">
                  <Globe className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32" align="end">
                <div className="space-y-1">
                  {(['en', 'zh-CN', 'zh-TW', 'ja'] as Language[]).map((lang) => (
                    <div
                      key={lang}
                      className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                        language === lang ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => setLanguage(lang)}
                    >
                      <span className="text-sm">
                        {{
                          'en': 'English',
                          'zh-CN': '简体中文',
                          'zh-TW': '繁體中文',
                          'ja': '日本語'
                        }[lang]}
                      </span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* GitHub Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10"
              onClick={() => window.open('https://github.com/Violet-Asuka/openai-api-tester', '_blank')}
            >
              <Github className="h-5 w-5" />
            </Button>

            {/* Theme Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="w-10 h-10">
                  <Palette className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-1">
                  {Object.entries(colorThemes).map(([themeKey]) => (
                    <div
                      key={themeKey}
                      className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer ${
                        theme === themeKey ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => setTheme(themeKey as ColorTheme)}
                    >
                      <span className="text-sm capitalize">{themeKey}</span>
                      {theme === themeKey && (
                        <span className="text-xs text-gray-500">Active</span>
                      )}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Main content - Add scrollbar styles */}
      <div className="w-full h-[calc(100vh-4rem)] overflow-hidden">
        <div className="w-full h-full max-w-7xl mx-auto px-6 py-6">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/50 hover:scrollbar-thumb-gray-300/70">
            {/* Config section */}
            <div className="lg:col-span-5 h-full overflow-hidden">
              <ConfigSection />
            </div>
            
            {/* Results section */}
            <div className="lg:col-span-7 h-full overflow-hidden">
              <ResultsSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
