import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center">
      <Image
        src="/findit-logo-transparent.png"
        alt="FindIt"
        width={112}
        height={64}
        priority
        className={cn("w-auto", className)}
      />
    </Link>
  );
}
