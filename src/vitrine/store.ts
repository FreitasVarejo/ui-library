import { useMemo, useSyncExternalStore } from "react"

import { setIconSet } from "@/lib/icons"

// Estado da vitrine na URL (?item=&brand=&mode=), para o link reproduzir a tela.
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("popstate", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("popstate", listener)
  }
}

export function applyAppearance() {
  const params = new URLSearchParams(location.search)
  const root = document.documentElement
  const brand = params.get("brand") ?? "default"
  root.dataset.brand = brand
  root.classList.toggle("dark", params.get("mode") === "dark")
  setIconSet(brand)
}

export function setParams(patch: Record<string, string | null>) {
  const params = new URLSearchParams(location.search)
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  history.replaceState(null, "", `?${params}`)
  applyAppearance()
  listeners.forEach((listener) => listener())
}

export function useParams(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, () => location.search)
  return useMemo(() => new URLSearchParams(search), [search])
}

const brandFiles = import.meta.glob("../../brands/*.json")
export const BRANDS = Object.keys(brandFiles)
  .map((path) => path.match(/\/([^/]+)\.json$/)?.[1] ?? "")
  .filter(Boolean)
  .sort()

export type Mode = "light" | "dark"
