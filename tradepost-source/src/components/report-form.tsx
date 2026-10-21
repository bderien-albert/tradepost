import { report } from "@/app/actions";
import { ActionForm, SubmitButton } from "./forms";

export function ReportForm({ targetType, targetId, label = "Report" }: { targetType: "post" | "user" | "trade"; targetId: string; label?: string }) {
  return (
    <details className="text-sm group">
      <summary className="cursor-pointer text-ink-3 hover:text-sell list-none">{label}</summary>
      <ActionForm action={report} className="mt-3 space-y-2" resetOnOk>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <textarea name="reason" rows={2} className="field" placeholder="What's wrong? (scam, real-money offer, rude…)" required />
        <SubmitButton className="btn btn-ghost btn-sm">Send report</SubmitButton>
      </ActionForm>
    </details>
  );
}
