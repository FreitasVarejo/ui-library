import type { Timestamp } from "./types"

export function toMillis(value: Timestamp | undefined): number | undefined {
  if (value === undefined) return undefined
  const millis =
    value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isNaN(millis) ? undefined : millis
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" })

/** “há 5 minutos”, “agora”. `now` e `then` em milissegundos. */
export function formatRelative(then: number, now: number): string {
  const seconds = Math.round((then - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 5) return "agora"
  if (abs < 60) return relative.format(seconds, "second")
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute")
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour")
  return relative.format(Math.round(seconds / 86400), "day")
}

/** “45 s”, “2 min 5 s”, “1 h 3 min”. */
export function formatDuration(millis: number): string {
  const total = Math.max(0, Math.round(millis / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  if (minutes > 0)
    return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`
  return `${seconds} s`
}
