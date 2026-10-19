import { Brand } from "@/components/brand";
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <Brand />
      <p className="mt-16 text-xs tracking-widest text-muted-foreground">404</p>
      <h1 className="editorial mt-4 text-5xl">A little off the path.</h1>
      <p className="mt-5 text-sm text-muted-foreground">
        This page could not be found. / No encontramos esta página.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground"
      >
        Back to Aureform · Volver a Aureform →
      </Link>
    </main>
  );
}
