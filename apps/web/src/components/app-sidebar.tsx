'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'KPIs & charts' },
  { href: '/ask', label: 'Ask AI', icon: Sparkles, desc: 'Natural-language queries' },
];

function NavItems({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Icon className={cn('size-4 shrink-0', active && 'text-sidebar-primary')} />
            <span className="flex flex-col">
              <span>{item.label}</span>
              <span className="text-[11px] text-sidebar-foreground/50">{item.desc}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-sm">
        <Rocket className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Spaceship</span>
        <span className="text-[11px] text-sidebar-foreground/50">Logistics Analytics</span>
      </span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <Brand />
        <NavItems pathname={pathname} />
        <div className="mt-auto rounded-lg border bg-background/50 p-3 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">2025 dataset</p>
          <p>400 orders · read-only</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b bg-sidebar px-4 py-3 md:hidden">
        <Brand />
        <nav className="flex gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex size-9 items-center justify-center rounded-lg',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60',
                )}
              >
                <Icon className="size-4" />
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
