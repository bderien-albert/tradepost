import { LogoMark } from "./logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
      <div className="hidden md:flex flex-col justify-between rounded-[32px] bg-brand text-white p-8">
        <LogoMark size={64} />
        <div>
          <p className="font-display text-4xl font-extrabold tracking-tight leading-[1]">Your logs.<br />Your price.<br />Your deal.</p>
          <p className="mt-4 text-white/85">Buy and sell game items for in-game currency, with every trade on the record.</p>
        </div>
      </div>
      <div className="panel p-6 sm:p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="text-ink-2 mt-1.5 text-sm leading-relaxed">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
