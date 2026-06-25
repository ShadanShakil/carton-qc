import { Lightbulb, Info, CircleCheck, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "./cn";

type Tone = "brand" | "info" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, { wrap: string; icon: string }> = {
  brand: {
    wrap: "border-blue-100 bg-blue-50/60",
    icon: "bg-blue-100 text-blue-700",
  },
  info: {
    wrap: "border-sky-100 bg-sky-50/60",
    icon: "bg-sky-100 text-sky-700",
  },
  success: {
    wrap: "border-emerald-100 bg-emerald-50/60",
    icon: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    wrap: "border-amber-100 bg-amber-50/60",
    icon: "bg-amber-100 text-amber-700",
  },
  danger: {
    wrap: "border-red-100 bg-red-50/60",
    icon: "bg-red-100 text-red-700",
  },
};

export function Callout({
  title,
  children,
  tone = "brand",
  icon,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}) {
  const t = toneStyles[tone];
  const fallbackIcon =
    tone === "success" ? (
      <CircleCheck size={16} />
    ) : tone === "info" ? (
      <Info size={16} />
    ) : tone === "warning" ? (
      <AlertTriangle size={16} />
    ) : tone === "danger" ? (
      <AlertCircle size={16} />
    ) : (
      <Lightbulb size={16} />
    );
  return (
    <div
      className={cn("rounded-xl border p-4", t.wrap, className)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg",
            t.icon,
          )}
        >
          {icon ?? fallbackIcon}
        </div>
        <div className="text-sm text-slate-800">
          {title && (
            <span className="font-semibold text-slate-900">{title} </span>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
