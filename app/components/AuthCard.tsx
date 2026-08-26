import Link from "next/link";
import { Logo } from "./ui/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  afterCard?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, afterCard }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-sky-800 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-[1.75rem] p-8 text-white shadow-2xl shadow-blue-950/40 sm:p-10">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <span className="inline-block rounded-2xl bg-white/90 p-3 shadow-lg">
                <Logo className="h-10" />
              </span>
            </Link>
            <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-sky-100/80">{subtitle}</p>
          </div>
          {children}
        </div>
        {afterCard}
      </div>
    </div>
  );
}
