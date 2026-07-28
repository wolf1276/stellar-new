"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4 py-10">
      <Card className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
        <h2 className="text-xl">Something went wrong</h2>
        <Alert variant="destructive">{error.message || "An unexpected error occurred."}</Alert>
        <Button onClick={reset}>Try again</Button>
      </Card>
    </div>
  );
}
