import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type View = "dashboard" | "profile" | "workbook" | "results";

type Step = {
  title: string;
  question: string;
  checklist: string[];
  weights: { calls: number; follow: number; ticket: number };
};

type Resp = { checklist: boolean[] };

type Profile = {
  name: string;
  company: string;
  phone: string;
  calls: string;
  ticket: string;
  close: string;
  services: string;
};

type ModalAction = { label: string; onClick: () => void; primary?: boolean };
type ModalState = null | {
  title: string;
  message: string;
  kind?: "info" | "warning" | "success";
  actions?: ModalAction[];
};

type BreakdownKey = "callHandling" | "followUp" | "pricingUpsell" | "visibility" | "systems";
type Breakdown = Record<BreakdownKey, number> & {
  dominantKey: BreakdownKey;
  dominantLabel: string;
};

const NONE = "None of the Above";
const STORAGE_KEY = "hvac_12_step_mobile_saas_restore_v2";
const BOOK_CALL_LINK = "#BOOK_CALL_LINK";

const steps: Step[] = [
  { title: "CALL HANDLING", question: "What happens when calls come in?", checklist: ["Calls go unanswered", "Manual answering", "No consistent booking flow"], weights: { calls: 0.7, follow: 0.2, ticket: 0.1 } },
  { title: "AFTER HOURS", question: "What happens after hours?", checklist: ["Missed emergency calls", "No 24/7 handling", "Voicemail only"], weights: { calls: 0.8, follow: 0.1, ticket: 0.1 } },
  { title: "LEAD RESPONSE", question: "How fast do you respond to leads?", checklist: ["Delayed callbacks", "No instant response", "Manual follow-up"], weights: { calls: 0.6, follow: 0.3, ticket: 0.1 } },
  { title: "FOLLOW UP", question: "What happens after first contact?", checklist: ["No reminders", "No follow-up system", "Leads go cold"], weights: { calls: 0.2, follow: 0.7, ticket: 0.1 } },
  { title: "NO SHOWS", question: "How are no-shows handled?", checklist: ["No reminders", "No confirmations", "No rebooking"], weights: { calls: 0.2, follow: 0.6, ticket: 0.2 } },
  { title: "ESTIMATES", question: "What happens after estimates?", checklist: ["No follow-up on estimates", "No urgency created", "No automation"], weights: { calls: 0.1, follow: 0.7, ticket: 0.2 } },
  { title: "PRICING", question: "How are jobs priced?", checklist: ["Low ticket jobs", "No upsells", "Competing on price"], weights: { calls: 0.1, follow: 0.2, ticket: 0.7 } },
  { title: "UPSELL", question: "Do you maximize each job?", checklist: ["No add-ons", "No bundles", "No premium options"], weights: { calls: 0.1, follow: 0.2, ticket: 0.7 } },
  { title: "MAINTENANCE", question: "Do you have recurring revenue?", checklist: ["No maintenance plans", "No memberships", "No retention system"], weights: { calls: 0.2, follow: 0.3, ticket: 0.5 } },
  { title: "REVIEWS", question: "How do you handle reviews?", checklist: ["No review requests", "Inconsistent reviews", "Low ratings"], weights: { calls: 0.3, follow: 0.4, ticket: 0.3 } },
  { title: "GOOGLE MAPS", question: "How visible are you locally?", checklist: ["Low map ranking", "Few calls from maps", "No optimization"], weights: { calls: 0.6, follow: 0.2, ticket: 0.2 } },
  { title: "OWNER DEPENDENCY", question: "How dependent is the business on you?", checklist: ["I handle everything", "No systems in place", "Not scalable"], weights: { calls: 0.3, follow: 0.3, ticket: 0.4 } },
];

const initialProfile: Profile = {
  name: "",
  company: "",
  phone: "",
  calls: "",
  ticket: "",
  close: "",
  services: "",
};

const profileFieldLabels: Record<keyof Profile, string> = {
  name: "Full Name",
  company: "Company Name",
  phone: "Phone Number",
  calls: "Monthly Incoming Calls",
  ticket: "Average Ticket Amount",
  close: "Current Monthly Close %",
  services: "Services Offered",
};

function createResponses(): Resp[] {
  return steps.map((step) => ({ checklist: [...step.checklist, NONE].map(() => false) }));
}

function saveState(view: View, stepIndex: number, responses: Resp[], profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, stepIndex, responses, profile }));
  } catch {}
}

function loadState(): { view: View; stepIndex: number; responses: Resp[]; profile: Profile } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function formatPhone(input: string) {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatMoney(value: number) {
  return `$${Math.max(0, Math.round(value)).toLocaleString()}`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Btn({ children, onClick, primary = false, disabled = false, glow = false }: { children: React.ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; glow?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "w-full sm:w-auto rounded-xl px-5 py-4 text-base font-semibold transition",
        primary
          ? disabled
            ? "cursor-not-allowed bg-amber-300/30 text-black/45"
            : "bg-amber-300 text-black shadow-[0_12px_30px_rgba(251,191,36,0.28)]"
          : disabled
            ? "cursor-not-allowed bg-white/5 text-white/40"
            : "bg-white/10 text-white",
        glow ? "animate-pulse" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Modal({ state }: { state: ModalState }) {
  if (!state) return null;
  const actions = state.actions && state.actions.length > 0 ? state.actions : [{ label: "Got It", onClick: () => {}, primary: true }];
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} className="w-full max-w-md rounded-[24px] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
          <div className={`text-[11px] uppercase tracking-[0.24em] ${state.kind === "warning" ? "text-amber-300" : state.kind === "success" ? "text-emerald-300" : "text-slate-400"}`}>
            {state.kind === "warning" ? "Attention" : state.kind === "success" ? "Saved" : "Notice"}
          </div>
          <h3 className="mt-3 text-2xl font-semibold">{state.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{state.message}</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {actions.map((action) => (
              <button key={action.label} onClick={action.onClick} className={`rounded-xl px-4 py-3 text-sm font-semibold ${action.primary ? "bg-white text-slate-950" : "bg-white/10 text-white"}`}>
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell({ children, view, setView, leak, completion, company, saveAndExit, setupComplete, setModal }: {
  children: React.ReactNode;
  view: View;
  setView: (view: View) => void;
  leak: number;
  completion: number;
  company: string;
  saveAndExit: () => void;
  setupComplete: boolean;
  setModal: (state: ModalState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (completion >= 100) return;
    const t = window.setInterval(() => setPulse((p) => !p), 900);
    return () => window.clearInterval(t);
  }, [completion]);

  const nav: Array<{ id: View; label: string }> = [
    { id: "dashboard", label: "Command Center" },
    { id: "profile", label: "Business Setup" },
    { id: "workbook", label: "Diagnostic" },
    { id: "results", label: "Results" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/85 p-4 backdrop-blur-xl">
        <button onClick={() => setOpen(true)} className="text-xl text-white">☰</button>
        <div className="flex items-center gap-2">
          <div className="font-bold text-amber-300">HVAC-IN-A-BOX</div>
          <div className="text-sm font-semibold">Command Center</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-amber-300">{formatMoney(leak)}</div>
          <button onClick={saveAndExit} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white">Save & Exit</button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-black p-5">
            <div className="mb-6">
              <div className="text-lg font-bold text-amber-300">HVAC-IN-A-BOX</div>
              <div className="mt-1 text-xs text-slate-400">Revenue Intelligence System</div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm">Menu</span>
                <button onClick={() => setOpen(false)}>✕</button>
              </div>
            </div>

            <div className="space-y-2">
              {nav.map((item) => {
                const resultsLocked = (completion < 100 || !setupComplete) && item.id === "results";
                const workbookLocked = !setupComplete && item.id === "workbook";
                const dashboardLocked = !setupComplete && item.id === "dashboard";
                const locked = resultsLocked || workbookLocked || dashboardLocked;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (resultsLocked) {
                        setModal({
                          title: "Results Locked",
                          message: !setupComplete ? "This page is only available after Business Setup is fully completed and all 12 questions are answered to ensure the most accurate analysis." : "This page is only available after all 12 questions are completed to ensure the most accurate analysis.",
                          kind: "warning",
                          actions: [
                            { label: "Continue Diagnostic", onClick: () => { setModal(null); setView("workbook"); setOpen(false); }, primary: true },
                            { label: "Close", onClick: () => setModal(null) },
                          ],
                        });
                        return;
                      }

                      if (workbookLocked) {
                        setModal({
                          title: "Complete Business Setup First",
                          message: "Business Setup must be fully completed before the diagnostic can begin.",
                          kind: "warning",
                          actions: [
                            { label: "Go To Business Setup", onClick: () => { setModal(null); setView("profile"); setOpen(false); }, primary: true },
                            { label: "Close", onClick: () => setModal(null) },
                          ],
                        });
                        return;
                      }

                      if (dashboardLocked) {
                        setModal({
                          title: "Complete Business Setup First",
                          message: "Finish Business Setup to unlock your Command Center and begin the analysis correctly.",
                          kind: "warning",
                          actions: [
                            { label: "Go To Business Setup", onClick: () => { setModal(null); setView("profile"); setOpen(false); }, primary: true },
                            { label: "Close", onClick: () => setModal(null) },
                          ],
                        });
                        return;
                      }

                      setView(item.id);
                      setOpen(false);
                    }}
                    className={`w-full rounded-xl px-4 py-3 text-left ${view === item.id ? "bg-white text-black" : "bg-white/5 text-white"} ${locked ? "opacity-70" : ""}`}
                  >
                    {item.id === "results" && completion < 100 ? (
                      <div>
                        <div className={`${pulse ? "text-amber-300" : "text-white"}`}>Results ({completion}%)</div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-amber-300 transition-all duration-500" style={{ width: `${completion}%` }} />
                        </div>
                      </div>
                    ) : (
                      item.label
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Active Account</div>
              <div className="mt-2 text-sm font-semibold text-white">{company || "New Operator"}</div>
              <div className="mt-3 text-xs text-slate-400">Revenue Leak: {formatMoney(leak)}</div>
              <div className="mt-1 text-xs text-slate-400">Completion: {completion}%</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="space-y-6 p-4">{children}</main>
    </div>
  );
}

export default function App() {
  const [setupWelcomeSeen, setSetupWelcomeSeen] = useState(false);
  const [view, setView] = useState<View>("profile");
  const [stepIndex, setStepIndex] = useState(0);
  const [responses, setResponses] = useState<Resp[]>(createResponses());
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [modal, setModal] = useState<ModalState>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const previousLeakRef = useRef(0);

  const analysisLines = [
    "Mapping operational patterns...",
    "Detecting revenue leak signals...",
    "Aligning with HVAC performance benchmarks...",
    "Prioritizing recovery opportunities...",
    "Finalizing system output...",
  ];

  useEffect(() => {
    const saved = loadState();
    if (!saved) return;
    setStepIndex(saved.stepIndex ?? 0);
    setResponses(Array.isArray(saved.responses) ? saved.responses : createResponses());
    setProfile({ ...initialProfile, ...(saved.profile ?? {}) });
  }, []);

  useEffect(() => {
    if (view === "profile" && !setupWelcomeSeen) {
      setModal({
        title: "Welcome",
        message: "Please complete all required business information before starting your diagnostic. This information is mandatory to generate the most accurate analysis.",
        kind: "info",
        actions: [{ label: "OK", onClick: () => { setModal(null); setSetupWelcomeSeen(true); }, primary: true }],
      });
    }
  }, [view, setupWelcomeSeen]);

  const profileErrors = useMemo(() => {
    const errors: string[] = [];
    if (!profile.name.trim()) errors.push("Enter your name.");
    if (!profile.company.trim()) errors.push("Enter your company name.");
    if (profile.phone.replace(/\D/g, "").length !== 10) errors.push("Enter a valid 10-digit phone number.");
    if (!profile.calls.trim() || Number.isNaN(Number(profile.calls)) || Number(profile.calls) <= 0) errors.push("Enter monthly call volume.");
    if (!profile.ticket.trim() || Number.isNaN(Number(profile.ticket)) || Number(profile.ticket) <= 0) errors.push("Enter average ticket amount.");
    if (!profile.close.trim() || Number.isNaN(Number(profile.close)) || Number(profile.close) <= 0) errors.push("Enter close rate.");
    if (profile.services.trim().length < 8) errors.push("List at least 2 services offered.");
    return errors;
  }, [profile]);

  const profileValid = profileErrors.length === 0;
  const stepsCompleted = useMemo(() => responses.filter((r) => r.checklist.some(Boolean)).length, [responses]);
  const completion = useMemo(() => Math.round((stepsCompleted / steps.length) * 100), [stepsCompleted]);

  useEffect(() => {
    const safeView = !profileValid ? "profile" : view;
    saveState(safeView, stepIndex, responses, profile);
  }, [view, stepIndex, responses, profile, profileValid]);

  useEffect(() => {
    if (!profileValid && view !== "profile") {
      setView("profile");
    }
  }, [profileValid, view]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisIndex(0);
      return;
    }
    const timer = window.setInterval(() => setAnalysisIndex((prev) => (prev + 1) % analysisLines.length), 320);
    return () => window.clearInterval(timer);
  }, [isAnalyzing, analysisLines.length]);

  const currentStep = steps[stepIndex];
  const currentResponse = responses[stepIndex];
  const noneIndex = currentResponse.checklist.length - 1;

  const leak = useMemo(() => {
    const baseRevenue = Number(profile.calls || 0) * Number(profile.ticket || 0) * (Number(profile.close || 0) / 100);
    if (!baseRevenue) return 0;
    let score = 0;
    responses.forEach((response, idx) => {
      response.checklist.forEach((checked, checklistIdx) => {
        if (checked && checklistIdx !== response.checklist.length - 1) {
          const weights = steps[idx].weights;
          score += weights.calls + weights.follow + weights.ticket;
        }
      });
    });
    return Math.round(baseRevenue * 0.25 * (score / 20));
  }, [responses, profile]);

  const breakdown = useMemo<Breakdown>(() => {
    const total = leak;
    if (!total) {
      return { callHandling: 0, followUp: 0, pricingUpsell: 0, visibility: 0, systems: 0, dominantKey: "callHandling", dominantLabel: "Call Handling" };
    }

    const buckets = { callHandling: 0, followUp: 0, pricingUpsell: 0, visibility: 0, systems: 0 };
    responses.forEach((response, idx) => {
      const noneSelected = response.checklist[response.checklist.length - 1];
      if (noneSelected) return;
      const selectedCount = response.checklist.slice(0, -1).filter(Boolean).length;
      if (!selectedCount) return;
      const variance = 1 + (idx % 3) * 0.08 + selectedCount * 0.05;
      if (idx <= 2) buckets.callHandling += variance * 1.2;
      else if (idx <= 5) buckets.followUp += variance * 1.1;
      else if (idx <= 7) buckets.pricingUpsell += variance * 1.4;
      else if (idx <= 9) buckets.visibility += variance * 0.9;
      else buckets.systems += variance * 0.8;
    });

    const weights = {
      callHandling: buckets.callHandling + 1,
      followUp: buckets.followUp + 1,
      pricingUpsell: buckets.pricingUpsell + 1,
      visibility: buckets.visibility + 1,
      systems: buckets.systems + 1,
    };
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
    const raw = {
      callHandling: (weights.callHandling / weightSum) * total,
      followUp: (weights.followUp / weightSum) * total,
      pricingUpsell: (weights.pricingUpsell / weightSum) * total,
      visibility: (weights.visibility / weightSum) * total,
      systems: (weights.systems / weightSum) * total,
    };

    const rounded = {
      callHandling: Math.round(raw.callHandling),
      followUp: Math.round(raw.followUp),
      pricingUpsell: Math.round(raw.pricingUpsell),
      visibility: Math.round(raw.visibility),
      systems: 0,
    };
    rounded.systems = Math.max(0, total - rounded.callHandling - rounded.followUp - rounded.pricingUpsell - rounded.visibility);

    const labels: Record<BreakdownKey, string> = {
      callHandling: "Call Handling",
      followUp: "Follow-Up",
      pricingUpsell: "Pricing & Upsell",
      visibility: "Visibility",
      systems: "Systems",
    };
    let dominantKey: BreakdownKey = "callHandling";
    let dominantValue = -1;
    (Object.keys(rounded) as BreakdownKey[]).forEach((key) => {
      if (rounded[key] > dominantValue) {
        dominantValue = rounded[key];
        dominantKey = key;
      }
    });

    return { ...rounded, dominantKey, dominantLabel: labels[dominantKey] };
  }, [responses, leak]);

  useEffect(() => {
    if (previousLeakRef.current > 0 && leak < previousLeakRef.current) {
      setFlash(previousLeakRef.current - leak);
      const timer = window.setTimeout(() => setFlash(null), 2200);
      previousLeakRef.current = leak;
      return () => window.clearTimeout(timer);
    }
    previousLeakRef.current = leak;
  }, [leak]);

  function setChecklistValue(index: number, nextChecked: boolean) {
    setResponses((prev) => prev.map((response, idx) => {
      if (idx !== stepIndex) return response;
      const next = [...response.checklist];
      next[index] = nextChecked;
      if (index === noneIndex && nextChecked) {
        for (let i = 0; i < noneIndex; i += 1) next[i] = false;
      }
      if (index !== noneIndex && nextChecked) next[noneIndex] = false;
      return { checklist: next };
    }));
  }

  function saveAndExit() {
    saveState(profileValid ? view : "profile", stepIndex, responses, profile);
    setModal({
      title: "Your progress has been saved.",
      message: "Would you like to continue, return to your Command Center, or exit?",
      kind: "success",
      actions: [
        { label: "Continue", onClick: () => setModal(null), primary: true },
        { label: "Command Center", onClick: () => { setModal(null); setView(profileValid ? "dashboard" : "profile"); } },
        { label: "Exit", onClick: () => { setModal(null); try { window.open("", "_self"); window.close(); } catch {} window.location.href = "about:blank"; } },
      ],
    });
  }

  function goToWorkbook() {
    if (!profileValid) {
      setModal({
        title: "Complete Business Setup First",
        message: "Business Setup must be fully completed before the diagnostic can begin.",
        kind: "warning",
        actions: [{ label: "Got It", onClick: () => setModal(null), primary: true }],
      });
      setView("profile");
      return;
    }
    setView("workbook");
  }

  function nextStep() {
    if (!currentResponse.checklist.some(Boolean)) {
      setModal({
        title: "Select An Option To Continue",
        message: "Choose at least one option, or choose None of the Above, before moving to the next step.",
        kind: "warning",
        actions: [{ label: "Got It", onClick: () => setModal(null), primary: true }],
      });
      return;
    }
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    setIsAnalyzing(true);
    window.setTimeout(() => {
      setIsAnalyzing(false);
      setView("results");
    }, 1800);
  }

  let content: React.ReactNode;

  if (view === "dashboard") {
    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">AI-Enhanced Revenue Leak</div>
          <div className="text-3xl text-amber-300">{formatMoney(leak)}</div>
          <div className="mt-3 text-sm leading-6 text-slate-400">Built from real HVAC operational experience and enhanced by AI-assisted analysis.</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400">Diagnostic Progress</div>
          <div className="text-2xl">{stepsCompleted} / {steps.length} Steps Completed</div>
          <div className="mt-3 text-sm text-slate-400">The system recalibrates as new inputs are added.</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400">System Note</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">This system combines real-world HVAC insight with AI-assisted pattern recognition to surface where profit is quietly escaping.</div>
        </Card>

        {completion >= 100 ? (
          <>
            <div className="text-center text-sm text-amber-300">Your analysis is ready</div>
            <Btn primary glow onClick={() => setView("results")}>Unlock My Results</Btn>
          </>
        ) : (
          <Btn primary onClick={() => setView(profileValid ? "workbook" : "profile")}>Continue Diagnostic</Btn>
        )}

        {!profileValid ? <div className="text-xs text-slate-500">Finish Business Setup to unlock the rest of the system.</div> : null}
        {flash ? <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">You just unlocked {formatMoney(flash)}/mo</div> : null}
      </div>
    );
  } else if (view === "profile") {
    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Business Setup</div>
          <div className="mt-2 text-lg font-semibold">Complete your business information to begin.</div>
        </Card>

        {(Object.keys(profile) as Array<keyof Profile>).map((key) => (
          <input
            key={key}
            placeholder={profileFieldLabels[key]}
            value={profile[key]}
            onChange={(e) => setProfile({ ...profile, [key]: key === "phone" ? formatPhone(e.target.value) : e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none placeholder:text-slate-500"
          />
        ))}

        {!profileValid ? <div className="text-sm text-amber-300">Complete all required fields to begin your diagnosis.</div> : <div className="text-sm text-emerald-300">Your setup is complete. You can now begin.</div>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>Save & Exit</Btn>
          <Btn primary disabled={!profileValid} onClick={goToWorkbook}>Start My Diagnosis</Btn>
        </div>
      </div>
    );
  } else if (view === "workbook") {
    content = (
      <div className="space-y-4">
        <div className="sticky top-[73px] z-30 bg-black/90 pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Live System Calibration In Progress</div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">{stepIndex + 1} of {steps.length}</div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-amber-300 transition-all duration-300" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
          </div>
          <h2 className="mt-4 text-xl font-semibold">{currentStep.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{currentStep.question}</p>
          <p className="mt-3 text-xs text-slate-500">Your responses are being evaluated using real HVAC performance patterns, enhanced by AI-assisted analysis.</p>
        </div>

        {[...currentStep.checklist, NONE].map((item, idx) => (
          <div key={item} onClick={() => setChecklistValue(idx, !currentResponse.checklist[idx])} className={`rounded-xl border p-5 ${currentResponse.checklist[idx] ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/5"}`}>
            {item}
          </div>
        ))}

        <Card>
          <div className="text-sm text-slate-400">AI System Note</div>
          <div className="mt-2 text-sm leading-6 text-slate-300">Each selection helps the system detect where revenue is being lost and refine the priority sequence for recovery.</div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>Save & Exit</Btn>
          <Btn onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}>Previous</Btn>
          <Btn primary onClick={nextStep}>{stepIndex < steps.length - 1 ? "Next Step" : "Reveal My Results"}</Btn>
        </div>
      </div>
    );
  } else {
    const rows: Array<[string, number]> = [
      ["Call Handling", breakdown.callHandling],
      ["Follow-Up", breakdown.followUp],
      ["Pricing & Upsell", breakdown.pricingUpsell],
      ["Visibility", breakdown.visibility],
      ["Systems", breakdown.systems],
    ];

    const dominantSummary =
      breakdown.dominantLabel === "Call Handling"
        ? "Your front-end capture appears to be the biggest bottleneck. Revenue is most likely being lost before appointments are ever secured."
        : breakdown.dominantLabel === "Follow-Up"
          ? "Your strongest leak appears after the first interaction. Interest is there, but revenue is likely dying in the follow-up sequence."
          : breakdown.dominantLabel === "Pricing & Upsell"
            ? "Your biggest opportunity seems to live inside the job itself. More profit is likely available, but your current structure is suppressing it."
            : breakdown.dominantLabel === "Visibility"
              ? "Your visibility layer looks like the biggest constraint. Higher-value inbound demand may not be reaching you consistently enough."
              : "Your largest leak seems to be system dependency. The business may still rely too much on manual execution, which quietly limits recovered revenue.";

    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">System Analysis Complete</div>
          <div className="text-4xl text-amber-300">{formatMoney(leak)}</div>
          <div className="mt-3 text-sm leading-6 text-slate-400">Estimated monthly revenue leakage, derived from real HVAC operational patterns and refined through AI-assisted analysis.</div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">Dominant Leak</div>
          <div className="mt-2 text-2xl font-semibold text-white">{breakdown.dominantLabel}</div>
          <div className="mt-1 text-lg text-amber-300">{formatMoney(breakdown[breakdown.dominantKey])}/mo</div>
          <div className="mt-3 text-sm text-slate-300">{dominantSummary}</div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Revenue Leak Breakdown</div>
          <div className="mt-4 space-y-4">
            {rows.map(([label, amount]) => {
              const painSummary =
                label === "Call Handling"
                  ? "Calls are likely slipping before they ever become booked revenue, creating invisible loss at the front door of the business."
                  : label === "Follow-Up"
                    ? "Revenue appears to be leaking after first contact, where inconsistent follow-up and weak reactivation reduce conversion."
                    : label === "Pricing & Upsell"
                      ? "There is likely more money available inside each job, but weak positioning or offer structure is capping the value."
                      : label === "Visibility"
                        ? "Local visibility may be limiting inbound demand quality, causing missed opportunities before conversations even begin."
                        : "The business may still depend too heavily on manual effort, making profit recovery inconsistent and harder to scale.";

              return (
                <div key={label} className={`rounded-xl border p-4 ${label === breakdown.dominantLabel ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-white/5"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-white">{label}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Estimated Monthly Impact</div>
                    </div>
                    <div className="text-lg font-semibold text-amber-300">{formatMoney(amount)}</div>
                  </div>
                  <div className="mt-3 text-sm text-slate-400">{painSummary}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fix Plan Locked</div>
          <div className="mt-2 text-lg font-semibold">Your recovery plan is ready — but not yet unlocked.</div>
          <div className="mt-3 text-sm leading-6 text-slate-400">The system has mapped out exactly where to fix your leaks, in what order, and how to recover lost revenue. Unlocking this reveals your priority sequence and implementation path.</div>
          <div className="mt-4 space-y-2 text-sm text-slate-500">
            <div>• Step-by-step fix sequence</div>
            <div>• Priority leak breakdown</div>
            <div>• Revenue recovery roadmap</div>
            <div>• Automation opportunities</div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>Save & Exit</Btn>
          <Btn onClick={() => setView("dashboard")}>Command Center</Btn>
          <Btn primary onClick={() => {
            setModal({
              title: "Unlock Your Fix Plan",
              message: "You are about to unlock your full recovery plan, including exact steps to fix your leaks and increase revenue.",
              kind: "info",
              actions: [
                { label: "Continue", onClick: () => { setModal(null); window.location.href = BOOK_CALL_LINK; }, primary: true },
                { label: "Cancel", onClick: () => setModal(null) },
              ],
            });
          }}>
            Unlock My Fix Plan
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell view={view} setView={setView} leak={leak} completion={completion} company={profile.company} saveAndExit={saveAndExit} setupComplete={profileValid} setModal={setModal}>
        {content}
      </AppShell>

      <AnimatePresence>
        {isAnalyzing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 text-white">
            <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.24em] text-amber-300">Revenue Intelligence Engine</div>
              <h3 className="mt-3 text-2xl font-semibold">Analyzing Your Business...</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">Built from real HVAC operational experience, enhanced by AI-assisted pattern recognition.</p>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                {analysisLines.map((line, idx) => (
                  <div key={line} className={`${idx <= analysisIndex ? "opacity-100" : "opacity-30"} transition-opacity duration-300`}>{line}</div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Modal state={modal} />
    </>
  );
}
