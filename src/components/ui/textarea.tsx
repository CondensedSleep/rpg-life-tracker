import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full corner-clip-sm border border-border-subtle bg-bg-card px-3 py-2 text-sm text-text-primary transition-all duration-200 placeholder:text-text-tertiary hover:border-text-tertiary focus-visible:outline-none focus-visible:border-accent-red focus-visible:border-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-bg-card-secondary",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
