import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Plus, Trash2, Search, Sparkles, CheckCircle2, XCircle,
  Upload, ExternalLink, MapPin, Building2,
} from 'lucide-react';
import API from '../api/axios';
import Card, { CardHeader, EmptyState } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import ScoreCircle from '../components/ui/ScoreCircle';
import ScoreBar from '../components/ui/ScoreBar';
import Field from '../components/ui/Field';
import { ButtonSpinner } from '../components/ui/Spinner';

const EMPTY_FORM = { title: '', company: '', location: 'Remote', description: '', url: '' };

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Ad-hoc match (job description pasted, not saved)
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState({ title: '', description: '' });
  const [pasteErrors, setPasteErrors] = useState({});
  const [matching, setMatching] = useState(false);
  const [match, setMatch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await API.get('/jobs');
        if (!cancelled) setJobs(data.jobs || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = 'Job title is required';
    if (form.description.trim().length < 50) {
      errors.description = 'Paste at least 50 characters of the job description';
    }
    if (form.url && !/^https?:\/\/.+/i.test(form.url)) errors.url = 'Enter a valid URL';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data } = await API.post('/jobs', form);
      setJobs((prev) => [data.job, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setNotice(`Saved "${data.job.title}" with ${data.job.requiredSkills.length} skills detected.`);
    } catch (err) {
      setError(err.message);
      err.errors?.forEach(({ field, message }) =>
        setFormErrors((prev) => ({ ...prev, [field]: message }))
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"?`)) return;
    try {
      await API.delete(`/jobs/${job._id}`);
      setJobs((prev) => prev.filter((j) => j._id !== job._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const onMatch = async (job) => {
    setError('');
    setMatching(true);
    setMatch(null);
    setPaste({ title: job.title, description: job.description });
    setPasteOpen(true);
    try {
      const { data } = await API.post('/jobs/match', {
        jobId: job._id,
        title: job.title,
        description: job.description,
      });
      setMatch(data.match);
      // The server persists lastMatch and returns the authoritative job, so
      // replace the cached copy rather than rebuilding it on the client.
      if (data.job) {
        setJobs((prev) => prev.map((j) => (j._id === data.job._id ? data.job : j)));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  const onQuickMatch = async (e) => {
    e.preventDefault();
    const errors = {};
    if (paste.description.trim().length < 50) {
      errors.description = 'Paste at least 50 characters of the job description';
    }
    setPasteErrors(errors);
    if (Object.keys(errors).length) return;

    setMatching(true);
    setError('');
    try {
      const { data } = await API.post('/jobs/match', {
        title: paste.title.trim() || 'Target role',
        description: paste.description,
      });
      setMatch(data.match);
    } catch (err) {
      setError(err.message);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Job matcher</h2>
          <p className="mt-1 text-sm text-[--color-muted]">
            Paste a job description and score your CV against it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn btn-ghost"
          >
            <Plus className="size-4" /> {showForm ? 'Cancel' : 'Save a job'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setPasteOpen((v) => !v);
              setMatch(null);
            }}
            className="btn btn-primary"
          >
            <Search className="size-4" /> Quick match
          </button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} />}
      {notice && (
        <Alert variant="success" message={notice} onDismiss={() => setNotice('')} />
      )}

      {/* ---------- Save form ---------- */}
      {showForm && (
        <Card className="p-6 animate-fade-up">
          <CardHeader icon={Briefcase} title="Save a job description" subtitle="We auto-detect the skills it requires" />
          <form onSubmit={onSave} noValidate className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Job title"
                placeholder="Senior Full Stack Engineer"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                error={formErrors.title}
                required
              />
              <Field
                label="Company"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Location"
                placeholder="Remote"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Field
                label="Job URL"
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                error={formErrors.url}
              />
            </div>
            <div>
              <label className="label" htmlFor="jd">
                Job description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="jd"
                rows={8}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Paste the full job description here…"
                aria-invalid={formErrors.description ? 'true' : undefined}
                className={`field resize-y font-mono text-[13px] leading-relaxed ${
                  formErrors.description ? 'field-error' : ''
                }`}
              />
              <div className="mt-1.5 flex items-center justify-between">
                {formErrors.description ? (
                  <p className="text-xs font-medium text-red-400">{formErrors.description}</p>
                ) : (
                  <p className="text-xs text-[--color-muted]">
                    The more detail you paste, the more accurate the match.
                  </p>
                )}
                <span className="text-xs tabular-nums text-[--color-muted]">
                  {form.description.length} chars
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><ButtonSpinner /> Saving…</> : 'Save job'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setFormErrors({});
                }}
                className="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* ---------- Quick match ---------- */}
      {pasteOpen && (
        <Card className="p-6 animate-fade-up">
          <CardHeader
            icon={Sparkles}
            title="Match your CV to a job"
            subtitle="Paste a description — no need to save it"
          />
          <form onSubmit={onQuickMatch} className="mt-5 space-y-4">
            <Field
              label="Job title"
              placeholder="Senior Backend Engineer"
              value={paste.title}
              onChange={(e) => setPaste({ ...paste, title: e.target.value })}
            />
            <div>
              <label className="label" htmlFor="quick-jd">
                Job description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="quick-jd"
                rows={8}
                value={paste.description}
                onChange={(e) => setPaste({ ...paste, description: e.target.value })}
                placeholder="Paste the full job description here…"
                aria-invalid={pasteErrors.description ? 'true' : undefined}
                className={`field resize-y font-mono text-[13px] leading-relaxed ${
                  pasteErrors.description ? 'field-error' : ''
                }`}
              />
              {pasteErrors.description && (
                <p className="mt-1.5 text-xs font-medium text-red-400">
                  {pasteErrors.description}
                </p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={matching}>
              {matching ? (
                <>
                  <ButtonSpinner /> Scoring…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Score my CV
                </>
              )}
            </button>
          </form>
        </Card>
      )}

      {/* ---------- Match result ---------- */}
      {match && <MatchResult match={match} />}

      {/* ---------- Saved jobs ---------- */}
      <Card className="p-6">
        <CardHeader
          icon={Briefcase}
          title="Saved jobs"
          subtitle={jobs.length ? `${jobs.length} saved` : 'Save a job to reuse it later'}
        />

        {loading ? (
          <p className="mt-6 text-sm text-[--color-muted]">Loading…</p>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No saved jobs"
            description="Save job descriptions to compare them against your CV and track which roles fit best."
            action={
              <Link to="/upload" className="btn btn-ghost">
                <Upload className="size-4" /> Upload a CV first
              </Link>
            }
          />
        ) : (
          <ul className="mt-5 space-y-3">
            {jobs.map((job) => (
              <li
                key={job._id}
                className="card-hover rounded-xl border border-[--color-line] bg-[--color-surface-1] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{job.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[--color-muted]">
                      {job.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" aria-hidden="true" />
                          {job.company}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden="true" />
                          {job.location}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {job.lastMatch?.score != null && (
                      <Badge
                        tone={
                          job.lastMatch.score >= 80
                            ? 'emerald'
                            : job.lastMatch.score >= 55
                              ? 'amber'
                              : 'slate'
                        }
                      >
                        {job.lastMatch.score}% match
                      </Badge>
                    )}
                    {job.url && (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label="Open job posting"
                        className="rounded-md p-1.5 text-[--color-muted] transition hover:bg-[--color-surface-2] hover:text-[--color-ink]"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onMatch(job)}
                      disabled={matching}
                      className="btn btn-ghost px-3 py-1.5 text-xs"
                    >
                      <Sparkles className="size-3.5" /> Match
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(job)}
                      aria-label={`Delete ${job.title}`}
                      className="rounded-md p-1.5 text-[--color-muted] transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {job.requiredSkills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.requiredSkills.slice(0, 12).map((s) => {
                      const has = job.lastMatch?.matchedKeywords?.includes(s);
                      return (
                        <span
                          key={s}
                          className={`badge ${
                            has
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-[--color-line] bg-[--color-surface-2] text-[--color-muted]'
                          }`}
                        >
                          {has && <CheckCircle2 className="size-2.5" aria-hidden="true" />}
                          {s}
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MatchResult({ match }) {
  return (
    <Card className="p-6 animate-fade-up">
      <CardHeader
        icon={Sparkles}
        title="Match result"
        subtitle={`Verdict: ${match.verdict}`}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center">
          <ScoreCircle score={match.score} label="Job match" sublabel />
        </div>

        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreBar label="Skill coverage" value={match.breakdown?.coverage ?? 0} />
            <ScoreBar label="Seniority fit" value={match.breakdown?.seniority ?? 0} />
            <ScoreBar label="Keyword overlap" value={match.breakdown?.keywords ?? 0} />
          </div>

          {match.matchedKeywords?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
                Skills you match ({match.matchedKeywords.length})
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {match.matchedKeywords.map((k) => (
                  <span
                    key={k}
                    className="badge border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {match.missingKeywords?.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <XCircle className="size-4 text-amber-400" aria-hidden="true" />
                Missing from your CV ({match.missingKeywords.length})
              </h4>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {match.missingKeywords.map((k) => (
                  <span
                    key={k}
                    className="badge border-amber-500/30 bg-amber-500/10 text-amber-200"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-[--color-muted]">
                Only add these if you can genuinely evidence them — interviewers ask.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
