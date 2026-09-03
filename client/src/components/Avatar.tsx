export function Avatar({
  avatar,
  name,
  size = 28,
  className = "",
}: {
  avatar?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || ""}
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-600 ${className}`}
    >
      {(name || "?")[0]?.toUpperCase()}
    </div>
  );
}
