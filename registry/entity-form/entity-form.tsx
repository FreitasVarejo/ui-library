import { useEffect, useId, useState } from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDestructive } from "@/components/feedback"
import { Icons } from "@/lib/icons"
import { cn } from "@/lib/utils"

import { DEFAULT_LABELS } from "./types"
import type {
  EntityFormField,
  EntityFormLabels,
  EntityFormSubmitResult,
} from "./types"

export interface EntityFormProps<TValues extends FieldValues> {
  /** Esquema zod; os erros dele aparecem em cada campo. */
  schema: z.ZodType<TValues, TValues>
  defaultValues: DefaultValues<TValues>
  fields: EntityFormField<TValues>[]
  /**
   * Salva. Lance um erro (ou devolva `formError`) para o erro geral e devolva
   * `fieldErrors` para erros por campo. Resolver sem erro conta como salvo.
   */
  onSubmit: (
    values: TValues
  ) =>
    | void
    | EntityFormSubmitResult<TValues>
    | Promise<void | EntityFormSubmitResult<TValues>>
  /** Depois de salvar sem erro. */
  onSaved?: (values: TValues) => void

  title: ReactNode
  description?: ReactNode

  /** `page`: o formulário na página. `sheet`: dentro de um Sheet. */
  presentation?: "page" | "sheet"
  /** Sheet: aberto ou não, e pedido de fechar (já filtrado pelo aviso). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: "right" | "left" | "bottom" | "top"
  /** Página: cancelar (por exemplo, voltar). Sem isto, não há botão. */
  onCancel?: () => void
  /** Para o roteador avisar de saída da página com alterações não salvas. */
  onDirtyChange?: (dirty: boolean) => void

  /** Campos próprios, depois dos declarados em `fields`. */
  children?: (form: UseFormReturn<TValues>) => ReactNode
  labels?: Partial<EntityFormLabels>
  className?: string
}

function FieldInput<TValues extends FieldValues>({
  field,
  form,
  idPrefix,
}: {
  field: EntityFormField<TValues>
  form: UseFormReturn<TValues>
  idPrefix: string
}) {
  const id = `${idPrefix}-${field.name}`
  return (
    <Controller
      name={field.name}
      control={form.control}
      render={({ field: control, fieldState }) => {
        const invalid = fieldState.invalid
        const type = field.type ?? "text"
        const error = invalid ? (
          <FieldError errors={[fieldState.error]} />
        ) : null
        const description = field.description ? (
          <FieldDescription>{field.description}</FieldDescription>
        ) : null

        if (type === "checkbox") {
          return (
            <Field orientation="horizontal" data-invalid={invalid}>
              <Checkbox
                id={id}
                checked={!!control.value}
                onCheckedChange={(value) => control.onChange(!!value)}
                onBlur={control.onBlur}
                disabled={field.disabled}
                aria-invalid={invalid}
              />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
                {description}
                {error}
              </div>
            </Field>
          )
        }

        return (
          <Field data-invalid={invalid}>
            <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
            {type === "textarea" ? (
              <Textarea
                {...control}
                value={control.value ?? ""}
                id={id}
                rows={field.rows ?? 4}
                placeholder={field.placeholder}
                disabled={field.disabled}
                aria-invalid={invalid}
              />
            ) : type === "select" ? (
              <Select
                items={field.options ?? []}
                value={control.value || null}
                onValueChange={(value) => control.onChange(value ?? "")}
                disabled={field.disabled}
              >
                <SelectTrigger
                  id={id}
                  ref={control.ref}
                  onBlur={control.onBlur}
                  aria-invalid={invalid}
                  className="w-full"
                >
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                {...control}
                value={control.value ?? ""}
                onChange={(event) =>
                  control.onChange(
                    type === "number"
                      ? event.target.value === ""
                        ? undefined
                        : event.target.valueAsNumber
                      : event.target.value
                  )
                }
                id={id}
                type={type}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                disabled={field.disabled}
                aria-invalid={invalid}
              />
            )}
            {description}
            {error}
          </Field>
        )
      }}
    />
  )
}

/**
 * Formulário de criar ou editar sobre react-hook-form + zod e o `field` do
 * shadcn (o caminho que a documentação dele traz para Base UI). Exibe como
 * página ou dentro de um Sheet; no Sheet, fechar com alterações pede
 * confirmação antes de descartar.
 */
export function EntityForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  fields,
  onSubmit,
  onSaved,
  title,
  description,
  presentation = "page",
  open = false,
  onOpenChange,
  side = "right",
  onCancel,
  onDirtyChange,
  children,
  labels: labelsProp,
  className,
}: EntityFormProps<TValues>) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp }
  const idPrefix = useId()
  const sheet = presentation === "sheet"
  const form = useForm<TValues, unknown, TValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const { isDirty, isSubmitting } = form.formState
  const [formError, setFormError] = useState<string | null>(null)
  const [discarding, setDiscarding] = useState(false)

  // Avisa o pai quando a edição começa ou termina (para bloquear a navegação).
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const submit = form.handleSubmit(async (values) => {
    setFormError(null)
    try {
      const result = await onSubmit(values)
      const fieldErrors = Object.entries(result?.fieldErrors ?? {})
      for (const [name, message] of fieldErrors)
        form.setError(name as never, {
          type: "server",
          message: String(message),
        })
      if (result?.formError) setFormError(result.formError)
      if (fieldErrors.length > 0 || result?.formError) return
      form.reset(values)
      onSaved?.(values)
      if (sheet) onOpenChange?.(false)
    } catch (error) {
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : labels.submitError
      )
    }
  })

  function requestClose() {
    if (isSubmitting) return
    if (form.formState.isDirty) setDiscarding(true)
    else onOpenChange?.(false)
  }

  function discard() {
    form.reset()
    setFormError(null)
    onOpenChange?.(false)
  }

  const body = (
    <>
      <div
        className={cn("flex flex-col gap-4", sheet && "overflow-y-auto px-4")}
      >
        {formError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <p className="font-medium">{labels.generalErrorTitle}</p>
            <p>{formError}</p>
          </div>
        ) : null}
        <FieldGroup>
          {fields.map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              form={form}
              idPrefix={idPrefix}
            />
          ))}
          {children?.(form)}
        </FieldGroup>
      </div>
      <FooterActions
        sheet={sheet}
        submitting={isSubmitting}
        labels={labels}
        onCancel={sheet ? requestClose : onCancel}
      />
    </>
  )

  const formElement = (
    <form
      noValidate
      onSubmit={submit}
      aria-busy={isSubmitting || undefined}
      className={cn(
        "flex flex-col gap-6",
        sheet && "min-h-0 flex-1 gap-4",
        !sheet && className
      )}
    >
      {body}
    </form>
  )

  if (!sheet) {
    return (
      <section data-slot="entity-form" className="flex flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
        {formElement}
      </section>
    )
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange?.(true)
          else requestClose()
        }}
      >
        <SheetContent side={side} className={className}>
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          {formElement}
        </SheetContent>
      </Sheet>
      <ConfirmDestructive
        open={discarding}
        onOpenChange={setDiscarding}
        onConfirm={discard}
        title={labels.discardTitle}
        description={labels.discardDescription}
        confirmLabel={labels.discardConfirm}
        cancelLabel={labels.keepEditing}
      />
    </>
  )
}

function FooterActions({
  sheet,
  submitting,
  labels,
  onCancel,
}: {
  sheet: boolean
  submitting: boolean
  labels: EntityFormLabels
  onCancel?: () => void
}) {
  const buttons = (
    <>
      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <Icons.loading
            data-icon="inline-start"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {submitting ? labels.submitting : labels.submit}
      </Button>
      {onCancel ? (
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={onCancel}
        >
          {labels.cancel}
        </Button>
      ) : null}
    </>
  )
  return sheet ? (
    <SheetFooter>{buttons}</SheetFooter>
  ) : (
    <div className="flex flex-wrap items-center gap-2">{buttons}</div>
  )
}
