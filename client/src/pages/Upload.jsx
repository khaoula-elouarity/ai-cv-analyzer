import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, FileText, X, Sparkles, CheckCircle2, AlertTriangle,
  Briefcase, Info,
} from 'lucide-react';
import API, { ANALYSIS_TIMEOUT } from '../api/axios';
import Card, { CardHeader } from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import { Spinner, ButtonSpinner } from '../components/ui/Spinner';

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg'];
const ACCEPTED = ['.pdf', '.doc', '.docx', ...IMAGE_EXTS];
const ACCEPT_ATTR = [
  ...ACCEPTED,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ...IMAGE_EXTS.map((e) => `image/${e.slice(1)}`),
].join(',');
const MAX_MB = 5;

const isImage = (name) => IMAGE_EXTS.includes(`.${name.split('.').pop()?.toLowerCase()}`);

/**
 * Processing steps shown after the bytes have finished uploading.
 *
 * The server runs extraction, OCR, analysis and scoring inside a single
 * synchronous POST and only replies once all of it is done, so the browser
 * never receives a real progress event for these stages. The timings below are
 * therefore an *estimate* used to keep the user informed, not a report of what
 * the server is doing — the flow is genuinely complete only when the response
 * arrives. The OCR step is shown only for images, because a text-based PDF is
 * never sent to Tesseract and labelling that step would be misleading.
 */
const PROCESS_STEPS = [
  { id: 'extracting', label: 'Extracting text from your document', ms: 2500 },
  { id: 'ocr', label: 'Reading the text with OCR', ms: 9000 },
  { id: 'ai', label: 'AI is scoring your CV', ms: 6000 },
  { id: 'scoring', label: 'Generating your score and role matches', ms: 3500 },
];

const stepsFor = (name) => PROCESS_STEPS.filter((s) => s.id !== 'ocr' || isImage(name));

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Same rules the server enforces, checked before the upload starts. */
const validateFile = (file) => {
  if (!file) return 'No file selected';
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  if (!ACCEPTED.includes(ext)) return `Unsupported file type. Use ${ACCEPTED.join(', ')}`;
  if (file.size > MAX_MB * 1024 * 1024) {
    return `File is ${formatBytes(file.size)}. The maximum is ${MAX_MB} MB.`;
  }
  if (file.size === 0) return 'That file is empty';
  return '';
};

export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | uploading | analysing | done
  const [stepIndex, setStepIndex] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [targetJob, setTargetJob] = useState('');

  // Ask the server what the real MAX_UPLOAD_MB is, so the UI never lies about
  // a limit the backend will reject anyway.
  useEffect(() => {
    let cancelled = false;
    API.get('/jobs')
      .then(({ data }) => {
        if (!cancelled && Array.isArray(data.jobs)) setJobs(data.jobs);
      })
      .catch(() => {
        // Not fatal: uploading without a target job is the default anyway.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectFile = useCallback((candidate) => {
    if (!candidate) return;
    const message = validateFile(candidate);
    if (message) {
      setError(message);
      setFile(null);
      return;
    }
    setError('');
    setFile(candidate);
    setProgress(0);
    setPhase('idle');
    setStepIndex(0);
  }, []);

  // Walk the estimated steps forward while the server works. The final step
  // holds until the response lands, so the UI never claims completion early.
  useEffect(() => {
    if (phase !== 'analysing' || !file) return undefined;
    const steps = stepsFor(file.name);
    if (stepIndex >= steps.length) return undefined;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), steps[stepIndex].ms);
    return () => clearTimeout(timer);
  }, [phase, stepIndex, file]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    abortRef.current?.abort();
    setFile(null);
    setError('');
    setProgress(0);
    setPhase('idle');
    setStepIndex(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onSubmit = async () => {
    if (!file) return;
    setError('');
    setPhase('uploading');
    setProgress(0);
    setStepIndex(0);

    const form = new FormData();
    form.append('resume', file);
    if (targetJob) form.append('jobId', targetJob);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data } = await API.post('/resume/upload', form, {
        signal: controller.signal,
        // A cold OCR cache can take well over a minute, so this endpoint needs
        // a far longer budget than the default request timeout.
        timeout: ANALYSIS_TIMEOUT,
        onUploadProgress: (e) => {
          if (!e.total) return;
          // Reserve the last 35% of the bar for the server-side analysis,
          // which happens after the transfer completes.
          const uploaded = (e.loaded / e.total) * 65;
          setProgress(Math.min(65, Math.round(uploaded)));
          if (e.loaded === e.total) setPhase('analysing');
        },
      });

      setProgress(100);
      setPhase('done');
      // Carry the new analysis id so Results renders the right document.
      navigate('/results', { state: { analysisId: data.analysisId } });
    } catch (err) {
      setStepIndex(0);
      if (err.original?.name === 'CanceledError' || err.original?.code === 'ERR_CANCELED') {
        setPhase('idle');
        return;
      }
      setPhase('idle');
      setError(err.message);
    } finally {
      abortRef.current = null;
    }
  };

  const busy = phase === 'uploading' || phase === 'analysing';
  const steps = file ? stepsFor(file.name) : [];
  // The real upload owns 0-65% of the bar. Processing crawls 65-99% on the step
  // timer and only ever reaches 100 when the server actually responds.
  const displayProgress =
    phase === 'analysing' && steps.length
      ? Math.min(99, 65 + ((stepIndex + 0.6) / steps.length) * 34)
      : progress;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Upload your CV</h2>
        <p className="mt-1 text-sm text-[--color-muted]">
          We extract the text, score it against ATS criteria, and match you to roles.
        </p>
      </div>

      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} />}

      <Card className="p-6">
        {/* ---------- Dropzone ---------- */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={(e) => {
            // Only clear when the pointer genuinely leaves the zone, otherwise
            // dragging over a child element flickers the highlight.
            if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
          }}
          onDrop={onDrop}
          onClick={() => !busy && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload your CV file"
          aria-disabled={busy}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging
              ? 'border-berry-400 bg-berry-500/10'
              : 'border-[--color-line] bg-[--color-surface-1] hover:border-berry-500/60'
          } ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <span
            className={`grid size-14 place-items-center rounded-2xl border transition ${
              dragging
                ? 'border-berry-400 bg-berry-500/20'
                : 'border-[--color-line] bg-[--color-surface-2]'
            }`}
          >
            <UploadCloud
              className={`size-6 ${dragging ? 'text-berry-300' : 'text-[--color-muted]'}`}
              aria-hidden="true"
            />
          </span>

          <div>
            <p className="font-medium">
              {dragging ? 'Drop your file to upload' : 'Drag & drop your CV here'}
            </p>
            <p className="mt-1 text-sm text-[--color-muted]">
              or <span className="font-semibold text-berry-400">browse your files</span>
            </p>
            <p className="mt-2 text-xs text-[--color-muted]">
              PDF, DOC, DOCX, PNG or JPG · max {MAX_MB} MB
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="sr-only"
            onChange={(e) => selectFile(e.target.files?.[0])}
            disabled={busy}
          />
        </div>

        {/* ---------- Selected file ---------- */}
        {file && (
          <div className="mt-5 rounded-xl border border-[--color-line] bg-[--color-surface-1] p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-berry-500/15">
                <FileText className="size-4.5 text-berry-300" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-[--color-muted]">{formatBytes(file.size)}</p>
              </div>

              {phase === 'done' ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
              ) : (
                !busy && (
                  <button
                    type="button"
                    onClick={clear}
                    aria-label="Remove file"
                    className="shrink-0 rounded-md p-1.5 text-[--color-muted] transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="size-4" />
                  </button>
                )
              )}
            </div>

            {busy && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[--color-muted]">
                    <Spinner className="size-3" />
                    {phase === 'uploading' ? 'Uploading…' : 'Analysing your CV…'}
                  </span>
                  <span className="font-semibold tabular-nums text-berry-300">{displayProgress}%</span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[--color-surface-3]"
                  role="progressbar"
                  aria-valuenow={displayProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-berry-500 to-plum-400 transition-[width] duration-300"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>

                {phase === 'analysing' && (
                  <>
                    <ol className="mt-4 space-y-2" aria-live="polite">
                      {steps.map((step, i) => {
                        // Clamp so the last step keeps its spinner until the
                        // response lands, rather than briefly reading "all done"
                        // while the server is still working.
                        const at = Math.min(stepIndex, steps.length - 1);
                        const state = i < at ? 'done' : i === at ? 'active' : 'todo';
                        return (
                          <li
                            key={step.id}
                            className={`flex items-center gap-2.5 text-sm ${
                              state === 'todo' ? 'text-[--color-muted] opacity-50' : ''
                            }`}
                          >
                            <span className="grid size-5 shrink-0 place-items-center">
                              {state === 'done' ? (
                                <CheckCircle2
                                  className="size-4 text-emerald-400"
                                  aria-hidden="true"
                                />
                              ) : state === 'active' ? (
                                <Spinner className="size-4 text-berry-300" />
                              ) : (
                                <span className="size-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <span className={state === 'active' ? 'font-medium text-[--color-ink]' : ''}>
                              {step.label}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                    <p className="mt-3 text-xs text-[--color-muted]">
                      {isImage(file.name)
                        ? 'The first scan can take a couple of minutes while the text-recognition model loads — later ones are much faster. Do not close this tab.'
                        : 'This usually takes a few seconds. Do not close this tab.'}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------- Optional target job ---------- */}
        <div className="mt-5">
          <label className="label" htmlFor="target-job">
            Target job <span className="font-normal text-[--color-muted]">(optional)</span>
          </label>
          <select
            id="target-job"
            value={targetJob}
            onChange={(e) => setTargetJob(e.target.value)}
            disabled={busy}
            className="field cursor-pointer"
          >
            <option value="">No target — score general CV quality</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.title}
                {j.company ? ` at ${j.company}` : ''}
              </option>
            ))}
          </select>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[--color-muted]">
            <Info className="mt-px size-3 shrink-0" aria-hidden="true" />
            Pick a saved job to score the CV against that specific role.{' '}
            {jobs.length === 0 && (
              <a href="/jobs" className="font-medium text-berry-400 hover:underline">
                Save one on the Job Matcher page
              </a>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!file || busy}
            className="btn btn-primary"
          >
            {busy ? (
              <>
                <ButtonSpinner /> Analysing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Analyse my CV
              </>
            )}
          </button>
          {busy ? (
            <button type="button" onClick={clear} className="btn btn-ghost">
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={!file}
              className="btn btn-ghost"
            >
              Choose a different file
            </button>
          )}
        </div>
      </Card>

      {/* ---------- Guidance ---------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <CardHeader
            icon={CheckCircle2}
            title="For an accurate score"
            subtitle="What our parser reads best"
          />
          <ul className="mt-4 space-y-2 text-sm text-[--color-muted]">
            {[
              'A text-based PDF scores best (we OCR scans and images too)',
              'Standard headings: Experience, Education, Skills',
              'A single column, no tables or text boxes',
              'Job titles and dates in plain text',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <CardHeader
            icon={AlertTriangle}
            title="Common problems"
            subtitle="Why a CV fails to analyse"
          />
          <ul className="mt-4 space-y-2 text-sm text-[--color-muted]">
            {[
              'Handwriting is read less reliably than typed text',
              'Password-protected documents cannot be read',
              'Legacy .doc — re-save as .docx or PDF',
              'Files over 5 MB are rejected',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {jobs.length > 0 && (
        <Card className="p-5">
          <CardHeader
            icon={Briefcase}
            title="Your saved jobs"
            subtitle="Any of these can be a target for the next analysis"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {jobs.slice(0, 8).map((j) => {
              const selected = j._id === targetJob;
              return (
                <button
                  key={j._id}
                  type="button"
                  disabled={busy}
                  onClick={() => setTargetJob(selected ? '' : j._id)}
                  aria-pressed={selected}
                  className={`badge transition ${
                    selected
                      ? 'border-berry-500/40 bg-berry-500/12 text-berry-200'
                      : 'border-[--color-line] bg-[--color-surface-2] text-[--color-muted] hover:border-berry-500/50 hover:text-[--color-ink]'
                  } ${busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                >
                  {j.title}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
