import type { IconName } from '../shared/ui/Icon';

export type Portal = 'admin' | 'reseller' | 'customer';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: IconName;
  /** Roadmap phase in which the screen ships (§11 of the plan). */
  readonly phase: number;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

/** Information architecture per portal (plan §7.1). */
export const NAVIGATION: Record<Portal, readonly NavSection[]> = {
  admin: [
    {
      title: 'Overview',
      items: [
        { to: '/', label: 'Dashboard', icon: 'dashboard', phase: 0 },
        { to: '/rate-quote', label: 'Rate Simulator', icon: 'calculator', phase: 0 },
      ],
    },
    {
      title: 'Operations',
      items: [
        { to: '/accounts', label: 'Accounts', icon: 'users', phase: 1 },
        { to: '/carriers', label: 'Carriers & Trunks', icon: 'layers', phase: 2 },
        { to: '/rate-decks', label: 'Rate Decks', icon: 'deck', phase: 2 },
        { to: '/cdr-imports', label: 'CDR Imports', icon: 'upload', phase: 3 },
        { to: '/numbers', label: 'Numbers (DIDs)', icon: 'hash', phase: 4 },
      ],
    },
    {
      title: 'Finance',
      items: [
        { to: '/billing', label: 'Billing', icon: 'invoice', phase: 4 },
        { to: '/payments', label: 'Payments', icon: 'card', phase: 5 },
        { to: '/reports', label: 'Reports', icon: 'chart', phase: 7 },
      ],
    },
    {
      title: 'System',
      items: [
        { to: '/support', label: 'Support', icon: 'ticket', phase: 7 },
        { to: '/audit', label: 'Audit Log', icon: 'shield', phase: 1 },
        { to: '/settings', label: 'Settings', icon: 'settings', phase: 1 },
        { to: '/webhooks', label: 'Webhooks', icon: 'layers', phase: 5 },
      ],
    },
  ],
  reseller: [
    {
      title: 'Overview',
      items: [
        { to: '/', label: 'Dashboard', icon: 'dashboard', phase: 0 },
        { to: '/rate-quote', label: 'Rate Simulator', icon: 'calculator', phase: 0 },
      ],
    },
    {
      title: 'Business',
      items: [
        { to: '/accounts', label: 'Customers', icon: 'users', phase: 1 },
        { to: '/rate-decks', label: 'Markup Decks', icon: 'deck', phase: 2 },
        { to: '/reports', label: 'Margin & Commission', icon: 'chart', phase: 7 },
        { to: '/settings', label: 'Branding', icon: 'settings', phase: 7 },
        { to: '/support', label: 'Support', icon: 'ticket', phase: 7 },
      ],
    },
  ],
  customer: [
    {
      title: 'Overview',
      items: [
        { to: '/', label: 'Dashboard', icon: 'dashboard', phase: 0 },
        { to: '/rate-quote', label: 'Rate Lookup', icon: 'calculator', phase: 0 },
      ],
    },
    {
      title: 'Account',
      items: [
        { to: '/cdrs', label: 'Call Records', icon: 'phone', phase: 3 },
        { to: '/billing', label: 'Invoices', icon: 'invoice', phase: 4 },
        { to: '/payments', label: 'Top-up & Payments', icon: 'card', phase: 5 },
        { to: '/numbers', label: 'Numbers & SIP', icon: 'hash', phase: 4 },
        { to: '/support', label: 'Support', icon: 'ticket', phase: 7 },
      ],
    },
  ],
};

export const PHASE_NAMES: Record<number, string> = {
  0: 'Foundation',
  1: 'Identity & Accounts',
  2: 'Rate Management',
  3: 'CDR & Rating',
  4: 'Billing & Ledger',
  5: 'Payments',
  6: 'API & Webhooks',
  7: 'Reports, Support & Polish',
};
