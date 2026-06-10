import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

type View =
  | "dashboard"
  | "profile"
  | "workbook"
  | "results"
  | "fixplan";

type Step = {
  title: string;
  question: string;
  checklist: string[];
  weights: {
    calls: number;
    follow: number;
    ticket: number;
  };
};

type Resp = {
  checklist: boolean[];
  notes: string;
};

type Profile = {
  name: string;
  company: string;
  phone: string;
  calls: string;
  ticket: string;
  close: string;
  services: string;
  contractorType: string;
};

type ModalAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};

type ModalState =
  | null
  | {
      title: string;
      message: string;
      kind?: "info" | "warning" | "success";
      actions?: ModalAction[];
    };

type BreakdownKey =
  | "callHandling"
  | "followUp"
  | "pricingUpsell"
  | "visibility"
  | "systems";

type Breakdown = Record<BreakdownKey, number> & {
  dominantKey: BreakdownKey;
  dominantLabel: string;
};

const SUPABASE_URL =
  "https://snxmacuhsbwmcvxwrklz.supabase.co"; 

const SUPABASE_ANON_KEY =
  "sb_publishable_iRVWZjgwFrvmXjLNfPwrpQ_wQnAzDuS";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const NONE = "None of the Above";

const STORAGE_KEY_BASE =
  "hvac_in_a_box_final_flow_v1";

const BOOK_CALL_LINK =
  "#BOOK_CALL_LINK";

const steps: Step[] = [
  {
    title: "CALL HANDLING",
    question:
      "What happens when calls come in?",
    checklist: [
      "Calls go unanswered",
      "Manual answering",
      "No consistent booking flow",
    ],
    weights: {
      calls: 0.7,
      follow: 0.2,
      ticket: 0.1,
    },
  },
  {
    title: "AFTER HOURS",
    question:
      "What happens after hours?",
    checklist: [
      "Missed emergency calls",
      "No 24/7 handling",
      "Voicemail only",
    ],
    weights: {
      calls: 0.8,
      follow: 0.1,
      ticket: 0.1,
    },
  },
  {
    title: "LEAD RESPONSE",
    question:
      "How fast do you respond to leads?",
    checklist: [
      "Delayed callbacks",
      "No instant response",
      "Manual follow-up",
    ],
    weights: {
      calls: 0.6,
      follow: 0.3,
      ticket: 0.1,
    },
  },
  {
    title: "FOLLOW UP",
    question:
      "What happens after first contact?",
    checklist: [
      "No reminders",
      "No follow-up system",
      "Leads go cold",
    ],
    weights: {
      calls: 0.2,
      follow: 0.7,
      ticket: 0.1,
    },
  },
  {
    title: "NO SHOWS",
    question:
      "How are no-shows handled?",
    checklist: [
      "No reminders",
      "No confirmations",
      "No rebooking",
    ],
    weights: {
      calls: 0.2,
      follow: 0.6,
      ticket: 0.2,
    },
  },
  {
    title: "ESTIMATES",
    question:
      "What happens after estimates?",
    checklist: [
      "No follow-up on estimates",
      "No urgency created",
      "No automation",
    ],
    weights: {
      calls: 0.1,
      follow: 0.7,
      ticket: 0.2,
    },
  },
  {
    title: "PRICING",
    question:
      "How are jobs priced?",
    checklist: [
      "Low ticket jobs",
      "No upsells",
      "Competing on price",
    ],
    weights: {
      calls: 0.1,
      follow: 0.2,
      ticket: 0.7,
    },
  },
  {
    title: "UPSELL",
    question:
      "Do you maximize each job?",
    checklist: [
      "No add-ons",
      "No bundles",
      "No premium options",
    ],
    weights: {
      calls: 0.1,
      follow: 0.2,
      ticket: 0.7,
    },
  },
  {
    title: "MAINTENANCE",
    question:
      "Do you have recurring revenue?",
    checklist: [
      "No maintenance plans",
      "No memberships",
      "No retention system",
    ],
    weights: {
      calls: 0.2,
      follow: 0.3,
      ticket: 0.5,
    },
  },
  {
    title: "REVIEWS",
    question:
      "How do you handle reviews?",
    checklist: [
      "No review requests",
      "Inconsistent reviews",
      "Low ratings",
    ],
    weights: {
      calls: 0.3,
      follow: 0.4,
      ticket: 0.3,
    },
  },
  {
    title: "GOOGLE MAPS",
    question:
      "How visible are you locally?",
    checklist: [
      "Low map ranking",
      "Few calls from maps",
      "No optimization",
    ],
    weights: {
      calls: 0.6,
      follow: 0.2,
      ticket: 0.2,
    },
  },
  {
    title: "OWNER DEPENDENCY",
    question:
      "How dependent is the business on you?",
    checklist: [
      "I handle everything",
      "No systems in place",
      "Not scalable",
    ],
    weights: {
      calls: 0.3,
      follow: 0.3,
      ticket: 0.4,
    },
  },
];

const initialProfile: Profile = {
  name: "",
  company: "",
  phone: "",
  calls: "",
  ticket: "",
  close: "",
  services: "",
  contractorType: "HVAC",
};

function createResponses(): Resp[] {
  return steps.map((step) => ({
    checklist: [
      ...step.checklist,
      NONE,
    ].map(() => false),
    notes: "",
  }));
}

function formatPhone(input: string) {
  const digits = input
    .replace(/\D/g, "")
    .slice(0, 10);

  if (!digits) return "";

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(
      0,
      3
    )}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(
    0,
    3
  )}) ${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function formatMoney(value: number) {
  return `$${Math.max(
    0,
    Math.round(value)
  ).toLocaleString()}`;
}

function userStorageKey(
  userId?: string
) {
  return userId
    ? `${STORAGE_KEY_BASE}_${userId}`
    : STORAGE_KEY_BASE;
}

function saveState(
  userId: string,
  view: View,
  stepIndex: number,
  responses: Resp[],
  profile: Profile
) {
  try {
    localStorage.setItem(
      userStorageKey(userId),
      JSON.stringify({
        view,
        stepIndex,
        responses,
        profile,
        savedAt:
          new Date().toISOString(),
      })
    );
  } catch {}
}

function loadState(
  userId: string
): {
  view: View;
  stepIndex: number;
  responses: Resp[];
  profile: Profile;
} | null {
  try {
    const raw =
      localStorage.getItem(
        userStorageKey(userId)
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 6,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.2,
      }}
      className={`rounded-[20px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Btn({
  children,
  onClick,
  primary = false,
  disabled = false,
  glow = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  glow?: boolean;
}) {
  return (
    <button
      onClick={
        disabled ? undefined : onClick
      }
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
      style={{
        border: "none",
      }}
    >
      {children}
    </button>
  );
}

function Modal({
  state,
}: {
  state: ModalState;
}) {
  if (!state) return null;

  const actions =
    state.actions &&
    state.actions.length > 0
      ? state.actions
      : [
          {
            label: "Got It",
            onClick: () => {},
            primary: true,
          },
        ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        exit={{
          opacity: 0,
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      >
        <motion.div
          initial={{
            scale: 0.96,
            opacity: 0,
          }}
          animate={{
            scale: 1,
            opacity: 1,
          }}
          exit={{
            scale: 0.96,
            opacity: 0,
          }}
          className="w-full max-w-md rounded-[24px] border border-white/10 bg-slate-950 p-6 text-white shadow-2xl"
        >
          <div
            className={`text-[11px] uppercase tracking-[0.24em] ${
              state.kind === "warning"
                ? "text-amber-300"
                : state.kind === "success"
                  ? "text-emerald-300"
                  : "text-slate-400"
            }`}
          >
            {state.kind === "warning"
              ? "Attention"
              : state.kind === "success"
                ? "Saved"
                : "Notice"}
          </div>

          <h3 className="mt-3 text-2xl font-semibold">
            {state.title}
          </h3>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            {state.message}
          </p>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  action.primary
                    ? "bg-white text-slate-950"
                    : "bg-white/10 text-white"
                }`}
                style={{
                  border: "none",
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LoginScreen({
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  authError,
  authMessage,
  authSubmitting,
  onForgotPassword,
}: {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onLogin: (
    event: React.FormEvent
  ) => void;
  authError: string;
  authMessage: string;
  authSubmitting: boolean;
  onForgotPassword: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-8 md:grid-cols-[1.05fr_.95fr] md:items-center">
          <div>
            <div className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
              Secure Workbook Access
            </div>

            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
              Access Your Revenue Leak Workbook
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 md:text-lg">
              Log in with the email and access password sent after requesting your workbook. Your diagnosis, results, and business analysis are saved here.
            </p>

            <div className="mt-6 grid max-w-xl gap-3 text-sm text-slate-400 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Secure access
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Progress saved
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Private results
              </div>
            </div>
          </div>

          <Card className="bg-white text-black">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              HVAC In A Box
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              Open My Workbook
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Enter your workbook access credentials below.
            </p>

            <form
              onSubmit={onLogin}
              className="mt-6 space-y-3"
            >
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950 outline-none"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />

              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-950 outline-none"
                type="password"
                placeholder="Access password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
              />

              <button
                className="w-full rounded-xl bg-amber-300 px-5 py-4 font-bold text-black"
                disabled={authSubmitting}
                style={{
                  border: "none",
                }}
              >
                {authSubmitting
                  ? "Opening..."
                  : "Open My Workbook"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-500">
              <span>
                Account access is created after registration.
              </span>

              <button
                onClick={onForgotPassword}
                className="font-semibold text-amber-500 underline"
                style={{
                  border: "none",
                  background: "transparent",
                }}
              >
                Forgot password?
              </button>
            </div>

            {authError ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
                {authError}
              </div>
            ) : null}

            {authMessage ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                {authMessage}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AppShell({
  children,
  view,
  setView,
  leak,
  completion,
  company,
  saveAndExit,
  setupComplete,
  setModal,
  email,
  logout,
}: {
  children: React.ReactNode;
  view: View;
  setView: (view: View) => void;
  leak: number;
  completion: number;
  company: string;
  saveAndExit: () => void;
  setupComplete: boolean;
  setModal: (
    state: ModalState
  ) => void;
  email: string;
  logout: () => void;
}) {
  const [open, setOpen] =
    useState(false);

  const [pulse, setPulse] =
    useState(false);

  useEffect(() => {
    if (completion >= 100) return;

    const t = window.setInterval(
      () => setPulse((p) => !p),
      900
    );

    return () =>
      window.clearInterval(t);
  }, [completion]);

  const nav: Array<{
    id: View;
    label: string;
  }> = [
    {
      id: "dashboard",
      label: "Command Center",
    },
    {
      id: "profile",
      label: "Business Setup",
    },
    {
      id: "workbook",
      label: "Diagnostic",
    },
    {
      id: "results",
      label: "Results",
    },
    {
      id: "fixplan",
      label: "Fix Plan",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/85 p-4 backdrop-blur-xl">
        <button
          onClick={() => setOpen(true)}
          className="text-xl text-white"
          style={{
            border: "none",
            background: "transparent",
          }}
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <div className="font-bold text-amber-300">
            HVAC-IN-A-BOX
          </div>
          <div className="hidden text-sm font-semibold sm:block">
            Workbook Portal
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden text-xs font-semibold text-slate-400 sm:block">
            {email}
          </div>

          <div className="text-xs font-semibold text-amber-300">
            {formatMoney(leak)}
          </div>

          <button
            onClick={saveAndExit}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            style={{
              border: "none",
            }}
          >
            Save
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{
              x: -280,
            }}
            animate={{
              x: 0,
            }}
            exit={{
              x: -280,
            }}
            className="fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-black p-5"
          >
            <div className="mb-6">
              <div className="text-lg font-bold text-amber-300">
                HVAC-IN-A-BOX
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Revenue Leak Workbook
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm">
                  Menu
                </span>

                <button
                  onClick={() =>
                    setOpen(false)
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "white",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {nav.map((item) => {
                const resultsLocked =
                  (completion < 100 ||
                    !setupComplete) &&
                  (item.id === "results" ||
                    item.id === "fixplan");

                const workbookLocked =
                  !setupComplete &&
                  item.id === "workbook";

                const dashboardLocked =
                  !setupComplete &&
                  item.id === "dashboard";

                const locked =
                  resultsLocked ||
                  workbookLocked ||
                  dashboardLocked;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (locked) {
                        setModal({
                          title:
                            item.id ===
                              "results" ||
                            item.id ===
                              "fixplan"
                              ? "Complete Your Diagnosis First"
                              : "Complete Business Setup First",
                          message:
                            item.id ===
                              "results" ||
                            item.id ===
                              "fixplan"
                              ? "Results and the Fix Plan unlock after Business Setup and all 12 diagnostic questions are completed."
                              : "Business Setup must be completed before this section unlocks.",
                          kind: "warning",
                          actions: [
                            {
                              label:
                                "Continue",
                              onClick: () => {
                                setModal(
                                  null
                                );
                                setView(
                                  setupComplete
                                    ? "workbook"
                                    : "profile"
                                );
                                setOpen(
                                  false
                                );
                              },
                              primary: true,
                            },
                            {
                              label: "Close",
                              onClick:
                                () =>
                                  setModal(
                                    null
                                  ),
                            },
                          ],
                        });

                        return;
                      }

                      setView(item.id);
                      setOpen(false);
                    }}
                    className={`w-full rounded-xl px-4 py-3 text-left ${
                      view === item.id
                        ? "bg-white text-black"
                        : "bg-white/5 text-white"
                    } ${
                      locked ? "opacity-70" : ""
                    }`}
                    style={{
                      border: "none",
                    }}
                  >
                    {item.id === "results" &&
                    completion < 100 ? (
                      <div>
                        <div
                          className={
                            pulse
                              ? "text-amber-300"
                              : "text-white"
                          }
                        >
                          Results ({completion}
                          %)
                        </div>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-300 transition-all duration-500"
                            style={{
                              width: `${completion}%`,
                            }}
                          />
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
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                Active Account
              </div>

              <div className="mt-2 text-sm font-semibold text-white">
                {company || "New Operator"}
              </div>

              <div className="mt-3 text-xs text-slate-400">
                Revenue At Risk:{" "}
                {formatMoney(leak)}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Completion: {completion}%
              </div>

              <button
                onClick={logout}
                className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                style={{
                  border: "none",
                }}
              >
                Log Out
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="space-y-6 p-4">
        {children}
      </main>
    </div>
  );
}
export default function App() {
  const [session, setSession] =
    useState<any>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [view, setView] =
    useState<View>("profile");

  const [stepIndex, setStepIndex] =
    useState(0);

  const [responses, setResponses] =
    useState<Resp[]>(createResponses());

  const [profile, setProfile] =
    useState<Profile>(initialProfile);

  const [modal, setModal] =
    useState<ModalState>(null);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analysisIndex, setAnalysisIndex] =
    useState(0);

  const [flash, setFlash] =
    useState<number | null>(null);

  const [setupWelcomeSeen, setSetupWelcomeSeen] =
    useState(false);

  const [postLoginRedirect, setPostLoginRedirect] =
    useState<View | null>(null);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authError, setAuthError] =
    useState("");

  const [authMessage, setAuthMessage] =
    useState("");

  const [authSubmitting, setAuthSubmitting] =
    useState(false);

  const previousLeakRef = useRef(0);

  const analysisLines = [
    "Mapping operational patterns...",
    "Detecting revenue leak signals...",
    "Aligning with contractor performance benchmarks...",
    "Prioritizing recovery opportunities...",
    "Finalizing system output...",
  ];

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const redirect =
      params.get("redirect") as View | null;

    const emailParam =
      params.get("email");

    const allowed: View[] = [
      "dashboard",
      "profile",
      "workbook",
      "results",
      "fixplan",
    ];

    if (
      redirect &&
      allowed.includes(redirect)
    ) {
      setPostLoginRedirect(redirect);
    }

    if (emailParam) {
      setEmail(
        emailParam.trim().toLowerCase()
      );
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } =
        await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    load();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession ?? null);
          setAuthLoading(false);
        }
      );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const profileErrors = useMemo(() => {
    const errors: string[] = [];

    if (!profile.name.trim()) {
      errors.push("Enter your name.");
    }

    if (!profile.company.trim()) {
      errors.push(
        "Enter your company name."
      );
    }

    if (
      profile.phone.replace(/\D/g, "")
        .length !== 10
    ) {
      errors.push(
        "Enter a valid 10-digit phone number."
      );
    }

    if (
      !profile.calls.trim() ||
      Number.isNaN(Number(profile.calls)) ||
      Number(profile.calls) <= 0
    ) {
      errors.push(
        "Enter monthly call volume."
      );
    }

    if (
      !profile.ticket.trim() ||
      Number.isNaN(Number(profile.ticket)) ||
      Number(profile.ticket) <= 0
    ) {
      errors.push(
        "Enter average ticket amount."
      );
    }

    if (
      !profile.close.trim() ||
      Number.isNaN(Number(profile.close)) ||
      Number(profile.close) <= 0
    ) {
      errors.push("Enter close rate.");
    }

    if (
      profile.services.trim().length < 8
    ) {
      errors.push(
        "List at least 2 services offered."
      );
    }

    if (!profile.contractorType.trim()) {
      errors.push(
        "Enter contractor type."
      );
    }

    return errors;
  }, [profile]);

  const profileValid =
    profileErrors.length === 0;

  const stepsCompleted = useMemo(
    () =>
      responses.filter((r) =>
        r.checklist.some(Boolean)
      ).length,
    [responses]
  );

  const completion = useMemo(
    () =>
      Math.round(
        (stepsCompleted / steps.length) *
          100
      ),
    [stepsCompleted]
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    const saved =
      loadState(session.user.id);

    if (!saved) {
      setResponses(createResponses());
      setProfile(initialProfile);
      setStepIndex(0);
      setView("profile");
      return;
    }

    const loadedProfile = {
      ...initialProfile,
      ...(saved.profile ?? {}),
    };

    const loadedResponses =
      Array.isArray(saved.responses)
        ? saved.responses
        : createResponses();

    const loadedStepsCompleted =
      loadedResponses.filter((r) =>
        r.checklist.some(Boolean)
      ).length;

    const loadedCompletion =
      Math.round(
        (loadedStepsCompleted /
          steps.length) *
          100
      );

    const loadedProfileValid =
      Object.values(loadedProfile).every(
        (v) =>
          String(v).trim().length > 0
      ) &&
      loadedProfile.phone.replace(/\D/g, "")
        .length === 10;

    setStepIndex(saved.stepIndex ?? 0);
    setResponses(loadedResponses);
    setProfile(loadedProfile);

    if (!loadedProfileValid) {
      setView("profile");
    } else if (
      postLoginRedirect === "workbook"
    ) {
      setView(
        loadedCompletion >= 100
          ? "results"
          : "workbook"
      );
    } else if (
      postLoginRedirect === "results" ||
      postLoginRedirect === "fixplan"
    ) {
      setView(
        loadedCompletion >= 100
          ? postLoginRedirect
          : "workbook"
      );
    } else if (postLoginRedirect) {
      setView(postLoginRedirect);
    } else if (loadedCompletion >= 100) {
      setView("results");
    } else {
      setView("workbook");
    }
  }, [
    session?.user?.id,
    postLoginRedirect,
  ]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const safeView = !profileValid
      ? "profile"
      : view;

    saveState(
      session.user.id,
      safeView,
      stepIndex,
      responses,
      profile
    );
  }, [
    session?.user?.id,
    view,
    stepIndex,
    responses,
    profile,
    profileValid,
  ]);

  useEffect(() => {
    if (
      !profileValid &&
      session &&
      view !== "profile"
    ) {
      setView("profile");
    }
  }, [profileValid, view, session]);

  useEffect(() => {
    if (
      view === "profile" &&
      session &&
      !setupWelcomeSeen
    ) {
      setModal({
        title: "Welcome",
        message:
          "Complete your business information before starting the diagnostic. This helps generate a more accurate revenue leak analysis.",
        kind: "info",
        actions: [
          {
            label: "OK",
            onClick: () => {
              setModal(null);
              setSetupWelcomeSeen(true);
            },
            primary: true,
          },
        ],
      });
    }
  }, [
    view,
    setupWelcomeSeen,
    session,
  ]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisIndex(0);
      return;
    }

    const timer =
      window.setInterval(
        () =>
          setAnalysisIndex(
            (prev) =>
              (prev + 1) %
              analysisLines.length
          ),
        320
      );

    return () =>
      window.clearInterval(timer);
  }, [
    isAnalyzing,
    analysisLines.length,
  ]);

  const currentStep =
    steps[stepIndex];

  const currentResponse =
    responses[stepIndex];

  const noneIndex =
    currentResponse.checklist.length - 1;

  const leak = useMemo(() => {
    const baseRevenue =
      Number(profile.calls || 0) *
      Number(profile.ticket || 0) *
      (Number(profile.close || 0) /
        100);

    if (!baseRevenue) return 0;

    let score = 0;

    responses.forEach(
      (response, idx) => {
        const noneSelected =
          response.checklist[
            response.checklist.length - 1
          ];

        const selectedCount =
          response.checklist
            .slice(0, -1)
            .filter(Boolean).length;
if (noneSelected) {
  return;
} else if (selectedCount > 0) {
          const weights =
            steps[idx].weights;

          score +=
            selectedCount *
            (weights.calls +
              weights.follow +
              weights.ticket);
        }
      }
    );

    return Math.round(
      baseRevenue *
        0.25 *
        (score / 20)
    );
  }, [responses, profile]);

  const breakdown =
    useMemo<Breakdown>(() => {
      const total = leak;

      if (!total) {
        return {
          callHandling: 0,
          followUp: 0,
          pricingUpsell: 0,
          visibility: 0,
          systems: 0,
          dominantKey: "callHandling",
          dominantLabel:
            "Call Handling",
        };
      }

      const buckets = {
        callHandling: 0,
        followUp: 0,
        pricingUpsell: 0,
        visibility: 0,
        systems: 0,
      };

      responses.forEach(
        (response, idx) => {
          const noneSelected =
            response.checklist[
              response.checklist.length - 1
            ];

          const selectedCount =
            response.checklist
              .slice(0, -1)
              .filter(Boolean).length;

          const multiplier =
  noneSelected
    ? 0
    : selectedCount
      ? 1 + selectedCount * 0.18
      : 0;

          if (!multiplier) return;

          if (idx <= 2) {
            buckets.callHandling +=
              multiplier * 1.2;
          } else if (idx <= 5) {
            buckets.followUp +=
              multiplier * 1.1;
          } else if (idx <= 7) {
            buckets.pricingUpsell +=
              multiplier * 1.4;
          } else if (idx <= 9) {
            buckets.visibility +=
              multiplier * 0.9;
          } else {
            buckets.systems +=
              multiplier * 0.8;
          }
        }
      );

      const weights = {
        callHandling:
          buckets.callHandling + 1,
        followUp: buckets.followUp + 1,
        pricingUpsell:
          buckets.pricingUpsell + 1,
        visibility:
          buckets.visibility + 1,
        systems: buckets.systems + 1,
      };

      const weightSum =
        Object.values(weights).reduce(
          (a, b) => a + b,
          0
        );

      const rounded = {
        callHandling: Math.round(
          (weights.callHandling /
            weightSum) *
            total
        ),
        followUp: Math.round(
          (weights.followUp /
            weightSum) *
            total
        ),
        pricingUpsell: Math.round(
          (weights.pricingUpsell /
            weightSum) *
            total
        ),
        visibility: Math.round(
          (weights.visibility /
            weightSum) *
            total
        ),
        systems: 0,
      };

      rounded.systems = Math.max(
        0,
        total -
          rounded.callHandling -
          rounded.followUp -
          rounded.pricingUpsell -
          rounded.visibility
      );

      const labels: Record<
        BreakdownKey,
        string
      > = {
        callHandling:
          "Call Handling",
        followUp: "Follow-Up",
        pricingUpsell:
          "Pricing & Upsell",
        visibility: "Visibility",
        systems: "Systems",
      };

      let dominantKey: BreakdownKey =
        "callHandling";

      let dominantValue = -1;

      (
        Object.keys(
          rounded
        ) as BreakdownKey[]
      ).forEach((key) => {
        if (
          rounded[key] >
          dominantValue
        ) {
          dominantValue =
            rounded[key];
          dominantKey = key;
        }
      });

      return {
        ...rounded,
        dominantKey,
        dominantLabel:
          labels[dominantKey],
      };
    }, [responses, leak]);

  const confidence = useMemo(
    () =>
      Math.min(
        96,
        Math.max(
          15,
          Math.round(
            completion * 0.9 +
              (profileValid ? 8 : 0)
          )
        )
      ),
    [completion, profileValid]
  );

  useEffect(() => {
    if (
      previousLeakRef.current > 0 &&
      leak < previousLeakRef.current
    ) {
      setFlash(
        previousLeakRef.current - leak
      );

      const timer =
        window.setTimeout(
          () => setFlash(null),
          2200
        );

      previousLeakRef.current =
        leak;

      return () =>
        window.clearTimeout(timer);
    }

    previousLeakRef.current = leak;
  }, [leak]);

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setAuthError("");
    setAuthMessage("");
    setAuthSubmitting(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword(
          {
            email: email
              .trim()
              .toLowerCase(),
            password,
          }
        );

      if (error) throw error;

      setAuthMessage(
        "Workbook access opened."
      );
    } catch (error: any) {
      setAuthError(
        error.message || "Login failed."
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setAuthError(
        "Enter your email first to reset your password."
      );
      return;
    }

    setAuthError("");
    setAuthMessage("");
    setAuthSubmitting(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo:
              window.location.origin,
          }
        );

      if (error) throw error;

      setAuthMessage(
        "Password reset email sent."
      );
    } catch (error: any) {
      setAuthError(
        error.message ||
          "Could not send reset email."
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setResponses(createResponses());
    setProfile(initialProfile);
    setStepIndex(0);
    setView("profile");
    setPassword("");
  }

  function setChecklistValue(
    index: number,
    nextChecked: boolean
  ) {
    setResponses((prev) =>
      prev.map((response, idx) => {
        if (idx !== stepIndex) {
          return response;
        }

        const next = [
          ...response.checklist,
        ];

        next[index] = nextChecked;

        if (
          index === noneIndex &&
          nextChecked
        ) {
          for (
            let i = 0;
            i < noneIndex;
            i += 1
          ) {
            next[i] = false;
          }
        }

        if (
          index !== noneIndex &&
          nextChecked
        ) {
          next[noneIndex] = false;
        }

        return {
          ...response,
          checklist: next,
        };
      })
    );
  }

  function updateNotes(value: string) {
    setResponses((prev) =>
      prev.map((response, idx) =>
        idx === stepIndex
          ? {
              ...response,
              notes: value,
            }
          : response
      )
    );
  }

  function saveAndExit() {
    if (session?.user?.id) {
      saveState(
        session.user.id,
        profileValid ? view : "profile",
        stepIndex,
        responses,
        profile
      );
    }

    setModal({
      title:
        "Your progress has been saved.",
      message:
        "Would you like to continue, return to your Command Center, or exit?",
      kind: "success",
      actions: [
        {
          label: "Continue",
          onClick: () => setModal(null),
          primary: true,
        },
        {
          label: "Command Center",
          onClick: () => {
            setModal(null);
            setView(
              profileValid
                ? "dashboard"
                : "profile"
            );
          },
        },
        {
          label: "Exit",
          onClick: () => {
            setModal(null);
            logout();
          },
        },
      ],
    });
  }

  function goToWorkbook() {
    if (!profileValid) {
      setModal({
        title:
          "Complete Business Setup First",
        message:
          "Business Setup must be completed before the diagnostic can begin.",
        kind: "warning",
        actions: [
          {
            label: "Got It",
            onClick: () => setModal(null),
            primary: true,
          },
        ],
      });

      setView("profile");
      return;
    }

    setView("workbook");
  }

  function nextStep() {
    if (
      !currentResponse.checklist.some(
        Boolean
      )
    ) {
      setModal({
        title:
          "Select An Option To Continue",
        message:
          "Choose at least one option, or choose None of the Above, before moving to the next step.",
        kind: "warning",
        actions: [
          {
            label: "Got It",
            onClick: () => setModal(null),
            primary: true,
          },
        ],
      });

      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex(
        (prev) => prev + 1
      );
      return;
    }

    setIsAnalyzing(true);

    window.setTimeout(() => {
      setIsAnalyzing(false);
      setView("results");
    }, 1800);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading workbook access...
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onLogin={handleLogin}
        authError={authError}
        authMessage={authMessage}
        authSubmitting={authSubmitting}
        onForgotPassword={
          handleForgotPassword
        }
      />
    );
  }

  let content: React.ReactNode;

  if (view === "dashboard") {
    const nextStepTitle =
      completion >= 100
        ? "Your Results Are Ready"
        : steps[stepIndex]?.title ||
          "Diagnostic";

    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Welcome Back
          </div>

          <div className="mt-2 text-2xl font-semibold">
            {profile.company ||
              "Your"}{" "}
            Revenue Leak Workbook
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-400">
            {completion >= 100
              ? "Your diagnostic is complete. Your results and Fix Plan are ready."
              : `You were working on ${nextStepTitle}. Continue where you left off.`}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Progress
              </div>
              <div className="text-2xl text-white">
                {completion}%
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Revenue At Risk
              </div>
              <div className="text-2xl text-amber-300">
                {formatMoney(leak)}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Confidence
              </div>
              <div className="text-2xl text-white">
                {confidence}%
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-400">
            Top Suspected Bottleneck
          </div>

          <div className="mt-1 text-2xl font-semibold text-white">
            {breakdown.dominantLabel}
          </div>

          <div className="mt-2 text-sm text-slate-400">
            This becomes more accurate as the workbook reaches 100% completion.
          </div>
        </Card>

        {completion >= 100 ? (
          <Btn
            primary
            glow
            onClick={() =>
              setView("results")
            }
          >
            View My Results
          </Btn>
        ) : (
          <Btn
            primary
            onClick={() =>
              setView(
                profileValid
                  ? "workbook"
                  : "profile"
              )
            }
          >
            Continue My Diagnosis
          </Btn>
        )}

        {flash ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300">
            You just unlocked{" "}
            {formatMoney(flash)}/mo
          </div>
        ) : null}
      </div>
    );
  } else if (view === "profile") {
    const fieldLabels: Record<
      keyof Profile,
      string
    > = {
      name: "Full Name",
      company: "Company Name",
      phone: "Phone Number",
      calls:
        "Monthly Incoming Calls",
      ticket:
        "Average Ticket Amount",
      close:
        "Current Monthly Close %",
      services:
        "Services Offered",
      contractorType:
        "Contractor Type",
    };

    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Business Setup
          </div>

          <div className="mt-2 text-lg font-semibold">
            Complete your business information to begin.
          </div>

          <div className="mt-2 text-sm leading-6 text-slate-400">
            This helps personalize your revenue leak estimate and Fix Plan.
          </div>
        </Card>

        {(
          Object.keys(profile) as Array<
            keyof Profile
          >
        ).map((key) => (
          <div key={key}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {fieldLabels[key]}
            </label>

            <input
              placeholder={
                fieldLabels[key]
              }
              value={profile[key]}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  [key]:
                    key === "phone"
                      ? formatPhone(
                          e.target.value
                        )
                      : e.target.value,
                })
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-white outline-none placeholder:text-slate-500"
            />
          </div>
        ))}
{!profileValid && profileErrors.length > 0 ? (
  <div className="text-sm text-red-400">
    {profileErrors.join(" | ")}
  </div>
) : null}

{!profileValid ? (
  <div className="text-sm text-amber-300">
    Complete all required fields to begin your diagnosis.
  </div>
) : (
          <div className="text-sm text-emerald-300">
            Your setup is complete. You can now begin.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>
            Save & Exit
          </Btn>

          <Btn
            primary
            disabled={!profileValid}
            onClick={goToWorkbook}
          >
            Start My Diagnosis
          </Btn>
        </div>
      </div>
    );
  } else if (view === "workbook") {
    content = (
      <div className="space-y-4">
        <div className="sticky top-[73px] z-30 bg-black/90 pb-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
              Live System Calibration
            </div>

            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
              {stepIndex + 1} of{" "}
              {steps.length}
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-300 transition-all duration-300"
              style={{
                width: `${
                  ((stepIndex + 1) /
                    steps.length) *
                  100
                }%`,
              }}
            />
          </div>

          <h2 className="mt-4 text-xl font-semibold">
            {currentStep.title}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {currentStep.question}
          </p>

          <div className="mt-3 rounded-xl bg-white/5 p-3 text-xs text-slate-400">
            Confidence: {confidence}% •
            Revenue at risk identified
            so far:{" "}
            <span className="text-amber-300">
              {formatMoney(leak)}
            </span>
          </div>
        </div>

        {[
          ...currentStep.checklist,
          NONE,
        ].map((item, idx) => (
          <div
            key={`${item}-${idx}`}
            onClick={() =>
              setChecklistValue(
                idx,
                !currentResponse
                  .checklist[idx]
              )
            }
            className={`rounded-xl border p-5 ${
              currentResponse
                .checklist[idx]
                ? "border-amber-300 bg-amber-300/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            {item}
          </div>
        ))}

        <Card>
          <div className="text-sm text-slate-400">
            Implementation Notes
          </div>

          <textarea
            value={currentResponse.notes}
            onChange={(e) =>
              updateNotes(e.target.value)
            }
            placeholder="Write notes, examples, or details about this part of your business..."
            className="mt-3 min-h-[150px] w-full rounded-xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-slate-600"
          />
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>
            Save & Exit
          </Btn>

          <Btn
            onClick={() =>
              setStepIndex((prev) =>
                Math.max(0, prev - 1)
              )
            }
          >
            Previous
          </Btn>

          <Btn
            primary
            onClick={nextStep}
          >
            {stepIndex < steps.length - 1
              ? "Next Step"
              : "Reveal My Results"}
          </Btn>
        </div>
      </div>
    );
  } else if (view === "fixplan") {
    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Personalized Fix Plan
          </div>

          <div className="mt-2 text-3xl font-semibold">
            {profile.name.split(" ")[0] ||
              "Operator"}
            , here’s what’s likely holding back{" "}
            {profile.company ||
              "your business"}
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-400">
            Based on your workbook answers, we identified where revenue may be leaking and what systems are most likely to create the fastest gains.
          </div>
        </Card>

        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Revenue At Risk
              </div>
              <div className="text-2xl text-amber-300">
                {formatMoney(leak)}/mo
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Likely Bottleneck
              </div>
              <div className="text-2xl text-white">
                {breakdown.dominantLabel}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                System Score
              </div>
              <div className="text-2xl text-white">
                {completion}%
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-slate-500">
                Diagnostic Confidence
              </div>
              <div className="text-2xl text-white">
                {confidence}%
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="aspect-video rounded-2xl border border-white/10 bg-black/40 p-6 text-center flex flex-col items-center justify-center">
            <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
              Micro-VSL Placeholder
            </div>

            <div className="mt-3 text-2xl font-semibold">
              Watch Your Fix Plan Overview
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Dynamic spoken intro idea: “
              {profile.name.split(" ")[0] ||
                "Operator"}
              , based on what we found in{" "}
              {profile.company ||
                "your workbook"}
              , your biggest opportunity appears to be{" "}
              {breakdown.dominantLabel}
              ...”
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold">
            What happens on your Fix Plan Session
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-400">
            <div>
              ✓ Review your workbook findings
            </div>
            <div>
              ✓ Confirm the biggest bottleneck
            </div>
            <div>
              ✓ Prioritize the highest ROI fix
            </div>
            <div>
              ✓ Show what can realistically be automated first
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn
            onClick={() =>
              setView("results")
            }
          >
            Back to Results
          </Btn>

          <Btn
            primary
            glow
            onClick={() => {
              window.location.href =
                BOOK_CALL_LINK;
            }}
          >
            Book My Fix Plan Session
          </Btn>
        </div>
      </div>
    );
  } else {
    const rows: Array<
      [string, number]
    > = [
      [
        "Call Handling",
        breakdown.callHandling,
      ],
      ["Follow-Up", breakdown.followUp],
      [
        "Pricing & Upsell",
        breakdown.pricingUpsell,
      ],
      ["Visibility", breakdown.visibility],
      ["Systems", breakdown.systems],
    ];

    content = (
      <div className="space-y-4">
        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            System Analysis Complete
          </div>

          <div className="text-4xl text-amber-300">
            {formatMoney(leak)}
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-400">
            Estimated monthly revenue leakage based on your workbook answers.
          </div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
            Dominant Leak
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {breakdown.dominantLabel}
          </div>

          <div className="mt-1 text-lg text-amber-300">
            {formatMoney(
              breakdown[
                breakdown.dominantKey
              ]
            )}
            /mo
          </div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Revenue Leak Breakdown
          </div>

          <div className="mt-4 space-y-4">
            {rows.map(
              ([label, amount]) => (
                <div
                  key={label}
                  className={`rounded-xl border p-4 ${
                    label ===
                    breakdown.dominantLabel
                      ? "border-amber-300/40 bg-amber-300/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-white">
                      {label}
                    </div>

                    <div className="text-lg font-semibold text-amber-300">
                      {formatMoney(amount)}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </Card>

        <Card>
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
            Fix Plan Ready
          </div>

          <div className="mt-2 text-lg font-semibold">
            Your recovery path is ready to review.
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-400">
            Unlock your personalized Fix Plan overview and book a session to map the highest ROI fixes.
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Btn onClick={saveAndExit}>
            Save & Exit
          </Btn>

          <Btn
            onClick={() =>
              setView("dashboard")
            }
          >
            Command Center
          </Btn>

          <Btn
            primary
            glow
            onClick={() =>
              setView("fixplan")
            }
          >
            Unlock My Fix Plan
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <>
      <AppShell
        view={view}
        setView={setView}
        leak={leak}
        completion={completion}
        company={profile.company}
        saveAndExit={saveAndExit}
        setupComplete={profileValid}
        setModal={setModal}
        email={session.user.email}
        logout={logout}
      >
        {content}
      </AppShell>

      <AnimatePresence>
        {isAnalyzing ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-6 text-white"
          >
            <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
                Revenue Intelligence Engine
              </div>

              <h3 className="mt-3 text-2xl font-semibold">
                Analyzing Your Business...
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Built from real contractor operating patterns, enhanced by AI-assisted recognition.
              </p>

              <div className="mt-6 space-y-3 text-sm text-slate-300">
                {analysisLines.map(
                  (line, idx) => (
                    <div
                      key={line}
                      className={`${
                        idx <= analysisIndex
                          ? "opacity-100"
                          : "opacity-30"
                      } transition-opacity duration-300`}
                    >
                      {line}
                    </div>
                  )
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Modal state={modal} />
    </>
  );
}

export const ghlToSupabaseEdgeFunctionPayloadExample =
  {
    email: "{{contact.email}}",
    password:
      "{{contact.custom_fields.temp_password}}",
    fullName: "{{contact.full_name}}",
    companyName:
      "{{contact.company_name}}",
    phone: "{{contact.phone}}",
    redirectUrl:
      "https://new-app-hvac-in-a-box.vercel.app?redirect=workbook",
  };
