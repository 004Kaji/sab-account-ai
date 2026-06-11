import { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase'

const BASE = 'https://sabaccountai.com'

const STATIC_ENTRIES: MetadataRoute.Sitemap = [
  { url: BASE,                      lastModified: new Date(),              changeFrequency: 'weekly',  priority: 1    },
  { url: `${BASE}/signup`,          lastModified: new Date(),              changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/login`,           lastModified: new Date(),              changeFrequency: 'monthly', priority: 0.7  },
  { url: `${BASE}/terms`,           lastModified: new Date('2026-05-20'),  changeFrequency: 'yearly',  priority: 0.3  },
  { url: `${BASE}/privacy`,         lastModified: new Date('2026-05-20'),  changeFrequency: 'yearly',  priority: 0.3  },
  { url: `${BASE}/payday-super`,    lastModified: new Date(),              changeFrequency: 'monthly', priority: 0.8  },
  { url: `${BASE}/blog`,            lastModified: new Date(),              changeFrequency: 'weekly',  priority: 0.8  },
  { url: `${BASE}/ato-verification`,lastModified: new Date('2026-05-25'),  changeFrequency: 'yearly',  priority: 0.6  },

  // Static blog posts
  { url: `${BASE}/blog/instant-asset-write-off-2026`,                   lastModified: new Date('2026-06-02'), changeFrequency: 'monthly', priority: 0.95 },
  { url: `${BASE}/blog/eofy-checklist-sole-trader-2026`,                lastModified: new Date('2026-06-02'), changeFrequency: 'monthly', priority: 0.95 },
  { url: `${BASE}/blog/payday-super-2026`,                              lastModified: new Date('2026-05-25'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/best-invoicing-software-australia-sole-trader`,  lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/xero-alternatives-australia`,                    lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/payslip-requirements-australia`,                 lastModified: new Date('2026-06-11'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/casual-employee-payroll-australia`,              lastModified: new Date('2026-06-11'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/work-from-home-tax-deductions-australia-2026`,   lastModified: new Date('2026-06-11'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/contractor-vs-employee-australia`,               lastModified: new Date('2026-06-11'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/payroll-tax-australia-2026`,                     lastModified: new Date('2026-06-11'), changeFrequency: 'monthly', priority: 0.9  },
  { url: `${BASE}/blog/how-to-register-gst-australia`,                  lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/bas-due-dates-australia-2026`,                   lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/sole-trader-tax-deductions-australia`,           lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/accounting-software-tradies-australia`,          lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/how-much-tax-sole-trader-australia`,             lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/do-sole-traders-pay-super-australia`,            lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/single-touch-payroll-small-business-australia`,  lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/how-to-pay-super-employees-australia`,           lastModified: new Date('2026-06-07'), changeFrequency: 'monthly', priority: 0.85 },
  { url: `${BASE}/blog/gst-invoice-template-australia`,                 lastModified: new Date('2026-05-15'), changeFrequency: 'monthly', priority: 0.7  },
  { url: `${BASE}/blog/payg-withholding-calculator-australia`,          lastModified: new Date('2026-05-12'), changeFrequency: 'monthly', priority: 0.7  },
  { url: `${BASE}/blog/medicare-levy-exemption-international-students`, lastModified: new Date('2026-05-08'), changeFrequency: 'monthly', priority: 0.7  },
  { url: `${BASE}/blog/super-guarantee-rate-australia-2025`,            lastModified: new Date('2026-05-02'), changeFrequency: 'monthly', priority: 0.7  },
  { url: `${BASE}/blog/abn-contractor-tax-australia`,                   lastModified: new Date('2026-04-28'), changeFrequency: 'monthly', priority: 0.7  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pull agent-generated posts from Supabase
  let dbEntries: MetadataRoute.Sitemap = []
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    dbEntries = (data ?? []).map((p: { slug: string; updated_at: string }) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    }))
  } catch { /* non-fatal — static entries still render */ }

  return [...STATIC_ENTRIES, ...dbEntries]
}
