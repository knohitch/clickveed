
import { Clapperboard } from "lucide-react";
import { cn } from "../lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <Clapperboard className="w-16 h-16 text-primary animate-spin" />
      <p className="text-muted-foreground font-semibold">Loading...</p>
    </div>
  );
}
