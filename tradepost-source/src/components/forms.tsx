"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

const Pending = createContext(false);

export function SubmitButton({ children, className = "btn", pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending: formPending } = useFormStatus();
  const pending = useContext(Pending) || formPending;
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}

// Submits through onSubmit rather than the form action prop, so React doesn't
// clear what the user typed when the server sends back an error.
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
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state && !state.error) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <Pending.Provider value={pending}>{children}</Pending.Provider>
      {state?.error && <p className="text-sm font-semibold text-sell mt-2" role="alert">{state.error}</p>}
      {state?.ok && <p className="text-sm font-semibold text-buy mt-2" role="status">{state.ok}</p>}
    </form>
  );
}
