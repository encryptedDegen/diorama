import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Providers } from "@/components/providers";

export const metadata: Metadata = { title: "Diorama", description: "Palatial 3D asset studio" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers><main className="shell"><nav className="nav"><Link className="brand" href="/">Diorama</Link><div className="links"><Link className="btn" href="/">Library</Link><Link className="btn" href="/scenes">Scene Builder</Link></div></nav>{children}</main></Providers></body></html>;
}
