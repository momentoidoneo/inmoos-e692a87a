import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({ name, size = 28, className }: { name?: string; size?: number; className?: string }) {
  const label = name ? initials(name) : "—";
  return (
    <div
      className={cn("rounded-full bg-primary/10 text-primary grid place-items-center font-medium", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {label}
    </div>
  );
}
