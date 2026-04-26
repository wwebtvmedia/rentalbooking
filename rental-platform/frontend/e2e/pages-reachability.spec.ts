import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/collections', title: 'Our Collection', heading: 'The Collection.' },
  { path: '/concierge', title: 'Concierge Services', heading: 'At your service.' },
  { path: '/owners', title: 'For Property Owners', heading: 'List your property.' },
  { path: '/story', title: 'Our Story', heading: 'The bestflats.vip Story.' },
  { path: '/privacy', title: 'Privacy Policy', heading: 'Privacy Policy.' },
  { path: '/terms', title: 'Terms of Service', heading: 'Terms of Service.' },
  { path: '/help', title: 'Help Centre', heading: 'How can we help?' },
  { path: '/safety', title: 'Safety Guidelines', heading: 'Safety First.' },
  { path: '/cancellation', title: 'Cancellation Policies', heading: 'Flexible Stays.' },
  { path: '/vision', title: 'Our Vision', heading: 'The Future of Living.' },
  { path: '/team', title: 'Join the Team', heading: 'Build the Exceptional.' },
  { path: '/journal', title: 'The Journal', heading: 'Journal.' },
  { path: '/admin/dashboard', title: 'Platform Intelligence', heading: 'Platform Dashboard.' },
  { path: '/host/dashboard', title: 'Host Management', heading: 'Host Analytics.' },
  { path: '/concierge/dashboard', title: 'Concierge Intelligence', heading: 'Concierge Hub.' },
];

test.describe('Pages Reachability', () => {
  for (const pageInfo of PAGES) {
    test(`should reach ${pageInfo.path} and display correct content`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      // Verify Title
      await expect(page).toHaveTitle(new RegExp(pageInfo.title, 'i'));
      
      // Verify Heading
      const heading = page.locator('h1');
      await expect(heading).toContainText(pageInfo.heading);
      
      // Verify Layout (Header/Footer existence)
      await expect(page.locator('header.site-header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    });
  }
});
