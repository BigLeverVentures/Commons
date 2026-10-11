export function StatsCard({
  label,
  value,
  color,
  subtitle,
}: {
  label: string
  value: number
  color?: string
  subtitle?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--obsidian)]/10 bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--obsidian-muted)] mb-1">{label}</p>
      <p
        className="text-2xl font-semibold"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-[var(--obsidian-muted)] mt-1">{subtitle}</p>
      )}
    </div>
  )
}
