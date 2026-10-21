import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg py-10">
      <p className="eyebrow">404</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-1">Nothing at this address</h1>
      <p className="mt-3 text-ink-2">The post may have been closed, or the link is wrong.</p>
      <Link href="/" className="btn mt-6">Back to the board</Link>
    </div>
  );
}
