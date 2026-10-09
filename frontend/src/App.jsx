import { themes } from "./themes/themes"
import { useTheme } from "./themes/useTheme"
import Today from "./screens/Today"
import Manage from "./screens/Manage"
import Tasks from "./screens/Tasks"
//import Log from "./screens/Log"
import Body from "./screens/Body"
import Home from "./screens/Home"
import { useState } from "react"

const tabs = [
  { id: "home", label: "HOME" },
  { id: "tasks", label: "TASKS" },
  { id: "manage", label: "MANAGE" },
]
export default function App() {
  const [theme, setTheme] = useTheme()
  const [screen, setScreen] = useState("home")

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 flex flex-col items-start gap-3">
        <h1 className="text-4xl">QUEST LOG</h1>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="px-panel px-2 py-1 text-sm"
        >
          {Object.keys(themes).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </header>

      <main className="p-4">
        {screen === "home" && <Home />}
        {screen === "tasks" && <Tasks />}
        {screen === "manage" && <Manage />}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 flex bg-panel border-t-2 border-line"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            className={
              "flex-1 py-3 font-pixel text-sm " +
              (screen === tab.id ? "text-accent bg-panel-alt" : "text-ink-muted")
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
