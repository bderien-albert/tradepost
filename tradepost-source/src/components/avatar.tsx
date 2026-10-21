export function Avatar({ user, size = 28 }: { user: { username: string; avatarColor?: string | null; avatarUrl?: string | null }; size?: number }) {
  const color = user.avatarColor ?? "#ff5a36";
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display font-extrabold text-white shrink-0 select-none"
      style={{ width: size, height: size, background: color, fontSize: size * 0.45 }}
      aria-hidden="true"
    >
      {user.username[0]?.toUpperCase()}
    </span>
  );
}
