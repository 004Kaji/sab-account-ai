import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'

// ── Types matching spark.ts SparkBlogPost ──────────────────────────────

interface BlogSection {
  heading:        string
  body:           string
  bullets?:       string[]
  bullets_label?: string
  callout?:       string
}

interface BlogPost {
  slug:          string
  title:         string
  description:   string
  excerpt:       string
  tag:           string
  quick_answer:  string
  ai_summary?:   string | null   // GEO: authoritative summary for AI engines
  intro:         string
  sections:      BlogSection[]
  faqs:          Array<{ question: string; answer: string }>
  cta_text:      string
  related_slugs: string[]
  date_published: string
  read_time:     string
  image_url?:    string | null
  status:        string
  updated_at:    string
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
    if (error || !data) return null
    return data as BlogPost
  } catch {
    return null
  }
}

// ── Metadata ────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Not Found' }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://sabaccountai.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://sabaccountai.com/blog/${post.slug}`,
      siteName: 'SAB Account AI',
      locale: 'en_AU',
      type: 'article',
    },
  }
}

// ── Page ─────────────────────────────────────────────────────────────────

export default async function DynamicBlogPostPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    abstract: post.ai_summary ?? post.description,
    datePublished: post.updated_at ?? new Date().toISOString(),
    dateModified:  post.updated_at ?? new Date().toISOString(),
    author:    { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
    publisher: { '@type': 'Organization', name: 'SAB Account AI', url: 'https://sabaccountai.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://sabaccountai.com/blog/${post.slug}` },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['[data-geo-summary]', '[data-quick-answer]'],
    },
  }

  const faqSchema = post.faqs?.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: post.faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Back */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/blog" style={{ color: 'var(--ember)', fontSize: '0.875rem', textDecoration: 'none' }}>← Blog</Link>
        </div>

        {/* Hero image */}
        {post.image_url && (
          <div style={{ marginBottom: '2rem', borderRadius: 'var(--r)', overflow: 'hidden', maxHeight: '360px' }}>
            <img
              src={post.image_url}
              alt={post.title}
              style={{ width: '100%', height: '360px', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Tag */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{
            background: 'var(--ember-p)', color: 'var(--ember)',
            fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem',
            borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{post.tag}</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          color: 'var(--char)', lineHeight: 1.2, marginBottom: '0.75rem',
        }}>
          {post.title}
        </h1>

        {/* Meta */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text3)', marginBottom: '2rem' }}>
          {post.date_published} · {post.read_time}
        </p>

        {/* Quick answer box — data-quick-answer used by GEO speakable schema */}
        {post.quick_answer && (
          <div data-quick-answer style={{
            background: 'var(--ember-p)', border: '1px solid rgba(200,75,47,0.2)',
            borderRadius: 'var(--r2)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem',
          }}>
            <p style={{ fontWeight: 700, color: 'var(--ember)', margin: '0 0 0.5rem', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quick Answer
            </p>
            <p style={{ color: 'var(--char)', margin: 0, lineHeight: 1.6 }}>{post.quick_answer}</p>
          </div>
        )}

        {/* GEO summary — machine-readable authoritative statement for AI engines */}
        {post.ai_summary && (
          <p data-geo-summary style={{ display: 'none' }}>{post.ai_summary}</p>
        )}

        {/* Intro */}
        {post.intro && post.intro.split('\n\n').map((para, i) => (
          <p key={i} style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem', fontSize: '1.05rem' }}>
            {para}
          </p>
        ))}

        {/* Sections */}
        {post.sections?.map((section, si) => (
          <div key={si}>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem',
              color: 'var(--char)', margin: '2.5rem 0 1rem',
            }}>
              {section.heading}
            </h2>

            {section.body && section.body.split('\n\n').map((para, pi) => (
              <p key={pi} style={{ color: 'var(--text2)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
                {para}
              </p>
            ))}

            {section.callout && (
              <div style={{
                background: 'white', border: '1px solid var(--border)',
                borderLeft: '4px solid var(--ember)', borderRadius: 'var(--r2)',
                padding: '1rem 1.25rem', marginBottom: '1.5rem',
              }}>
                <p style={{ color: 'var(--char)', margin: 0, fontWeight: 500, lineHeight: 1.6 }}>{section.callout}</p>
              </div>
            )}

            {section.bullets && section.bullets.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {section.bullets_label && (
                  <p style={{ fontWeight: 600, color: 'var(--char)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    {section.bullets_label}
                  </p>
                )}
                <ul style={{ color: 'var(--text2)', lineHeight: 2, paddingLeft: '1.5rem' }}>
                  {section.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* CTA */}
        <div style={{
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--r2)', padding: '2rem', textAlign: 'center', margin: '3rem 0',
        }}>
          <p style={{ fontFamily: 'var(--font-fraunces)', fontSize: '1.25rem', color: 'var(--char)', marginBottom: '0.5rem' }}>
            {post.cta_text ?? 'Manage your invoicing and payroll in one place'}
          </p>
          <p style={{ color: 'var(--text2)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            SAB Account AI — ATO-compliant invoicing and payslips for Australian small businesses. From $9/mo.
          </p>
          <Link href="/signup" style={{
            display: 'inline-block', background: 'var(--ember)', color: 'white',
            padding: '0.75rem 2rem', borderRadius: 'var(--r)', fontWeight: 600,
            textDecoration: 'none', fontSize: '0.95rem',
          }}>
            Start free trial
          </Link>
        </div>

        {/* FAQs */}
        {post.faqs?.length > 0 && (
          <>
            <h2 style={{
              fontFamily: 'var(--font-fraunces)', fontSize: '1.5rem',
              color: 'var(--char)', margin: '2.5rem 0 1rem',
            }}>
              Frequently asked questions
            </h2>
            {post.faqs.map((faq) => (
              <div key={faq.question} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--char)', marginBottom: '0.5rem' }}>
                  {faq.question}
                </h3>
                <p style={{ color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>{faq.answer}</p>
              </div>
            ))}
          </>
        )}

        {/* Related */}
        {post.related_slugs?.length > 0 && (
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
              Related:{' '}
              {post.related_slugs.map((s, i) => (
                <span key={s}>
                  <Link href={`/blog/${s}`} style={{ color: 'var(--ember)' }}>
                    {s.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Link>
                  {i < post.related_slugs.length - 1 && ' · '}
                </span>
              ))}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
