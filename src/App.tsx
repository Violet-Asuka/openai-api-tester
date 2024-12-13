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
import { Github, Palette, ExternalLink } from "lucide-react"

function App() {
  const { theme, setTheme } = useTestStore()

  return (
    <div className={`h-screen w-screen overflow-hidden bg-gradient-to-br ${colorThemes[theme].background}`}>
      {/* Header */}
      <div className={`w-full h-16 bg-white/70 backdrop-blur-md border-b ${colorThemes[theme].border} sticky top-0 z-10 shadow-sm`}>
        <div className="w-full h-full max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <h1 className={`text-2xl font-bold bg-gradient-to-r ${colorThemes[theme].header} bg-clip-text text-transparent`}>
              OpenAI API Tester
            </h1>
            <p className="text-sm text-gray-600 font-medium">
              A simple tool to test and validate your OpenAI API endpoints
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* GitHub Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10"
              onClick={() => window.open('https://github.com/Violet-Asuka/openai-api-tester', '_blank')}
            >
              <Github className="h-5 w-5" />
            </Button>

            {/* Live Demo Button */}
            <Button
              variant="outline"
              size="icon"
              className="w-10 h-10"
              onClick={() => window.open('https://openai-api-tester.vercel.app', '_blank')}
            >
              <ExternalLink className="h-5 w-5" />
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
