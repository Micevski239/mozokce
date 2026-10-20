"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, FormError, FormNotice } from "./ui";

export interface FormState {
  error?: string;
  notice?: string;
}

/** Форма со серверска акција што враќа грешка или порака. */
export function ActionForm({
  action,
  children,
  submitLabel,
  variant = "secondary",
  className = "space-y-3",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <FormError message={state.error} />
      <FormNotice message={state.notice} />
      <Button type="submit" variant={variant} disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Копче за форма што бара потврда пред да се испрати. */
export function ConfirmSubmit({
  children,
  message,
  variant = "secondary",
  className = "",
}: {
  children: ReactNode;
  message: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
