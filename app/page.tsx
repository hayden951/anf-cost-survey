"use client";
import { useState } from "react";

type CategoryKey = "cost" | "performance" | "availability" | "commitment" | "mobility";
type Screen = "intro" | "quiz" | "results";

interface Answer { label: string; s: number; }
interface Question { category: string; badge: string; text: string; answers: Answer[]; key: CategoryKey; }
interface Threshold { lo: number; hi: number; label: string; emoji: string; color: string; bg: string; border: string; desc: string; remediate: string; }
interface RiskStyle { label: string; color: string; bg: string; border: string; }

const CATEGORIES: { [K in CategoryKey]: string } = {
  cost:        "Cost & Utilization",
  performance: "Performance & Tiering",
  availability:"Availability",
  commitment:  "Commitment & Flexibility",
  mobility:    "Workload & Data Mobility",
};

const questions: Question[] = [
  { category: "Cost & Utilization", badge: "PRIORITY", text: "Based on deployed capacity versus used capacity, what percentage of the Azure NetApp Files capacity are you actually using? (fleet wide)", answers: [{ label: "More than 80%", s: 1 }, { label: "60–80%", s: 2 }, { label: "40–60%", s: 3 }, { label: "Less than 40%", s: 4 }], key: "cost" },
  { category: "Cost & Utilization", badge: "PRIORITY", text: "Over the last 12 months, have you needed to deploy a new Azure NetApp Files cluster because another cluster was becoming full?", answers: [{ label: "Yes, several new deployments", s: 4 }, { label: "Yes, one new deployment", s: 3 }, { label: "No, our existing clusters are not full", s: 1 }, { label: "I don't know", s: 2 }], key: "cost" },
  { category: "Performance & Tiering", badge: "HIGH RISK", text: "When you size your Azure NetApp Files clusters, have you experienced the challenge of provisioning more capacity than you need, just to hit a performance threshold? (i.e., ANF Standard has a limit of 16 MiB/TB provisioned, Premium is 64 MiB/TB provisioned, Ultra is 128 MiB/TB)", answers: [{ label: "Yes, we routinely provision more capacity to achieve the required performance", s: 4 }, { label: "Sometimes, we use different clusters for high-performance and low performance workloads", s: 3 }, { label: "No — we use the tier that matches our performance and capacity needs", s: 1 }, { label: "I don't know", s: 2 }], key: "performance" },
  { category: "Availability", badge: "HIGH RISK", text: "Have you experienced difficulty securing available capacity when deploying Azure NetApp Files?", answers: [{ label: "Yes, we regularly escalate to Microsoft for more capacity", s: 4 }, { label: "Sometimes, we are able to launch on-demand about 50% of the time", s: 3 }, { label: "No, we routinely deploy ANF on-demand without coordinating capacity", s: 1 }, { label: "I don't know or we haven't deployed something new recently", s: 2 }], key: "availability" },
  { category: "Commitment & Flexibility", badge: "QUICK WIN", text: "Do you use Azure NetApp Files reserved capacity commitments to control costs?", answers: [{ label: "Yes, we use 3 year commitments routinely", s: 1 }, { label: "Yes, we use 1 year commitments routinely", s: 2 }, { label: "Sometimes, we use reserved capacity commitments for specific clusters, but not all", s: 3 }, { label: "No, we only use fully flexible clusters", s: 4 }], key: "commitment" },
  { category: "Commitment & Flexibility", badge: "QUICK WIN", text: "If your capacity or performance requirements change, how easily can you reduce your ANF commitment or right-size without penalty?", answers: [{ label: "Easily, anytime", s: 1 }, { label: "With some notice or planning", s: 2 }, { label: "Difficult, largely locked in for the term", s: 3 }, { label: "Not without penalty or stranded commitment", s: 4 }], key: "commitment" },
  { category: "Workload & Data Mobility", badge: "HIGH RISK", text: "Do you deploy separate systems (workload-by-workload) or do you service multiple workloads from the same Azure NetApp Files instance?", answers: [{ label: "Fully unified deployment, one system covers everything", s: 1 }, { label: "We use one main system for general file, then deploy small instances for some workloads", s: 2 }, { label: "Each workload gets its own instance", s: 4 }, { label: "I don't know", s: 3 }], key: "mobility" },
  { category: "Workload & Data Mobility", badge: "HIGH RISK", text: "How easily can you move or share your Azure NetApp Files data across regions, clouds, or back on-prem without copying or migrating it?", answers: [{ label: "Easily, we use a global data fabric to provide this functionality", s: 1 }, { label: "With some effort, we use SnapMirror to connect clusters (requires copying)", s: 2 }, { label: "We copy full datasets across regions, clouds, or other clusters", s: 3 }, { label: "We only operate in one region today", s: 4 }], key: "mobility" },
];

const THRESHOLDS: Threshold[] = [
  { lo: 8,  hi: 15, label: "Low Exposure",      emoji: "🟢", color: "#14532d", bg: "#dcfce7", border: "#16a34a", desc: "Your ANF setup is well-optimized. Utilization is high, commitments are in place, and data mobility is strong.", remediate: "Monitor quarterly — no urgent action needed." },
  { lo: 16, hi: 22, label: "Moderate Exposure", emoji: "🟡", color: "#713f12", bg: "#fef9c3", border: "#ca8a04", desc: "Some inefficiencies in provisioning or commitment strategy. Begin evaluating tiering, reserved capacity, and workload consolidation.", remediate: "6–12 months — begin optimization planning." },
  { lo: 23, hi: 27, label: "High Exposure",     emoji: "🟠", color: "#7c2d12", bg: "#ffedd5", border: "#ea580c", desc: "Meaningful cost exposure from over-provisioning, capacity constraints, or lack of reserved commitments. Prioritize a cost optimization review.", remediate: "3–6 months — prioritize cost review this quarter." },
  { lo: 28, hi: 32, label: "Critical Exposure", emoji: "🔴", color: "#7f1d1d", bg: "#fee2e2", border: "#dc2626", desc: "Highly exposed to ANF cost inefficiency. Over-provisioned, under-committed, and limited data mobility. Act immediately to reduce waste and risk.", remediate: "Act now — immediate cost optimization required." },
];

const catKeys: CategoryKey[] = ["cost", "performance", "availability", "commitment", "mobility"];

function getOverallRisk(score: number): Threshold {
  return THRESHOLDS.find(t => score >= t.lo && score <= t.hi) || THRESHOLDS[THRESHOLDS.length - 1];
}
function getCatRisk(score: number, max: number): RiskStyle {
  const pct = score / max;
  if (pct <= 0.33) return { label: "Low Risk",    color: "#14532d", bg: "#dcfce7", border: "#16a34a" };
  if (pct <= 0.66) return { label: "Medium Risk", color: "#713f12", bg: "#fef9c3", border: "#ca8a04" };
  return                  { label: "High Risk",   color: "#7f1d1d", bg: "#fee2e2", border: "#dc2626" };
}
function getCatIndex(category: string): number {
  return catKeys.findIndex((k: CategoryKey) => CATEGORIES[k] === category);
}
function getBadgeStyle(badge: string) {
  if (badge === "PRIORITY") return { bg: "#fee2e2", color: "#991b1b" };
  if (badge === "HIGH RISK") return { bg: "#ffedd5", color: "#9a3412" };
  if (badge === "QUICK WIN") return { bg: "#dcfce7", color: "#166534" };
  return { bg: "#f3f4f6", color: "#374151" };
}
function downloadPDF(): void {
  const root = document.getElementById('results-printable');
  const clone = root!.cloneNode(true) as HTMLElement;
  clone.id = 'print-clone';
  clone.style.cssText = 'position:static;width:100%;background:#f9fafb;padding:24px;box-sizing:border-box;';
  document.body.appendChild(clone);
  const s = document.createElement('style');
  s.id = 'pf';
  s.innerHTML = '@media print{@page{margin:0.6in;size:letter}body > *:not(#print-clone){display:none!important}#print-clone{display:block!important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}*{overflow:visible!important;max-height:none!important;height:auto!important}button{display:none!important}}';
  document.head.appendChild(s);
  window.print();
  setTimeout(() => { const e = document.getElementById('pf'); if (e) e.remove(); const c = document.getElementById('print-clone'); if (c) c.remove(); }, 1500);
}

function ScoringHeader() {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 28px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: "4px solid #0078d4" }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#0078d4", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Azure NetApp Files · 2-Minute Self-Assessment</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>How much is your Azure NetApp Files setup really costing you?</p>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px", lineHeight: 1.6 }}>Provisioned-capacity billing, throughput tiers, and reserved commitments can quietly inflate ANF spend. Answer 8 quick questions to see what optimizations are most important — and what to do about it.</p>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 16px", fontStyle: "italic" }}>Your answers are used only to generate your assessment. A diagnostic, not a pitch.</p>
      <div style={{ display: "flex", gap: 20, paddingTop: 12, borderTop: "1px solid #f3f4f6" }}>
        {[["5", "Categories"], ["8", "Questions"], ["32", "Max Score"], ["~2 min", "Time"]].map(([val, lbl]) => (
          <div key={lbl} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>{val}</div>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [currentQ, setCurrentQ] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const q: Question = questions[currentQ];
  const isLast: boolean = currentQ === questions.length - 1;
  const progress: number = ((currentQ + 1) / questions.length) * 100;
  const catIdx: number = getCatIndex(q.category);
  const badgeStyle = getBadgeStyle(q.badge);

  function handleNext(): void {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    if (isLast) { setAnswers(newAnswers); setScreen("results"); }
    else { setAnswers(newAnswers); setCurrentQ(currentQ + 1); setSelected(null); }
  }
  function handleRestart(): void {
    setScreen("intro"); setCurrentQ(0); setAnswers([]); setSelected(null);
  }

  // ── INTRO ────────────────────────────────────────────────────
  if (screen === "intro") {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f7fc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 640, width: "100%" }}>
          <div style={{ background: "radial-gradient(120% 140% at 80% -10%, #003a8c 0%, #001d4a 45%, #000d24 100%)", borderRadius: 20, padding: "48px 40px", boxShadow: "0 10px 40px rgba(0,120,212,0.4)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: 40, background: "radial-gradient(circle, rgba(0,120,212,0.25), transparent 70%)", filter: "blur(6px)" }} />
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#60a5fa", margin: "0 0 14px" }}>Azure NetApp Files · 2-Minute Self-Assessment</p>
            <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800, lineHeight: 1.1, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.01em" }}>How much is your Azure NetApp Files setup really costing you?</h1>
            <p style={{ fontSize: 16, color: "#bfdbfe", margin: "0 0 24px", lineHeight: 1.6, maxWidth: 520 }}>Provisioned-capacity billing, throughput tiers, and reserved commitments can quietly inflate ANF spend. Answer 8 quick questions to see how much you are paying, what optimizations are most important — and what to do about it.</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "#93c5fd", marginBottom: 30 }}>
              <span><strong style={{ color: "#fff" }}>8</strong> questions</span>
              <span><strong style={{ color: "#fff" }}>~2 minutes</strong></span>
              <span><strong style={{ color: "#fff" }}>Instant</strong> exposure score</span>
            </div>
            <button onClick={() => setScreen("quiz")} style={{ background: "#0078d4", color: "#fff", border: "none", borderRadius: 10, padding: "15px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,120,212,0.4)", letterSpacing: "0.01em" }}>
              Start the assessment →
            </button>
            <p style={{ fontSize: 12, color: "#60a5fa", margin: "16px 0 0", fontStyle: "italic" }}>Your answers are used only to generate your assessment. A diagnostic, not a pitch.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────
  if (screen === "results") {
    const totals: { [K in CategoryKey]: number } = { cost: 0, performance: 0, availability: 0, commitment: 0, mobility: 0 };
    answers.forEach((ai: number, qi: number) => { totals[questions[qi].key] += questions[qi].answers[ai].s; });
    const totalScore: number = Object.values(totals).reduce((a, b) => a + b, 0);
    const overall: Threshold = getOverallRisk(totalScore);

    return (
      <div style={{ minHeight: "100vh", background: "#f9fafb", padding: 24 }}>
        <div id="results-printable" style={{ maxWidth: 560, margin: "0 auto" }}>
          {totalScore > 20 && (
            <div style={{ background: "#0078d4", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>💬 Let&apos;s talk about your ANF costs</p>
              <p style={{ fontSize: 13, color: "#bfdbfe", margin: 0, lineHeight: 1.7 }}>You scored <strong style={{ color: "#fff" }}>{totalScore} out of 32</strong>. There are likely meaningful cost optimization opportunities in your ANF environment. Let&apos;s walk through what this looks like.</p>
            </div>
          )}
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 8px" }}>Overall Exposure Score</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "#111" }}>{totalScore} <span style={{ fontSize: 16, color: "#9ca3af", fontWeight: 400 }}>/ 32</span></span>
              <span style={{ background: overall.bg, color: overall.color, border: `1px solid ${overall.border}`, borderRadius: 999, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>{overall.emoji} {overall.label}</span>
            </div>
            <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(totalScore / 32) * 100}%`, background: overall.border, borderRadius: 4 }} />
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 16px" }}>Score by Category</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {catKeys.map((key: CategoryKey, i: number) => {
                const name: string = CATEGORIES[key];
                const catMax: number = questions.filter((q: Question) => q.key === key).length * 4;
                const score: number = totals[key];
                const risk: RiskStyle = getCatRisk(score, catMax);
                const isPriority: boolean = key === "cost";
                const isQuickWin: boolean = key === "commitment";
                return (
                  <div key={key} style={{ padding: "14px 16px", borderRadius: 8, border: isPriority ? "1.5px solid #fca5a5" : isQuickWin ? "1.5px solid #86efac" : "1px solid #f3f4f6", background: isPriority ? "#fff7f7" : isQuickWin ? "#f0fdf4" : "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{i + 1}.</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{name}</span>
                          {isPriority && <span style={{ fontSize: 10, fontWeight: 700, background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "1px 6px" }}>PRIORITY</span>}
                          {isQuickWin && <span style={{ fontSize: 10, fontWeight: 700, background: "#dcfce7", color: "#166534", borderRadius: 4, padding: "1px 6px" }}>QUICK WIN</span>}
                        </div>
                        {isPriority && <p style={{ fontSize: 11, color: "#991b1b", margin: 0 }}>Utilization gaps directly drive wasted spend.</p>}
                        {isQuickWin && <p style={{ fontSize: 11, color: "#166534", margin: 0 }}>Reserved commitments are the fastest way to cut ANF costs.</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}`, borderRadius: 999, padding: "1px 10px", fontSize: 11, fontWeight: 600 }}>{risk.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{score}/{catMax}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(score / catMax) * 100}%`, background: risk.border, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 16px" }}>Exposure Score Thresholds</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {THRESHOLDS.map((t: Threshold) => {
                const active: boolean = totalScore >= t.lo && totalScore <= t.hi;
                return (
                  <div key={t.lo} style={{ borderRadius: 8, border: `1px solid ${active ? t.border : "#f3f4f6"}`, background: active ? t.bg : "#fafafa", padding: "12px 16px", opacity: active ? 1 : 0.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span>{t.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.label}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>{t.lo}–{t.hi}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#374151", margin: "0 0 6px", lineHeight: 1.6 }}>{t.desc}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: t.color, margin: 0 }}>⏱ {t.remediate}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: "0 0 20px" }}>Your Answers</p>
            {catKeys.map((key: CategoryKey) => {
              const name: string = CATEGORIES[key];
              const catQs: { q: Question; i: number }[] = questions.map((q: Question, i: number) => ({ q, i })).filter(({ q }: { q: Question; i: number }) => q.key === key);
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px", paddingBottom: 6, borderBottom: "1px solid #f3f4f6" }}>{name}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {catQs.map(({ q, i }: { q: Question; i: number }) => {
                      const chosen: Answer = q.answers[answers[i]];
                      const s: number = chosen.s;
                      const sc: string = s === 1 ? "#16a34a" : s === 2 ? "#ca8a04" : s === 3 ? "#ea580c" : "#dc2626";
                      const sb: string = s === 1 ? "#dcfce7" : s === 2 ? "#fef9c3" : s === 3 ? "#ffedd5" : "#fee2e2";
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 3px", fontWeight: 600 }}>Q{i + 1} · <span style={{ background: getBadgeStyle(q.badge).bg, color: getBadgeStyle(q.badge).color, borderRadius: 4, padding: "1px 5px" }}>{q.badge}</span></p>
                            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 4px", lineHeight: 1.5 }}>{q.text}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#111", margin: 0 }}>{chosen.label}</p>
                          </div>
                          <span style={{ background: sb, color: sc, border: `1px solid ${sc}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRestart} style={{ flex: 1, padding: 13, borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", color: "#374151" }}>Retake</button>
            <button onClick={downloadPDF} style={{ flex: 1, padding: 13, borderRadius: 8, border: "none", background: "#0078d4", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#fff" }}>Download PDF</button>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#f9fafb" }}>
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px" }}>Category {catIdx + 1} of {catKeys.length}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 4px" }}>{q.category}</p>
          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, background: badgeStyle.bg, color: badgeStyle.color, borderRadius: 4, padding: "2px 8px", marginBottom: 16 }}>{q.badge}</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Question {currentQ + 1} of {questions.length}</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3, marginBottom: 24, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#0078d4", borderRadius: 3, transition: "width 0.3s ease" }} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: "#111", marginBottom: 20, lineHeight: 1.4 }}>{q.text}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {q.answers.map((answer: Answer, i: number) => (
              <button key={i} onClick={() => setSelected(i)} style={{ padding: "13px 16px", borderRadius: 8, border: selected === i ? "2px solid #0078d4" : "1.5px solid #e5e7eb", background: selected === i ? "#eff6ff" : "#fff", textAlign: "left", fontSize: 14, cursor: "pointer", color: selected === i ? "#0078d4" : "#374151", fontWeight: selected === i ? 500 : 400, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: selected === i ? "#0078d4" : "#9ca3af", background: selected === i ? "#dbeafe" : "#f3f4f6", borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>{i + 1}</span>
                {answer.label}
              </button>
            ))}
          </div>
          <button onClick={handleNext} disabled={selected === null} style={{ width: "100%", padding: 13, borderRadius: 8, border: "none", background: selected === null ? "#e5e7eb" : "#0078d4", color: selected === null ? "#9ca3af" : "#fff", fontSize: 15, fontWeight: 600, cursor: selected === null ? "not-allowed" : "pointer" }}>
            {isLast ? "See my results" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
