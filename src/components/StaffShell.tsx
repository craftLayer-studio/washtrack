'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@astryxdesign/core/AppShell';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { Icon } from '@astryxdesign/core/Icon';
import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import {
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  InboxStackIcon,
  PlusCircleIcon,
  QrCodeIcon,
  SparklesIcon,
  TruckIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

type Role = 'owner' | 'staff' | 'rider';

const NAV: { href: string; label: string; icon: typeof PlusCircleIcon; roles: Role[] }[] = [
  { href: '/app', label: 'Orders', icon: InboxStackIcon, roles: ['owner', 'staff'] },
  { href: '/app/intake', label: 'New intake', icon: PlusCircleIcon, roles: ['owner', 'staff'] },
  { href: '/app/scan', label: 'Scan tag', icon: QrCodeIcon, roles: ['owner', 'staff', 'rider'] },
  { href: '/app/routes', label: 'Pickups & route', icon: TruckIcon, roles: ['owner', 'staff', 'rider'] },
  { href: '/app/customers', label: 'Customers', icon: UsersIcon, roles: ['owner', 'staff'] },
  { href: '/app/plans', label: 'Monthly plans', icon: CreditCardIcon, roles: ['owner', 'staff'] },
  { href: '/app/messages', label: 'WhatsApp outbox', icon: ChatBubbleLeftRightIcon, roles: ['owner', 'staff'] },
  { href: '/app/dashboard', label: 'Dashboard', icon: ChartBarIcon, roles: ['owner'] },
  { href: '/app/settings', label: 'Settings & QR', icon: Cog6ToothIcon, roles: ['owner'] },
];

export function StaffShell({ children, role, name, orgName, isDemo, openRequests }: { children: ReactNode; role: Role; name: string; orgName: string; isDemo: boolean; openRequests: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSelected = (href: string) => (href === '/app' ? pathname === '/app' || pathname.startsWith('/app/orders') : pathname.startsWith(href));
  return (
    <AppShell
      contentPadding={0}
      banner={
        isDemo ? (
          <Banner status="info" container="section" title="Demo business: all data is fictional. WhatsApp, SMS and payments are simulated." />
        ) : undefined
      }
      sideNav={
        <SideNav
          collapsible
          header={<SideNavHeading heading="WashTrack" subheading={orgName} icon={<NavIcon icon={<Icon icon={SparklesIcon} size="sm" />} />} headingHref="/app" />}
          footer={
            <SideNavSection title="Account" isHeaderHidden>
              <SideNavItem label={`${name} (${role})`} href="#" isDisabled />
              <SideNavItem
                label="Sign out"
                icon={ArrowRightOnRectangleIcon}
                onClick={async () => {
                  await api('/api/auth/logout', {});
                  router.push('/login');
                  router.refresh();
                }}
              />
            </SideNavSection>
          }>
          <SideNavSection title="Work" isHeaderHidden>
            {NAV.filter((n) => n.roles.includes(role)).map((n) => (
              <SideNavItem
                key={n.href}
                label={n.label}
                icon={n.icon}
                href={n.href}
                isSelected={isSelected(n.href)}
                endContent={n.href === '/app' && openRequests > 0 ? <Badge variant="warning" label={String(openRequests)} /> : undefined}
              />
            ))}
          </SideNavSection>
        </SideNav>
      }>
      {children}
    </AppShell>
  );
}
