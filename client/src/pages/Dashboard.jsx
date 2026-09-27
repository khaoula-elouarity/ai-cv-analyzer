import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, Upload, Target, TrendingUp, FileText, Award, ArrowRight,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/authContext';
import Card, { CardHeader, EmptyState } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import ScoreCircle from '../components/ui/ScoreCircle';
import ScoreBar from '../components/ui/ScoreBar';
import { FullPageSpinner } from '../components/ui/Spinner';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [latest, setLatest] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      // Settled rather than all: a failure in one panel should not blank the
      // whole dashboard, and each call already degrades to a null/empty value.
      const [summaryRes, latestRes, resumeRes] = await Promise.allSettled([
        API.get('/analysis/stats/summary'),
        API.get('/analysis/latest'),
        API.get('/resume?limit=5'),
      ]);

      if (cancelled) return;

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data.summary);
      else setError(summaryRes.reason?.message || 'Could not load your stats');

      if (latestRes.status === 'fulfilled') setLatest(latestRes.value.data.analysis);
      if (resumeRes.status === 'fulfilled') setResumes(resumeRes.value.data.resumes || []);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <FullPageSpinner label="Loading your dashboard" />;

  const firstName = user?.name?.split(' ')[0] || 'there';
  const hasData = Boolean(latest);

  const stats = [
    { label: 'CVs analysed', value: summary?.totalAnalyses ?? 0, icon: FileText, tone: 'berry' },
    { label: 'Best score', value: `${summary?.bestScore ?? 0}%`, icon: TrendingUp, tone: 'emerald' },
    { label: 'Average ATS score', value: `${summary?.averageAts ?? 0}%`, icon: Award, tone: 'amber' },
  ];

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} />}

      {/* ---------- Greeting ---------- */}
      <div>
        <h2 className="text-xl font-semibold">Welcome back, {firstName}</h2>
        <p className="mt-1 text-sm text-[--color-muted]">
          {hasData
            ? 'Here is how your CV is performing right now.'
            : 'Upload your first CV to get an instant score and role matches.'}
        </p>
      </div>

      {/* ---------- Stat tiles ---------- */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-5" hover>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[--color-muted]">
                {label}
              </span>
              <Icon
                className={`size-4 ${
                  tone === 'emerald' ? 'text-emerald-400' : tone === 'amber' ? 'text-amber-400' : 'text-berry-400'
                }`}
                aria-hidden="true"
              />
            </div>
            <p className="mt-2.5 text-2xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card>
          <EmptyState
            icon={Upload}
            title="No CV analysed yet"
            description="Upload a PDF or Word document and we will score it, pull out your skills, and suggest roles you are suited to."
            action={
              <Link to="/upload" className="btn btn-primary">
                <Upload className="size-4" /> Upload your CV
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          {/* ---------- Latest score ---------- */}
          <Card className="p-6">
            <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-3">
                <ScoreCircle score={latest.score} label="Overall score" sublabel />
                <Badge tone="berry" icon={Award}>
                  ATS {latest.atsScore}%
                </Badge>
              </div>

              <div className="min-w-0">
                <CardHeader
                  icon={BarChart3}
                  title="Latest analysis"
                  subtitle={
                    latest.resume?.originalName
                      ? `${latest.resume.originalName} · ${new Date(latest.createdAt).toLocaleDateString()}`
                      : new Date(latest.createdAt).toLocaleDateString()
                  }
                  action={
                    <Link to="/results" className="btn btn-ghost">
                      Full results <ArrowRight className="size-3.5" />
                    </Link>
                  }
                />

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <ScoreBar label="Skills" value={latest.scoreBreakdown?.skills ?? 0} />
                  <ScoreBar label="Experience" value={latest.scoreBreakdown?.experience ?? 0} />
                  <ScoreBar label="Education" value={latest.scoreBreakdown?.education ?? 0} />
                  <ScoreBar label="Impact & structure" value={latest.scoreBreakdown?.formatting ?? 0} />
                </div>
              </div>
            </div>
          </Card>

          {/* ---------- Quick wins ---------- */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <CardHeader
                icon={CheckCircle2}
                title="Top strengths"
                subtitle="What is working in your CV"
              />
              <ul className="mt-4 space-y-2.5">
                {(latest.strengths || []).slice(0, 4).map((s) => (
                  <li key={s} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span className="text-sm text-[--color-muted]">{s}</span>
                  </li>
                ))}
                {(!latest.strengths || latest.strengths.length === 0) && (
                  <li className="text-sm text-[--color-muted]">No strengths detected yet.</li>
                )}
              </ul>
            </Card>

            <Card className="p-6">
              <CardHeader
                icon={AlertCircle}
                title="Focus next on"
                subtitle="Highest-impact improvements"
              />
              <ul className="mt-4 space-y-2.5">
                {(latest.weaknesses || []).slice(0, 4).map((w) => (
                  <li key={w} className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <span className="text-sm text-[--color-muted]">{w}</span>
                  </li>
                ))}
                {(!latest.weaknesses || latest.weaknesses.length === 0) && (
                  <li className="text-sm text-[--color-muted]">
                    Nothing flagged — your CV is structurally sound.
                  </li>
                )}
              </ul>
            </Card>
          </div>

          {/* ---------- Suggested roles ---------- */}
          {latest.suggestedRoles?.length > 0 && (
            <Card className="p-6">
              <CardHeader
                icon={Target}
                title="Best-fit roles for you"
                subtitle="Based on the skills and job titles in your CV"
                action={
                  <Link to="/jobs" className="btn btn-ghost">
                    Match a job
                  </Link>
                }
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {latest.suggestedRoles.slice(0, 6).map((role) => (
                  <div
                    key={role.title}
                    className="rounded-xl border border-[--color-line] bg-[--color-surface-1] p-4"
                  >
                    <p className="truncate font-semibold">{role.title}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-berry-300">
                      {role.matchPercent}%
                    </p>
                    <div className="mt-2">
                      <ScoreBar label="Fit" value={role.matchPercent} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ---------- Recent uploads ---------- */}
      {resumes.length > 0 && (
        <Card className="p-6">
          <CardHeader icon={FileText} title="Recent CVs" subtitle="Your five most recent uploads" />
          <ul className="mt-4 divide-y divide-[--color-line]">
            {resumes.map((r) => (
              <li key={r._id} className="flex items-center gap-3 py-3">
                <FileText className="size-4 shrink-0 text-[--color-muted]" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.originalName}</p>
                  <p className="text-xs text-[--color-muted]">
                    {new Date(r.createdAt).toLocaleDateString()} · {r.status}
                  </p>
                </div>
                <Badge
                  tone={
                    r.status === 'analyzed' ? 'emerald' : r.status === 'failed' ? 'red' : 'amber'
                  }
                >
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
