import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldProps {
  label: React.ReactNode
  labelClassName?: string
  error?: string
  hint?: string
  className?: string
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>
}

export function Field({ label, labelClassName, error, hint, className, children }: FieldProps) {
  const inputId = React.useId()
  const hintId = React.useId()
  const errorId = React.useId()
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined

  const field = React.cloneElement(children, {
    id: children.props.id ?? inputId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  })

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={children.props.id ?? inputId} className={labelClassName}>
        {label}
      </Label>
      {field}
      {hint && !error && <p id={hintId} className="text-[10px] text-zinc-500">{hint}</p>}
      {error && <p id={errorId} className="text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
