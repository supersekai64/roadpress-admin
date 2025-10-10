import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          Welcome to Next.js
        </h1>
        <p className="text-center text-muted-foreground">
          Next.js + shadcn/ui + Tailwind CSS + GSAP + Lenis
        </p>
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {`Cliquez sur l'icône en haut à droite pour changer de thème 🌓`}
          </p>
        </div>
      </div>
    </main>
  );
}
