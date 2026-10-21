"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

export function SubmitButton({ children, className = "btn", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  className,
  resetOnOk,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state && !state.error) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.error && <p className="text-sm text-sell mt-2" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm text-buy mt-2" role="status">{state.ok}</p>}
    </form>
  );
}
