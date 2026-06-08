import { MetadataRoute } from 'next'

const BASE = 'https://sabaccountai.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/signup`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/terms`,
      lastModified: new Date('2026-05-20'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date('2026-05-20'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE}/payday-super`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/blog/instant-asset-write-off-2026`,
      lastModified: new Date('2026-06-02'),
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${BASE}/blog/eofy-checklist-sole-trader-2026`,
      lastModified: new Date('2026-06-02'),
      changeFrequency: 'monthly',
      priority: 0.95,
    },
    {
      url: `${BASE}/blog/payday-super-2026`,
      lastModified: new Date('2026-05-25'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/blog/gst-invoice-template-australia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/payg-withholding-calculator-australia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/medicare-levy-exemption-international-students`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/super-guarantee-rate-australia-2025`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/abn-contractor-tax-australia`,
      lastModified: new Date('2026-04-28'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/blog/best-invoicing-software-australia-sole-trader`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/blog/xero-alternatives-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/blog/how-to-register-gst-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/bas-due-dates-australia-2026`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/sole-trader-tax-deductions-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/accounting-software-tradies-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/how-much-tax-sole-trader-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/do-sole-traders-pay-super-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/single-touch-payroll-small-business-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/blog/how-to-pay-super-employees-australia`,
      lastModified: new Date('2026-06-07'),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${BASE}/ato-verification`,
      lastModified: new Date('2026-05-25'),
      changeFrequency: 'yearly',
      priority: 0.6,
    },
  ]
}
