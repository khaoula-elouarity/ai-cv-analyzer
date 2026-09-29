import { useEffect, useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  BarChart3, Upload, CheckCircle2, XCircle, Lightbulb, Target, Sparkles,
  Zap, BookOpen, FolderGit2, Award, Languages, Mail, Phone, MapPin,
  Link2, FileText, Trash2, Download, TrendingUp, Clock, Briefcase,
} from 'lucide-react';
import API, { API_HOST } from '../api/axios';
import Card, { CardHeader, EmptyState } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Badge, { LevelBadge, DemandBadge } from '../components/ui/Badge';
import ScoreCircle from '../components/ui/ScoreCircle';
import ScoreBar from '../components/ui/ScoreBar';
import { FullPageSpinner } from '../components/ui/Spinner';

// Hints are written generically on purpose: the analysed field is not known
// until the analysis loads, so software vocabulary ("technologies") would be
// wrong for every non-tech candidate.
const BREAKDOWN_LABELS = {
  skills: { label: 'Skills & competencies', hint: 'Breadth of the skills, qualifications and expertise your field screens for' },
  experience: { label: 'Experience', hint: 'Depth, relevance and seniority progression of your roles' },
  education: { label: 'Education & credentials', hint: 'Degrees, registrations, certifications and formal training' },
  formatting: { label: 'Impact & structure', hint: 'Measured results, action verbs, and a clear summary' },
  keywords: { label: 'Target keywords', hint: 'Coverage of the keywords recruiters in your field filter on' },
};

// Uploaded files are served from "/uploads" on the API host, not from "/api",
// so this deliberately uses the bare origin (API_HOST) and not baseURL.
const downloadUrl = (fileUrl) => `${API_HOST}${fileUrl || ''}`;

export default function Results() {
  const location = useLocation();
  const passedId = location.state?.analysisId;

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Load the requested analysis, falling back to the most recent one so the
  // page is useful even when the user navigates here directly.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = passedId
          ? await API.get(`/analysis/${passedId}`)
          : await API.get('/analysis/latest');

        if (cancelled) return;
        setAnalysis(data.analysis);
        if (!data.analysis) setError('');
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [passedId]);

  const onDelete = async () => {
    if (!analysis?.resume?._id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this CV and its analysis? This cannot be undone.')) return;

    setDeleting(true);
    try {
      await API.delete(`/resume/${analysis.resume._id}`);
      setAnalysis(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullPageSpinner label="Loading your results" />;

  if (!analysis) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No analysis yet"
          description="Upload your CV and we will score it, extract your skills, and match you to relevant roles."
          action={
            <Link to="/upload" className="btn btn-primary">
              <Upload className="size-4" /> Upload your CV
            </Link>
          }
        />
      </Card>
    );
  }

  const { score, scoreBreakdown = {}, atsScore, profile, skills, suggestedRoles } = analysis;
  const resumeMeta = analysis.resume;

  return (
    <div className="space-y-6">
      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} />}

      {/* ---------- Header ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">Analysis results</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[--color-muted]">
            {resumeMeta?.originalName && (
              <span className="flex items-center gap-1.5">
                <FileText className="size-3.5" aria-hidden="true" />
                <span className="max-w-[16rem] truncate">{resumeMeta.originalName}</span>
              </span>
            )}
            {analysis.createdAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" aria-hidden="true" />
                {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            {analysis.engine && (
              <Badge tone="plum" icon={Sparkles}>
                {analysis.engine === 'local' ? 'Local engine' : analysis.engine}
              </Badge>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {resumeMeta?.fileUrl && (
            <a
              href={downloadUrl(resumeMeta.fileUrl)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              <Download className="size-4" /> Original file
            </a>
          )}
          <Link to="/upload" className="btn btn-primary">
            <Upload className="size-4" /> Analyse another
          </Link>
        </div>
      </div>

      {/* ---------- Score overview ---------- */}
      <Card className="p-6">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <ScoreCircle score={score} label="Overall score" sublabel />
            <div className="flex items-center gap-2">
              <Badge tone="berry" icon={Target}>
                ATS {atsScore}%
              </Badge>
            </div>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[--color-ink]">How this score breaks down</h3>
            <p className="mt-1 text-sm text-[--color-muted]">
              Every component is shown so you know exactly where to focus.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {Object.entries(BREAKDOWN_LABELS).map(([key, meta]) => (
                <ScoreBar
                  key={key}
                  label={meta.label}
                  value={scoreBreakdown[key] ?? 0}
                  hint={meta.hint}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------- Detected field ---------- */}
      {analysis.fieldLabel && (
        <Card className="p-6">
          <CardHeader
            icon={Briefcase}
            title="Profession detected"
            subtitle={
              analysis.fieldConfidence > 0
                ? `Based on your job titles, qualifications and terminology · ${analysis.fieldConfidence}% confidence`
                : 'Based on your job titles, qualifications and terminology'
            }
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-[--color-primary-soft] px-3.5 py-1.5 text-sm font-semibold text-[--color-primary]">
              {analysis.fieldLabel}
            </span>
            {analysis.fieldEvidence?.length > 0 && (
              <span className="text-xs text-[--color-muted]">
                Evidence: {analysis.fieldEvidence.slice(0, 4).join(' · ')}
              </span>
            )}
          </div>
          <p className="mt-4 text-sm text-[--color-muted]">
            This analysis is scored and advised against {analysis.fieldLabel} standards
            {analysis.field !== 'software' && analysis.field !== 'general'
              ? ' — not software industry conventions'
              : ''}
            .
          </p>
        </Card>
      )}

      {/* ---------- Profile ---------- */}
      {(profile?.fullName || profile?.email || profile?.summary) && (
        <Card className="p-6">
          <CardHeader icon={FileText} title="Profile extracted from your CV" />
          <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.4fr]">
            <dl className="space-y-3 text-sm">
              {profile.fullName && (
                <div>
                  <dt className="text-xs text-[--color-muted]">Name</dt>
                  <dd className="font-medium">{profile.fullName}</dd>
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-[--color-muted]" aria-hidden="true" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 text-[--color-muted]" aria-hidden="true" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-[--color-muted]" aria-hidden="true" />
                  <span>{profile.location}</span>
                </div>
              )}
              {profile.yearsOfExperience > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-3.5 text-[--color-muted]" aria-hidden="true" />
                  <span>{profile.yearsOfExperience}+ years of experience</span>
                </div>
              )}
              {profile.links?.length > 0 && (
                <div className="space-y-1.5">
                  {profile.links.map((link) => (
                    <a
                      key={link}
                      href={link.startsWith('http') ? link : `https://${link}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 text-berry-400 hover:text-berry-300 hover:underline"
                    >
                      <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              )}
            </dl>

            {profile.summary && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[--color-muted]">
                  Summary
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-[--color-muted]">
                  {profile.summary}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---------- Strengths / weaknesses ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ListCard
          icon={CheckCircle2}
          tone="emerald"
          title="Strengths"
          subtitle="What your CV does well"
          items={analysis.strengths}
          emptyText="No standout strengths detected yet."
          iconColor="text-emerald-400"
        />
        <ListCard
          icon={XCircle}
          tone="red"
          title="Weaknesses"
          subtitle="What is holding your score back"
          items={analysis.weaknesses}
          emptyText="No significant weaknesses found."
          iconColor="text-red-400"
        />
      </div>

      {/* ---------- Recommendations ---------- */}
      {analysis.recommendations?.length > 0 && (
        <Card className="p-6">
          <CardHeader
            icon={Lightbulb}
            title="How to improve your score"
            subtitle="Ordered roughly by impact"
          />
          <ol className="mt-5 space-y-3">
            {analysis.recommendations.map((rec, i) => (
              <li key={rec} className="flex gap-3.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-berry-500/40 bg-berry-500/12 text-xs font-bold text-berry-300">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-[--color-muted]">{rec}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ---------- Keywords ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        <KeywordCard
          icon={Zap}
          title="Keywords you match"
          subtitle="Present in your CV and valued by recruiters"
          keywords={analysis.matchedKeywords}
          tone="emerald"
          emptyText="No matching keywords found."
        />
        <KeywordCard
          icon={Target}
          title="Missing keywords"
          subtitle="Add these where truthful to pass more filters"
          keywords={analysis.missingKeywords}
          tone="amber"
          emptyText="No gaps found — your CV covers the key terms."
        />
      </div>

      {/* ---------- Skills ---------- */}
      {skills?.length > 0 && <SkillsCard skills={skills} />}

      {/* ---------- Suggested roles ---------- */}
      {suggestedRoles?.length > 0 && (
        <Card className="p-6">
          <CardHeader
            icon={Target}
            title="Roles you are best suited to"
            subtitle="Roles in your field, ranked by how much of each role your CV already evidences"
            action={
              <Link to="/jobs" className="btn btn-ghost">
                Match a specific job
              </Link>
            }
          />

          <ul className="mt-5 space-y-3">
            {suggestedRoles.map((role, i) => (
              <li key={role.title} className="card-hover rounded-xl border border-[--color-line] bg-[--color-surface-1] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-berry-500/15 text-sm font-bold text-berry-300">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{role.title}</h3>
                      {role.topSkills?.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-[--color-muted]">
                          {role.topSkills.join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <DemandBadge demand={role.demand} />
                    <Badge
                      tone={role.matchPercent >= 80 ? 'emerald' : role.matchPercent >= 55 ? 'amber' : 'slate'}
                    >
                      {role.matchPercent}% match
                    </Badge>
                  </div>
                </div>

                {role.reason && (
                  <p className="mt-3 text-sm text-[--color-muted]">{role.reason}</p>
                )}

                <div className="mt-3">
                  <ScoreBar label="Fit" value={role.matchPercent} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ---------- CV detail sections ---------- */}
      <div className="grid gap-6 lg:grid-cols-2">
        {analysis.experience?.length > 0 && (
          <Card className="p-6">
            <CardHeader icon={Briefcase} title="Experience found" subtitle={`${analysis.experience.length} entries`} />
            <ul className="mt-5 space-y-4">
              {analysis.experience.map((exp, i) => (
                <li key={`${exp.title}-${i}`} className="border-l-2 border-berry-500/40 pl-4">
                  <p className="font-medium">{[exp.title, exp.company].filter(Boolean).join(' · ')}</p>
                  {exp.period && <p className="text-xs text-[--color-muted]">{exp.period}</p>}
                  {exp.highlights?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((h, j) => (
                        <li key={j} className="text-sm text-[--color-muted]">
                          · {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="space-y-6">
          {analysis.education?.length > 0 && (
            <Card className="p-6">
              <CardHeader icon={BookOpen} title="Education" />
              <ul className="mt-4 space-y-3">
                {analysis.education.map((edu, i) => (
                  <li key={i}>
                    <p className="font-medium">{edu.degree}</p>
                    <p className="text-sm text-[--color-muted]">
                      {[edu.institution, edu.year].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {analysis.projects?.length > 0 && (
            <Card className="p-6">
              <CardHeader
                icon={FolderGit2}
                title="Projects & key work"
                subtitle="Tools, systems or methods used"
              />
              <ul className="mt-4 space-y-3">
                {analysis.projects.map((proj, i) => (
                  <li key={i}>
                    <p className="font-medium">{proj.name}</p>
                    {proj.description && (
                      <p className="mt-0.5 text-sm text-[--color-muted]">{proj.description}</p>
                    )}
                    {proj.stack?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {proj.stack.map((s) => (
                          <Badge key={s} tone="slate">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            {analysis.certifications?.length > 0 && (
              <Card className="p-5">
                <CardHeader icon={Award} title="Certifications" />
                <ul className="mt-4 space-y-2">
                  {analysis.certifications.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-sm">
                      <Award className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                      <span className="text-[--color-muted]">{c}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Registrations are gating requirements in regulated fields, so
                they are surfaced separately from optional certifications. */}
            {analysis.registrations?.length > 0 && (
              <Card className="p-5">
                <CardHeader
                  icon={CheckCircle2}
                  title="Registrations & licences"
                  subtitle="Professional registrations employers in regulated fields require"
                />
                <ul className="mt-4 space-y-2">
                  {analysis.registrations.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                        aria-hidden="true"
                      />
                      <span className="text-[--color-muted]">{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.affiliations?.length > 0 && (
              <Card className="p-5">
                <CardHeader
                  icon={Link2}
                  title="Professional memberships"
                  subtitle="Bodies, networks and industry affiliations"
                />
                <ul className="mt-4 space-y-2">
                  {analysis.affiliations.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm">
                      <Link2 className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                      <span className="text-[--color-muted]">{a}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.languages?.length > 0 && (
              <Card className="p-5">
                <CardHeader icon={Languages} title="Languages" />
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {analysis.languages.map((l) => (
                    <Badge key={l} tone="berry">
                      {l}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Danger zone ---------- */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Delete this CV</h3>
            <p className="mt-0.5 text-sm text-[--color-muted]">
              Removes the uploaded file, its stored text, and this analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="btn btn-danger"
          >
            <Trash2 className="size-4" /> {deleting ? 'Deleting…' : 'Delete CV'}
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ListCard({ icon: Icon, title, subtitle, items, emptyText, iconColor }) {
  return (
    <Card className="p-6">
      <CardHeader icon={Icon} title={title} subtitle={subtitle} />
      {items?.length ? (
        <ul className="mt-5 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden="true" />
              <span className="text-sm leading-relaxed text-[--color-muted]">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-[--color-muted]">{emptyText}</p>
      )}
    </Card>
  );
}

function KeywordCard({ icon, title, subtitle, keywords, tone, emptyText }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';

  return (
    <Card className="p-6">
      <CardHeader icon={icon} title={title} subtitle={subtitle} />
      {keywords?.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className={`badge ${toneClass}`}>
              {k}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-[--color-muted]">{emptyText}</p>
      )}
    </Card>
  );
}

function SkillsCard({ skills }) {
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of skills) {
      const key = s.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [skills]);

  return (
    <Card className="p-6">
      <CardHeader
        icon={Sparkles}
        title="Skills detected"
        subtitle={`${skills.length} skills, qualifications or competencies recognised in your CV`}
      />
      <div className="mt-5 space-y-5">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[--color-muted]">
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {list.map((s) => (
                <span
                  key={s.name}
                  className="badge border-[--color-line] bg-[--color-surface-2]"
                  title={`${s.mentions} mention${s.mentions === 1 ? '' : 's'} in your CV`}
                >
                  {s.name}
                  <LevelBadge level={s.level} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
