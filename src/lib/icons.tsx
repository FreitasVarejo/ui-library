// `@/lib/icons` da vitrine. No consumidor, esse arquivo é o `icons.ts` que o
// tema instala (um pacote só). Aqui os ícones seguem a marca escolhida em
// tempo de execução: cada nome semântico é um componente que lê o conjunto
// ativo, tirado de registry/themes/<marca>/icons.ts.
import { createElement, useSyncExternalStore } from "react"
import type { ComponentType, SVGProps } from "react"

import type { IconName } from "../../registry/themes/default/icons"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>
type IconSet = Record<IconName, IconComponent>

const modules = import.meta.glob<{ Icons: IconSet }>(
  "../../registry/themes/*/icons.ts",
  { eager: true }
)

const sets = new Map<string, IconSet>()
for (const [path, module] of Object.entries(modules)) {
  const brand = path.match(/themes\/([^/]+)\//)?.[1]
  if (brand) sets.set(brand, module.Icons)
}

let active = "default"
const listeners = new Set<() => void>()

export function setIconSet(brand: string) {
  if (!sets.has(brand) || brand === active) return
  active = brand
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function makeIcon(name: IconName): IconComponent {
  function Icon(props: SVGProps<SVGSVGElement>) {
    const brand = useSyncExternalStore(
      subscribe,
      () => active,
      () => active
    )
    const set = sets.get(brand) ?? sets.get("default")
    return set ? createElement(set[name], props) : null
  }
  Icon.displayName = `Icons.${name}`
  return Icon
}

const names = Object.keys(sets.get("default") ?? {}) as IconName[]

export const Icons = Object.fromEntries(
  names.map((name) => [name, makeIcon(name)])
) as IconSet

export type { IconName }
