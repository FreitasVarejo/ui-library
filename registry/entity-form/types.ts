import type { ReactNode } from "react"
import type { FieldValues, Path } from "react-hook-form"

export type EntityFieldType =
  "text" | "email" | "url" | "number" | "textarea" | "select" | "checkbox"

export interface EntityFieldOption {
  value: string
  label: string
}

export interface EntityFormField<TValues extends FieldValues> {
  name: Path<TValues>
  label: string
  /** Padrão: `text`. */
  type?: EntityFieldType
  description?: ReactNode
  placeholder?: string
  /** Opções do `select`. */
  options?: EntityFieldOption[]
  rows?: number
  disabled?: boolean
  autoComplete?: string
}

/** O que `onSubmit` pode devolver para mostrar erros que só o servidor sabe. */
export interface EntityFormSubmitResult<TValues extends FieldValues> {
  fieldErrors?: Partial<Record<Path<TValues>, string>>
  formError?: string
}

export interface EntityFormLabels {
  submit: string
  submitting: string
  cancel: string
  submitError: string
  generalErrorTitle: string
  discardTitle: string
  discardDescription: string
  discardConfirm: string
  keepEditing: string
}

export const DEFAULT_LABELS: EntityFormLabels = {
  submit: "Salvar",
  submitting: "Salvando…",
  cancel: "Cancelar",
  submitError: "Não foi possível salvar. Tente de novo.",
  generalErrorTitle: "Não foi possível salvar",
  discardTitle: "Descartar as alterações?",
  discardDescription: "O que você editou ainda não foi salvo e será perdido.",
  discardConfirm: "Descartar",
  keepEditing: "Continuar editando",
}
