import type { ReactNode } from "react"

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** Moldura para um estado: rótulo pequeno e borda tracejada. */
export function Specimen({
  label,
  children,
  className = "",
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <figure className={`flex min-w-0 flex-col gap-2 ${className}`}>
      <figcaption className="font-mono text-xs text-muted-foreground">
        {label}
      </figcaption>
      <div className="min-w-0 rounded-lg border bg-card p-4 text-card-foreground">
        {children}
      </div>
    </figure>
  )
}
