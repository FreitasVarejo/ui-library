import { useState } from "react"

/**
 * Estado que pode ser do pai (`value` + `onChange`) ou da própria tabela.
 * Com `value` definido o componente é controlado: só o pai muda o valor.
 */
export function useControllable<T>(
  value: T | undefined,
  onChange: ((next: T) => void) | undefined,
  initial: T
): [T, (next: T | ((previous: T) => T)) => void] {
  const [internal, setInternal] = useState(initial)
  const controlled = value !== undefined
  const current = controlled ? value : internal

  function set(next: T | ((previous: T) => T)) {
    const resolved =
      typeof next === "function" ? (next as (previous: T) => T)(current) : next
    if (!controlled) setInternal(resolved)
    onChange?.(resolved)
  }

  return [current, set]
}
