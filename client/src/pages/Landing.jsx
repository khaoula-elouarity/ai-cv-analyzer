import { Link } from 'react-router-dom';
import {
  Zap, Target, Briefcase, Tags, ArrowRight, ScanText, FileSearch, Gauge,
} from 'lucide-react';
import { useAuth } from '../context/authContext';
import Card from '../components/ui/Card';
import Meteors from '../components/ui/Meteors';
import Text3DFlip from '../components/ui/Text3DFlip';

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant analysis',
    body: 'Upload and get a full breakdown in seconds — no queues, no manual formatting, no waiting on a review queue.',
  },
  {
    icon: Target,
    title: 'Scoring you can audit',
    body: 'A single match score broken down by category, so you can see exactly which section is holding the number back.',
  },
  {
    icon: Briefcase,
    title: 'Job matching',
    body: 'Compare your CV against a job description and see the overlap, the gaps, and how well the role actually fits.',
  },
  {
    icon: Tags,
    title: 'Missing keywords',
    body: 'The exact terms recruiters filter on that your CV never mentions, ranked so you know what to add first.',
  },
];

const STEPS = [
  { icon: FileSearch, title: 'Upload', body: 'PDF or Word, typed or scanned.' },
  { icon: ScanText, title: 'Read', body: 'OCR recovers text from photos and scans.' },
  { icon: Gauge, title: 'Score', body: 'Skills, score and gaps, ready to act on.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <LandingNav isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
          {/* Falling light streaks. First in the DOM so the glows and the hero
              copy both paint over them. */}
          <Meteors number={30} />

          {/* Brand glows. Decorative, so they stay out of the a11y tree. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 size-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-berry-600/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-24 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-plum-600/20 blur-3xl"
          />

          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[--color-line] bg-[--color-surface-1]/80 px-3.5 py-1.5 text-xs font-medium text-[--color-muted] backdrop-blur">
              <span className="size-1.5 rounded-full bg-berry-400" aria-hidden="true" />
              AI CV Analyzer &amp; Job Matcher
            </p>

            {/* Hover (or tap) the headline to flip it. */}
            <Text3DFlip
              as="h1"
              rotateDirection="top"
              staggerDuration={0.03}
              staggerFrom="first"
              transition={{ type: 'spring', damping: 25, stiffness: 160 }}
              className="mt-7 justify-center text-[28px] font-semibold leading-tight sm:text-4xl md:text-5xl lg:text-[56px]"
              textClassName="text-[--color-ink]"
              flipTextClassName="text-berry-300"
            >
              Welcome to CVision AI
            </Text3DFlip>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[--color-muted] sm:text-lg">
              CVision AI is an intelligent CV analyser powered by large language models and
              OCR. Drop in a PDF, a Word file, or a photo of a printed CV — it reads the text,
              scores your profile, and tells you precisely what to change before you apply.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/upload" className="btn btn-primary w-full sm:w-auto">
                Upload your CV <ArrowRight className="size-4" />
              </Link>
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-ghost w-full sm:w-auto">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-ghost w-full sm:w-auto">
                    Create free account
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-berry-400 hover:text-berry-300"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>

            <p className="mt-4 text-xs text-[--color-muted]">
              No credit card. Your CV stays under your session.
            </p>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Everything you need to <span className="text-gradient">beat the filter</span>
            </h2>
            <p className="mt-3 text-[--color-muted]">
              Most CVs are rejected by an automated filter before a human reads a single line.
              These four answers close that gap.
            </p>
          </div>

          <ul className="mt-9 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <Card hover className="h-full p-6">
                  <span className="grid size-10 place-items-center rounded-xl border border-[--color-line] bg-[--color-surface-2]">
                    <Icon className="size-5 text-berry-400" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-[--color-ink]">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[--color-muted]">{body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-6 sm:pb-20">
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold">How it works</h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex gap-3.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-berry-600/20 text-sm font-semibold text-berry-300">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon className="size-4 text-berry-400" aria-hidden="true" />
                      {title}
                    </p>
                    <p className="mt-0.5 text-sm text-[--color-muted]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-[--color-line] bg-[--color-surface-1] px-6 py-12 text-center sm:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgb(133_57_83/0.28),transparent_70%)]"
            />
            <div className="relative">
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Find out what a recruiter sees
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[--color-muted]">
                One upload gives you the score, the extracted skills, and the keywords to add
                before your next application.
              </p>
              <Link
                to={isAuthenticated ? '/upload' : '/register'}
                className="btn btn-primary mt-7"
              >
                {isAuthenticated ? 'Upload your CV' : 'Start analysing free'}{' '}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

/** Minimal top bar. Public, so it never renders the authenticated sidebar. */
function LandingNav({ isAuthenticated }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[--color-line] bg-[--color-surface-0]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-6">
        <span className="text-lg font-semibold tracking-tight text-gradient">
          CVision AI
        </span>

        <nav className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn-primary">
              Dashboard <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-[--color-muted] transition-colors hover:bg-[--color-surface-2] hover:text-[--color-ink]"
              >
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[--color-line]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-[--color-muted] sm:flex-row sm:px-6">
        <p>CVision AI — intelligent CV analysis and job matching.</p>
        <p>Built with React, Express and MongoDB.</p>
      </div>
    </footer>
  );
}
