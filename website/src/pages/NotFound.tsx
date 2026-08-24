import { FileQuestion } from "lucide-react";
import GlassCard from "@/components/GlassCard";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <GlassCard className="mx-auto max-w-md p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <FileQuestion className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-semibold text-text-primary">404</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The page you're looking for doesn't exist or hasn't been built yet.
        </p>
      </GlassCard>
    </div>
  );
}
