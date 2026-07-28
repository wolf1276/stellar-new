import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4 py-10">
      <Card className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
        <h2 className="text-xl">Page not found</h2>
        <p className="text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/">
          <Button>Back home</Button>
        </Link>
      </Card>
    </div>
  );
}
