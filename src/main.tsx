import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { App } from "./vitrine/app"
import { applyAppearance } from "./vitrine/store"

// Um import por marca; cada arquivo só define variáveis em html[data-brand].
import.meta.glob("./themes/*.css", { eager: true })

applyAppearance()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
