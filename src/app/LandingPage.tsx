"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Briefcase, Building2, CheckCircle2, ChevronRight,
  ClipboardList, FolderOpen, Globe, MessageSquare, Paperclip,
  ScrollText, Shield, Star, TrendingUp, Users, Zap,
} from "lucide-react";

// ─── Scroll-reveal hook ──────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const timer = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(timer); }
        else setVal(start);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
              <span className="text-sm font-bold text-white">SC</span>
            </div>
            <span className={`text-lg font-bold ${scrolled ? "text-slate-900" : "text-white"}`}>
              SevoCorp
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden items-center gap-8 md:flex">
            {["Features", "How It Works", "For Companies", "For Professionals"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className={`text-sm font-medium transition hover:text-emerald-400 ${
                  scrolled ? "text-slate-600" : "text-white/80"
                }`}
              >
                {l}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className={`text-sm font-medium transition ${
                scrolled ? "text-slate-700 hover:text-emerald-600" : "text-white/90 hover:text-white"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:bg-emerald-600 hover:shadow-emerald-500/40"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={`md:hidden ${scrolled ? "text-slate-700" : "text-white"}`}
            onClick={() => setOpen(!open)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          {["Features", "How It Works", "For Companies", "For Professionals"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, "-")}`}
              className="block py-2 text-sm font-medium text-slate-700"
              onClick={() => setOpen(false)}
            >
              {l}
            </a>
          ))}
          <div className="mt-4 flex gap-3">
            <Link href="/login" className="flex-1 rounded-full border border-slate-200 py-2 text-center text-sm font-medium text-slate-700">
              Sign in
            </Link>
            <Link href="/register" className="flex-1 rounded-full bg-emerald-500 py-2 text-center text-sm font-semibold text-white">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-slate-900 pt-16">
      {/* Animated gradient background */}
      <div
        className="animate-gradient absolute inset-0 opacity-60"
        style={{
          background: "linear-gradient(135deg, #064e3b, #065f46, #047857, #0d9488, #0f172a, #1e293b)",
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Glow orbs */}
      <div className="absolute left-1/4 top-1/3 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/3 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div>
            <div className="animate-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
              <Zap className="h-3.5 w-3.5" />
              Virtual Department Platform
            </div>

            <h1
              className="animate-fade-up mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "0.1s" }}
            >
              Run Your Virtual{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Department
              </span>{" "}
              Like a Pro
            </h1>

            <p
              className="animate-fade-up mb-8 text-lg leading-relaxed text-slate-300"
              style={{ animationDelay: "0.2s" }}
            >
              SevoCorp connects companies with skilled professionals in a unified
              workspace — manage tasks, track progress, collaborate in real time,
              and scale your team without the overhead.
            </p>

            <div
              className="animate-fade-up flex flex-wrap gap-4"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400 hover:shadow-emerald-400/50"
              >
                Start for Free
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
              >
                Sign In
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="animate-fade-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: "0.5s" }}>
              {[
                { icon: Shield, text: "Enterprise-grade security" },
                { icon: Globe, text: "Works remotely" },
                { icon: Star, text: "No credit card needed" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-sm text-slate-400">
                  <Icon className="h-4 w-4 text-emerald-400" />
                  {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard mockup */}
          <div className="animate-float hidden lg:block">
            <div className="relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 rounded-2xl bg-emerald-500/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800/80 shadow-2xl backdrop-blur-sm">
                {/* Mockup top bar */}
                <div className="flex items-center gap-1.5 border-b border-white/10 bg-slate-900/60 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-red-400/70" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/70" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/70" />
                  <div className="ml-3 h-5 flex-1 rounded-full bg-white/5 px-3 text-xs leading-5 text-slate-500">
                    app.sevocorp.com/company
                  </div>
                </div>
                {/* Mockup content */}
                <div className="p-5">
                  {/* Stat cards */}
                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      { label: "Active Tasks", val: "24", color: "text-emerald-400" },
                      { label: "Team Members", val: "8", color: "text-teal-400" },
                      { label: "Completed", val: "142", color: "text-blue-400" },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg bg-slate-700/60 p-3">
                        <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-[11px] text-slate-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Task rows */}
                  <div className="space-y-2">
                    {[
                      { title: "Design system update", status: "IN PROGRESS", dot: "bg-blue-400" },
                      { title: "API integration review", status: "REVIEW", dot: "bg-purple-400" },
                      { title: "Q4 report analysis", status: "PENDING", dot: "bg-yellow-400" },
                      { title: "Onboarding flow UX", status: "COMPLETED", dot: "bg-emerald-400" },
                    ].map((t) => (
                      <div key={t.title} className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${t.dot}`} />
                          <span className="text-xs text-slate-300">{t.title}</span>
                        </div>
                        <span className="rounded-full bg-slate-600/60 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal grid grid-cols-2 gap-8 lg:grid-cols-4">
          {[
            { val: 500, suffix: "+", label: "Companies Registered" },
            { val: 2400, suffix: "+", label: "Professionals Active" },
            { val: 18000, suffix: "+", label: "Tasks Completed" },
            { val: 99, suffix: "%", label: "Uptime Guaranteed" },
          ].map(({ val, suffix, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-emerald-600 lg:text-4xl">
                <Counter to={val} suffix={suffix} />
              </p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: ClipboardList,
    title: "Smart Task Management",
    desc: "Create, assign, prioritize and track tasks across multiple workspaces with a full status lifecycle.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: FolderOpen,
    title: "Multi-Workspace",
    desc: "Organize work into dedicated workspaces per project or department. Archive when done.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Connect companies with the right professionals. Manage team memberships with role-based access.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: MessageSquare,
    title: "Real-time Comments",
    desc: "Threaded comment system with replies and live polling so nothing gets missed.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Paperclip,
    title: "File Deliverables",
    desc: "Upload task deliverables and attachments. Keep all project files organized in one place.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: ScrollText,
    title: "Full Audit Trail",
    desc: "Every action is logged — who did what and when. Stay compliant and accountable.",
    color: "bg-rose-50 text-rose-600",
  },
];

function Features() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            Platform Features
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Everything your virtual team needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-500">
            A complete suite of tools to manage your virtual department — from task creation
            to delivery, with full visibility at every step.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="reveal group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-slate-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Register your company",
      desc: "Sign up in minutes. Create your company profile, set your industry, and invite your first workspace.",
      icon: Building2,
    },
    {
      num: "02",
      title: "Add professionals to your team",
      desc: "Browse available professionals on the platform, review their skills and rates, then invite them to your company.",
      icon: Users,
    },
    {
      num: "03",
      title: "Create tasks & track delivery",
      desc: "Create tasks inside workspaces, assign them to professionals, and track progress from Pending all the way to Completed.",
      icon: TrendingUp,
    },
  ];

  return (
    <section id="how-it-works" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-16 text-center">
          <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            How It Works
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Up and running in three steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            No complicated setup. Start managing your virtual team today.
          </p>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-1/2 top-12 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-emerald-200 via-teal-200 to-transparent lg:block" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className={`reveal flex flex-col items-center gap-8 lg:flex-row ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div className="flex-1 lg:max-w-md">
                  <div className={`rounded-2xl border border-slate-200 bg-white p-8 shadow-sm ${i % 2 === 0 ? "lg:ml-auto" : ""}`}>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-5xl font-black text-emerald-100">{step.num}</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
                        <step.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>

                {/* Center dot */}
                <div className="animate-pulse-ring relative hidden h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-500 text-white shadow-lg lg:flex">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                {/* Spacer */}
                <div className="hidden flex-1 lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Dual Role ────────────────────────────────────────────────────────────────
function DualRole() {
  return (
    <section id="for-companies" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Built for both sides of the equation
          </h2>
          <p className="mt-4 text-slate-500">Whether you hire or deliver work, SevoCorp has you covered.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* For Companies */}
          <div
            id="for-companies"
            className="reveal overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-xl"
          >
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mb-3 text-2xl font-bold">For Companies</h3>
            <p className="mb-6 text-emerald-100">
              Scale your team on demand. Access top professionals, manage projects
              with full visibility, and deliver results faster.
            </p>
            <ul className="mb-8 space-y-3">
              {[
                "Create unlimited workspaces",
                "Assign tasks with priorities & due dates",
                "Review and approve work before completion",
                "Full audit trail of all actions",
                "Real-time collaboration with your team",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-emerald-50">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?role=COMPANY"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-md transition hover:bg-emerald-50"
            >
              Register your company
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* For Professionals */}
          <div
            id="for-professionals"
            className="reveal overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
          >
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <Briefcase className="h-6 w-6 text-slate-700" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-slate-900">For Professionals</h3>
            <p className="mb-6 text-slate-500">
              Join companies that value your skills. Work on meaningful projects,
              build your portfolio, and grow your professional reputation.
            </p>
            <ul className="mb-8 space-y-3">
              {[
                "Build a rich professional profile",
                "Showcase your skills to companies",
                "Get assigned to exciting projects",
                "Upload deliverables directly to tasks",
                "Communicate with clients in-platform",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-600">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register?role=PROFESSIONAL"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-700"
            >
              Join as a professional
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-24">
      <div
        className="animate-gradient absolute inset-0 opacity-50"
        style={{
          background: "linear-gradient(135deg, #064e3b, #065f46, #0d9488, #0f172a)",
        }}
      />
      <div className="absolute left-0 right-0 top-0">
        <svg viewBox="0 0 1440 60" fill="none">
          <path d="M0 0L1440 0L1440 40C1200 0 960 60 720 40C480 20 240 60 0 40L0 0Z" fill="white" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <div className="reveal">
          <span className="mb-6 inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
            Get Started Today
          </span>
          <h2 className="mb-6 text-3xl font-extrabold text-white sm:text-5xl">
            Your virtual team is{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              one click away
            </span>
          </h2>
          <p className="mb-10 text-lg text-slate-300">
            Join hundreds of companies already using SevoCorp to manage their
            virtual departments. Free to start, no credit card required.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-base font-medium text-white transition hover:bg-white/10"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
                <span className="text-sm font-bold text-white">SC</span>
              </div>
              <span className="text-lg font-bold text-white">SevoCorp</span>
            </div>
            <p className="mb-4 max-w-xs text-sm leading-relaxed">
              The all-in-one platform for managing virtual departments — connect
              companies with professionals and get work done.
            </p>
            <div className="flex gap-3">
              {["Twitter", "LinkedIn", "GitHub"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs transition hover:border-emerald-500/50 hover:text-emerald-400"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Platform</p>
            <ul className="space-y-2 text-sm">
              {["Features", "How It Works", "Pricing", "Changelog"].map((l) => (
                <li key={l}>
                  <a href="#" className="transition hover:text-emerald-400">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Company</p>
            <ul className="space-y-2 text-sm">
              {["About", "Blog", "Privacy Policy", "Terms of Service"].map((l) => (
                <li key={l}>
                  <a href="#" className="transition hover:text-emerald-400">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} SevoCorp. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with
            <span className="text-emerald-400">♥</span>
            by meshboc.cc
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function LandingPage() {
  useReveal();

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <DualRole />
      <CTA />
      <Footer />
    </div>
  );
}
