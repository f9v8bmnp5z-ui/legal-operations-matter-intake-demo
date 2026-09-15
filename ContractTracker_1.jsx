import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard,
  FileStack,
  FilePlus2,
  Settings2,
  Info,
  Search,
  ChevronRight,
  ArrowRight,
  Undo2,
  CheckCircle2,
  XCircle,
  Clock3,
  Building2,
  ScrollText,
} from "lucide-react";

/* ----------------------------------------------------------------------- */
/* Tokens                                                                   */
/* ----------------------------------------------------------------------- */

const COLOR = {
  ink: "#1C2430",
  inkSoft: "#333E4D",
  paper: "#F5F4F1",
  paperRaised: "#FFFFFF",
  line: "#DEDCD3",
  lineSoft: "#EAE8E1",
  slate: "#626B78",
  slateLight: "#8B93A0",
  brass: "#8F6A28",
  brassSoft: "#F1E7D2",
  green: "#3A7D5C",
  greenSoft: "#E4EFE8",
  amber: "#B8842B",
  amberSoft: "#F6ECD9",
  red: "#B2453D",
  redSoft: "#F5E4E2",
  redDark: "#7A2E28",
  blue: "#4D6A8C",
  blueSoft: "#E7ECF1",
  purple: "#6B5B95",
  purpleSoft: "#EAE6F0",
  rust: "#8C5A3C",
  rustSoft: "#EFE3D8",
};

const STATUS_META = {
  Submitted: { color: COLOR.slate, soft: "#EAEBEC", icon: FileStack },
  "Legal Review": { color: COLOR.brass, soft: COLOR.brassSoft, icon: ScrollText },
  "Business Review": { color: COLOR.blue, soft: COLOR.blueSoft, icon: Building2 },
  "Finance Review": { color: COLOR.purple, soft: COLOR.purpleSoft, icon: FileStack },
  "Executive Approval": { color: COLOR.rust, soft: COLOR.rustSoft, icon: Clock3 },
  Approved: { color: COLOR.green, soft: COLOR.greenSoft, icon: CheckCircle2 },
  Rejected: { color: COLOR.red, soft: COLOR.redSoft, icon: XCircle },
  Completed: { color: COLOR.ink, soft: COLOR.lineSoft, icon: CheckCircle2 },
};

const RISK_COLOR = { Low: COLOR.green, Medium: COLOR.amber, High: COLOR.red };
const DEFAULT_STAGES = [
  "Submitted",
  "Legal Review",
  "Business Review",
  "Finance Review",
  "Executive Approval",
  "Approved",
  "Completed",
];

const FIN_REVIEWER = "Renee Castillo — Finance";
const EXEC_REVIEWER = "James Whitfield — Executive Sponsor";

function responsibleFor(stage, c) {
  switch (stage) {
    case "Submitted":
      return c.businessOwner;
    case "Legal Review":
      return c.assignedReviewer;
    case "Business Review":
      return c.businessOwner;
    case "Finance Review":
      return FIN_REVIEWER;
    case "Executive Approval":
      return EXEC_REVIEWER;
    case "Approved":
      return c.legalOwner;
    case "Completed":
      return c.businessOwner;
    default:
      return "—";
  }
}

/* ----------------------------------------------------------------------- */
/* Date helpers                                                             */
/* ----------------------------------------------------------------------- */

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function iso(d) {
  return new Date(d).toISOString().slice(0, 10);
}
function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}
function expirationFlag(dateStr) {
  const d = daysUntil(dateStr);
  if (d < 0) return { key: "expired", label: `Expired ${Math.abs(d)}d ago`, color: COLOR.redDark, soft: COLOR.redSoft };
  if (d < 30) return { key: "red", label: `${d} days`, color: COLOR.red, soft: COLOR.redSoft };
  if (d <= 90) return { key: "yellow", label: `${d} days`, color: COLOR.amber, soft: COLOR.amberSoft };
  return { key: "green", label: `${d} days`, color: COLOR.green, soft: COLOR.greenSoft };
}
function fmtMoney(n) {
  if (n === "" || n === null || n === undefined || isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function reminderDates(expirationStr) {
  if (!expirationStr) return [];
  const exp = new Date(expirationStr + "T00:00:00");
  return [90, 60, 30].map((n) => iso(addDays(exp, -n)));
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ----------------------------------------------------------------------- */
/* Sample data                                                              */
/* ----------------------------------------------------------------------- */

function buildHistory(stagesPath, contract) {
  // stagesPath: array of {stage, daysAgoStart, daysAgoEnd (null if current), comment}
  return stagesPath.map((s) => ({
    id: uid(),
    stage: s.stage,
    responsible: responsibleFor(s.stage, contract),
    dateSubmitted: iso(addDays(new Date(), -s.daysAgoStart)),
    dateCompleted: s.daysAgoEnd === null ? null : iso(addDays(new Date(), -s.daysAgoEnd)),
    comment: s.comment || "",
  }));
}

function seedContracts() {
  const base = [
    {
      contactName: "Priya Anand",
      counterparty: "Solara Photonics Ltd.",
      documentType: "Master Supply Agreement",
      justification: "Primary optical-component supplier for the FY27 laser module line.",
      businessOwner: "Priya Anand",
      legalOwner: "Elena Marsh",
      assignedReviewer: "Elena Marsh",
      contractValue: 1850000,
      effectiveOffset: -20,
      expirationOffset: 620,
      status: "Legal Review",
      riskLevel: "Medium",
      urgency: "Medium",
      notes: "Redlines returned by counterparty; reviewing IP ownership and warranty caps.",
      path: [
        { stage: "Submitted", daysAgoStart: 20, daysAgoEnd: 15 },
        { stage: "Legal Review", daysAgoStart: 15, daysAgoEnd: null, comment: "Reviewing export-control and IP clauses." },
      ],
    },
    {
      contactName: "Marcus Webb",
      counterparty: "Meridian Basin Energy Partners",
      documentType: "Joint Operating Agreement",
      justification: "New joint venture for the Fenwick Basin drilling program.",
      businessOwner: "Marcus Webb",
      legalOwner: "David Okafor",
      assignedReviewer: "David Okafor",
      contractValue: 12500000,
      effectiveOffset: -5,
      expirationOffset: 22,
      status: "Executive Approval",
      riskLevel: "High",
      urgency: "High",
      notes: "High-value JV; executive sign-off required before spud date.",
      path: [
        { stage: "Submitted", daysAgoStart: 30, daysAgoEnd: 26 },
        { stage: "Legal Review", daysAgoStart: 26, daysAgoEnd: 18, comment: "Cleared with revised indemnification language." },
        { stage: "Business Review", daysAgoStart: 18, daysAgoEnd: 10, comment: "Operations confirmed working-interest split." },
        { stage: "Finance Review", daysAgoStart: 10, daysAgoEnd: 3, comment: "Budget approved against FY26 capital plan." },
        { stage: "Executive Approval", daysAgoStart: 3, daysAgoEnd: null },
      ],
    },
    {
      contactName: "Sarah Kim",
      counterparty: "Cascade Medical Devices Inc.",
      documentType: "Distribution Agreement",
      justification: "Expand distribution of the infusion pump line into the Pacific Northwest.",
      businessOwner: "Sarah Kim",
      legalOwner: "Elena Marsh",
      assignedReviewer: "Elena Marsh",
      contractValue: 640000,
      effectiveOffset: -60,
      expirationOffset: 300,
      status: "Business Review",
      riskLevel: "Medium",
      urgency: "Low",
      notes: "Legal cleared; awaiting territory sign-off from regional sales lead.",
      path: [
        { stage: "Submitted", daysAgoStart: 14, daysAgoEnd: 11 },
        { stage: "Legal Review", daysAgoStart: 11, daysAgoEnd: 4, comment: "FDA labeling and liability terms confirmed." },
        { stage: "Business Review", daysAgoStart: 4, daysAgoEnd: null },
      ],
    },
    {
      contactName: "Tom Reyes",
      counterparty: "Arbor Cloud Solutions",
      documentType: "SaaS Subscription Agreement",
      justification: "Contract lifecycle management platform for the legal ops team.",
      businessOwner: "Tom Reyes",
      legalOwner: "David Okafor",
      assignedReviewer: "David Okafor",
      contractValue: 96000,
      effectiveOffset: -3,
      expirationOffset: 362,
      status: "Finance Review",
      riskLevel: "Low",
      urgency: "Low",
      notes: "Standard vendor paper; DPA attached and reviewed.",
      path: [
        { stage: "Submitted", daysAgoStart: 9, daysAgoEnd: 7 },
        { stage: "Legal Review", daysAgoStart: 7, daysAgoEnd: 3, comment: "Data processing addendum negotiated." },
        { stage: "Business Review", daysAgoStart: 3, daysAgoEnd: 1 },
        { stage: "Finance Review", daysAgoStart: 1, daysAgoEnd: null },
      ],
    },
    {
      contactName: "Marcus Webb",
      counterparty: "Ironwood Logistics",
      documentType: "Transportation Services Agreement",
      justification: "Freight and hauling services for the Fenwick Basin site.",
      businessOwner: "Marcus Webb",
      legalOwner: "David Okafor",
      assignedReviewer: "David Okafor",
      contractValue: 410000,
      effectiveOffset: -200,
      expirationOffset: 45,
      status: "Completed",
      riskLevel: "Low",
      urgency: "Medium",
      notes: "Renewal discussion pending with business owner.",
      path: [
        { stage: "Submitted", daysAgoStart: 210, daysAgoEnd: 206 },
        { stage: "Legal Review", daysAgoStart: 206, daysAgoEnd: 199 },
        { stage: "Business Review", daysAgoStart: 199, daysAgoEnd: 194 },
        { stage: "Finance Review", daysAgoStart: 194, daysAgoEnd: 190 },
        { stage: "Executive Approval", daysAgoStart: 190, daysAgoEnd: 186 },
        { stage: "Approved", daysAgoStart: 186, daysAgoEnd: 182 },
        { stage: "Completed", daysAgoStart: 182, daysAgoEnd: 182, comment: "Executed and filed in contract repository." },
      ],
    },
    {
      contactName: "Priya Anand",
      counterparty: "Northgate Insurance Co.",
      documentType: "Corporate Insurance Renewal",
      justification: "Annual renewal of general liability and D&O coverage.",
      businessOwner: "Priya Anand",
      legalOwner: "Elena Marsh",
      assignedReviewer: "Elena Marsh",
      contractValue: 275000,
      effectiveOffset: -350,
      expirationOffset: 12,
      status: "Approved",
      riskLevel: "Medium",
      urgency: "High",
      notes: "Signed; binder expected before expiration. Track closely.",
      path: [
        { stage: "Submitted", daysAgoStart: 40, daysAgoEnd: 36 },
        { stage: "Legal Review", daysAgoStart: 36, daysAgoEnd: 28 },
        { stage: "Business Review", daysAgoStart: 28, daysAgoEnd: 21 },
        { stage: "Finance Review", daysAgoStart: 21, daysAgoEnd: 12 },
        { stage: "Executive Approval", daysAgoStart: 12, daysAgoEnd: 6 },
        { stage: "Approved", daysAgoStart: 6, daysAgoEnd: null, comment: "Awaiting countersignature from carrier." },
      ],
    },
    {
      contactName: "Tom Reyes",
      counterparty: "Beacon Analytics Group",
      documentType: "Mutual NDA",
      justification: "Confidentiality agreement ahead of a potential data-sharing pilot.",
      businessOwner: "Tom Reyes",
      legalOwner: "David Okafor",
      assignedReviewer: "David Okafor",
      contractValue: 0,
      effectiveOffset: 0,
      expirationOffset: 730,
      status: "Submitted",
      riskLevel: "Low",
      urgency: "Low",
      notes: "Standard mutual NDA on our template.",
      path: [{ stage: "Submitted", daysAgoStart: 1, daysAgoEnd: null }],
    },
    {
      contactName: "Sarah Kim",
      counterparty: "Vertex Materials LLC",
      documentType: "Raw Materials Supply Agreement",
      justification: "Specialty crystal substrate supply for laser diode production.",
      businessOwner: "Sarah Kim",
      legalOwner: "Elena Marsh",
      assignedReviewer: "Elena Marsh",
      contractValue: 2300000,
      effectiveOffset: -1,
      expirationOffset: 88,
      status: "Legal Review",
      riskLevel: "High",
      urgency: "High",
      notes: "Reviewing minimum-purchase commitments and force majeure scope.",
      path: [
        { stage: "Submitted", daysAgoStart: 8, daysAgoEnd: 6 },
        { stage: "Legal Review", daysAgoStart: 6, daysAgoEnd: null, comment: "Flagged single-source supply risk for business input." },
      ],
    },
    {
      contactName: "Marcus Webb",
      counterparty: "Harrow & Finch Staffing",
      documentType: "Master Services Agreement",
      justification: "Contract staffing support for the field operations team.",
      businessOwner: "Marcus Webb",
      legalOwner: "David Okafor",
      assignedReviewer: "David Okafor",
      contractValue: 180000,
      effectiveOffset: -15,
      expirationOffset: 350,
      status: "Rejected",
      riskLevel: "Medium",
      urgency: "Low",
      notes: "Rejected pending revised co-employment and indemnity terms.",
      path: [
        { stage: "Submitted", daysAgoStart: 25, daysAgoEnd: 22 },
        { stage: "Legal Review", daysAgoStart: 22, daysAgoEnd: 14, comment: "Co-employment and indemnity terms unacceptable as drafted; returned to business owner." },
      ],
    },
    {
      contactName: "Priya Anand",
      counterparty: "Pinegate Realty Trust",
      documentType: "Office Lease Agreement",
      justification: "Lease renewal for the regional sales office.",
      businessOwner: "Priya Anand",
      legalOwner: "Elena Marsh",
      assignedReviewer: "Elena Marsh",
      contractValue: 540000,
      effectiveOffset: -400,
      expirationOffset: 240,
      status: "Completed",
      riskLevel: "Low",
      urgency: "Low",
      notes: "Fully executed five-year lease.",
      path: [
        { stage: "Submitted", daysAgoStart: 420, daysAgoEnd: 416 },
        { stage: "Legal Review", daysAgoStart: 416, daysAgoEnd: 405 },
        { stage: "Business Review", daysAgoStart: 405, daysAgoEnd: 398 },
        { stage: "Finance Review", daysAgoStart: 398, daysAgoEnd: 390 },
        { stage: "Executive Approval", daysAgoStart: 390, daysAgoEnd: 382 },
        { stage: "Approved", daysAgoStart: 382, daysAgoEnd: 375 },
        { stage: "Completed", daysAgoStart: 375, daysAgoEnd: 375, comment: "Lease executed and recorded." },
      ],
    },
  ];

  return base.map((b) => {
    const id = uid();
    const effectiveDate = iso(addDays(new Date(), b.effectiveOffset));
    const expirationDate = iso(addDays(new Date(), b.expirationOffset));
    const renewalDate = iso(addDays(new Date(b.expirationOffset >= 0 ? expirationDate : effectiveDate), -30 >= b.expirationOffset ? -30 : 0));
    const contractShell = {
      businessOwner: b.businessOwner,
      legalOwner: b.legalOwner,
      assignedReviewer: b.assignedReviewer,
    };
    return {
      id,
      contactName: b.contactName,
      counterparty: b.counterparty,
      documentType: b.documentType,
      justification: b.justification,
      businessOwner: b.businessOwner,
      legalOwner: b.legalOwner,
      assignedReviewer: b.assignedReviewer,
      contractValue: b.contractValue,
      effectiveDate,
      expirationDate,
      renewalDate: iso(addDays(new Date(expirationDate), -30)),
      reminderDates: reminderDates(expirationDate),
      riskLevel: b.riskLevel,
      urgency: b.urgency,
      status: b.status,
      notes: b.notes,
      createdDate: iso(addDays(new Date(), (b.path[0]?.daysAgoStart || 1) )),
      history: buildHistory(b.path, contractShell),
    };
  });
}

/* ----------------------------------------------------------------------- */
/* Small UI atoms                                                           */
/* ----------------------------------------------------------------------- */

function Badge({ label, color, soft }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 3,
        fontSize: 12.5,
        fontWeight: 600,
        color,
        background: soft,
        whiteSpace: "nowrap",
        letterSpacing: 0.1,
      }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Submitted;
  return <Badge label={status} color={m.color} soft={m.soft} />;
}

function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || COLOR.slate;
  return <Badge label={level} color={c} soft={c + "22"} />;
}

function ExpirationBadge({ dateStr }) {
  const f = expirationFlag(dateStr);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: f.color, fontWeight: 600 }}>{f.label}</span>
    </span>
  );
}

function Btn({ children, onClick, variant = "ghost", icon: Icon, style, type = "button", disabled }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontFamily: "Inter, sans-serif",
    fontSize: 13.5,
    fontWeight: 600,
    padding: "9px 16px",
    borderRadius: 4,
    cursor: disabled ? "default" : "pointer",
    border: "1px solid transparent",
    transition: "background 0.15s ease, border-color 0.15s ease",
    opacity: disabled ? 0.45 : 1,
  };
  const variants = {
    primary: { background: COLOR.ink, color: "#fff", borderColor: COLOR.ink },
    brass: { background: COLOR.brass, color: "#fff", borderColor: COLOR.brass },
    ghost: { background: "transparent", color: COLOR.inkSoft, borderColor: COLOR.line },
    danger: { background: "transparent", color: COLOR.red, borderColor: COLOR.red + "55" },
    subtle: { background: COLOR.paper, color: COLOR.inkSoft, borderColor: COLOR.line },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {Icon && <Icon size={15} strokeWidth={2} />}
      {children}
    </button>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined, display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: COLOR.slate, letterSpacing: 0.2 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  padding: "9px 11px",
  borderRadius: 4,
  border: `1px solid ${COLOR.line}`,
  background: "#fff",
  color: COLOR.ink,
  outline: "none",
};

/* ----------------------------------------------------------------------- */
/* Timeline                                                                  */
/* ----------------------------------------------------------------------- */

function Timeline({ contract, allStages }) {
  const items = allStages.map((stage, i) => {
    const hist = contract.history.find((h) => h.stage === stage);
    const isRejectedHere =
      contract.status === "Rejected" &&
      hist &&
      !hist.dateCompleted &&
      i === contract.history.length - 1;
    let state = "pending";
    if (hist && hist.dateCompleted) state = "done";
    else if (hist && !hist.dateCompleted) state = contract.status === "Rejected" ? "rejected" : "active";
    return { stage, hist, state, isRejectedHere };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const dotColor =
          item.state === "done"
            ? COLOR.green
            : item.state === "active"
            ? COLOR.brass
            : item.state === "rejected"
            ? COLOR.red
            : COLOR.line;
        return (
          <div key={item.stage} style={{ display: "flex", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: item.state === "pending" ? "#fff" : dotColor,
                  border: `2px solid ${dotColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: item.state === "pending" ? COLOR.slateLight : "#fff",
                  flexShrink: 0,
                }}
              >
                {item.state === "done" ? "✓" : i + 1}
              </div>
              {!isLast && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 28,
                    background: item.state === "done" ? COLOR.green : COLOR.line,
                    marginTop: 2,
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: 24, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "'Source Serif 4', Georgia, serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: item.state === "pending" ? COLOR.slateLight : COLOR.ink,
                  }}
                >
                  {item.stage}
                </span>
                {item.state === "active" && <Badge label="In progress" color={COLOR.brass} soft={COLOR.brassSoft} />}
                {item.state === "rejected" && <Badge label="Rejected here" color={COLOR.red} soft={COLOR.redSoft} />}
              </div>
              {item.hist ? (
                <div style={{ marginTop: 4, fontSize: 13, color: COLOR.slate, lineHeight: 1.6 }}>
                  <div>
                    Responsible: <strong style={{ color: COLOR.inkSoft }}>{item.hist.responsible}</strong>
                  </div>
                  <div>
                    Submitted {fmtDate(item.hist.dateSubmitted)}
                    {item.hist.dateCompleted ? ` · Completed ${fmtDate(item.hist.dateCompleted)}` : " · Awaiting action"}
                  </div>
                  {item.hist.comment && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "8px 10px",
                        background: COLOR.paper,
                        borderLeft: `2px solid ${COLOR.line}`,
                        borderRadius: 3,
                        color: COLOR.inkSoft,
                        fontStyle: "italic",
                      }}
                    >
                      “{item.hist.comment}”
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 13, color: COLOR.slateLight }}>Not yet reached</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Dashboard                                                                 */
/* ----------------------------------------------------------------------- */

function Dashboard({ contracts, stages, onOpen, onGoNew }) {
  const active = contracts.filter((c) => !["Approved", "Rejected", "Completed"].includes(c.status));
  const awaitingAction = active.length;
  const totalValue = contracts.reduce((s, c) => s + (Number(c.contractValue) || 0), 0);
  const highRisk = contracts.filter((c) => c.riskLevel === "High" && c.status !== "Rejected").length;

  const nonRejected = contracts.filter((c) => c.status !== "Rejected");
  const bucket30 = nonRejected.filter((c) => daysUntil(c.expirationDate) < 30).length;
  const bucket60 = nonRejected.filter((c) => { const d = daysUntil(c.expirationDate); return d >= 30 && d < 60; }).length;
  const bucket90 = nonRejected.filter((c) => { const d = daysUntil(c.expirationDate); return d >= 60 && d <= 90; }).length;

  const byStage = stages.map((s) => ({
    stage: s,
    count: contracts.filter((c) => c.status === s).length,
  }));
  const maxStage = Math.max(1, ...byStage.map((s) => s.count));

  const byRisk = ["High", "Medium", "Low"].map((r) => ({
    risk: r,
    count: contracts.filter((c) => c.riskLevel === r).length,
  }));
  const maxRisk = Math.max(1, ...byRisk.map((r) => r.count));

  const actionQueue = [...active].sort((a, b) => daysUntil(a.expirationDate) - daysUntil(b.expirationDate)).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 27, margin: 0, color: COLOR.ink, fontWeight: 600 }}>
            Legal Operations Dashboard
          </h1>
          <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>
            {awaitingAction} of {contracts.length} contracts currently in an active review stage.
          </p>
        </div>
        <Btn variant="primary" icon={FilePlus2} onClick={onGoNew}>
          New Submission
        </Btn>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KpiCard label="Awaiting action" value={awaitingAction} sub="Across all review stages" accent={COLOR.brass} />
        <KpiCard label="Expiring < 30 days" value={bucket30} sub="Needs renewal attention" accent={COLOR.red} />
        <KpiCard label="High risk, active" value={highRisk} sub="Elevated review priority" accent={COLOR.rust} />
        <KpiCard label="Total portfolio value" value={fmtMoney(totalValue)} sub={`${contracts.length} tracked agreements`} accent={COLOR.ink} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
        {/* Stage funnel */}
        <Panel title="Contracts by stage">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byStage.map((s) => {
              const m = STATUS_META[s.stage];
              return (
                <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 130, fontSize: 13, color: COLOR.inkSoft, fontWeight: 500 }}>{s.stage}</div>
                  <div style={{ flex: 1, background: COLOR.paper, borderRadius: 3, height: 16, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(s.count / maxStage) * 100}%`,
                        background: m.color,
                        height: "100%",
                        borderRadius: 3,
                        minWidth: s.count ? 4 : 0,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div style={{ width: 20, textAlign: "right", fontSize: 13, fontWeight: 700, color: COLOR.ink }}>{s.count}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Risk breakdown */}
        <Panel title="Contracts by risk level">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {byRisk.map((r) => (
              <div key={r.risk}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: COLOR.inkSoft, fontWeight: 600 }}>{r.risk}</span>
                  <span style={{ color: COLOR.slate }}>{r.count}</span>
                </div>
                <div style={{ background: COLOR.paper, borderRadius: 3, height: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(r.count / maxRisk) * 100}%`,
                      background: RISK_COLOR[r.risk],
                      height: "100%",
                      minWidth: r.count ? 4 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <ExpBucket label="Expiring within 30 days" count={bucket30} color={COLOR.red} soft={COLOR.redSoft} />
        <ExpBucket label="Expiring in 30–60 days" count={bucket60} color={COLOR.amber} soft={COLOR.amberSoft} />
        <ExpBucket label="Expiring in 60–90 days" count={bucket90} color={COLOR.amber} soft={COLOR.amberSoft} />
      </div>

      <Panel title="Awaiting your action" subtitle="Active contracts, sorted by soonest expiration">
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Counterparty", "Type", "Stage", "Responsible", "Expiration", "Risk"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actionQueue.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c.id)} style={trStyle}>
                <td style={tdStyle}><strong>{c.counterparty}</strong></td>
                <td style={tdStyle}>{c.documentType}</td>
                <td style={tdStyle}><StatusBadge status={c.status} /></td>
                <td style={tdStyle}>{responsibleFor(c.status, c)}</td>
                <td style={tdStyle}><ExpirationBadge dateStr={c.expirationDate} /></td>
                <td style={tdStyle}><RiskBadge level={c.riskLevel} /></td>
              </tr>
            ))}
            {actionQueue.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={6}>Nothing awaiting action. New submissions will appear here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: COLOR.paperRaised, border: `1px solid ${COLOR.line}`, borderRadius: 5, padding: "16px 18px", borderTop: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: COLOR.slate, letterSpacing: 0.2 }}>{label}</div>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 26, fontWeight: 600, color: COLOR.ink, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: COLOR.slateLight, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function ExpBucket({ label, count, color, soft }) {
  return (
    <div style={{ background: soft, border: `1px solid ${color}33`, borderRadius: 5, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 30, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 13, color: COLOR.inkSoft, fontWeight: 500, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, right }) {
  return (
    <div style={{ background: COLOR.paperRaised, border: `1px solid ${COLOR.line}`, borderRadius: 5, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h3 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16.5, margin: 0, color: COLOR.ink, fontWeight: 600 }}>{title}</h3>
          {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: COLOR.slate }}>{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = { textAlign: "left", fontSize: 11.5, textTransform: "none", color: COLOR.slate, fontWeight: 600, padding: "0 10px 8px", borderBottom: `1px solid ${COLOR.line}` };
const tdStyle = { padding: "11px 10px", fontSize: 13.5, color: COLOR.inkSoft, borderBottom: `1px solid ${COLOR.lineSoft}` };
const trStyle = { cursor: "pointer" };

/* ----------------------------------------------------------------------- */
/* Contract list                                                            */
/* ----------------------------------------------------------------------- */

function ContractList({ contracts, onOpen, stages }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  const filtered = contracts.filter((c) => {
    const q = query.toLowerCase();
    const matchesQ =
      !q ||
      c.counterparty.toLowerCase().includes(q) ||
      c.documentType.toLowerCase().includes(q) ||
      c.businessOwner.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesRisk = riskFilter === "All" || c.riskLevel === riskFilter;
    return matchesQ && matchesStatus && matchesRisk;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 27, margin: 0, color: COLOR.ink, fontWeight: 600 }}>All Contracts</h1>
        <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>{filtered.length} of {contracts.length} agreements</p>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 11, color: COLOR.slateLight }} />
          <input
            style={{ ...inputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box" }}
            placeholder="Search counterparty, type, owner…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select style={inputStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All</option>
          {stages.concat("Rejected").map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={inputStyle} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>

      <Panel title="Contract register">
        <table style={tableStyle}>
          <thead>
            <tr>
              {["Counterparty", "Type", "Business Owner", "Value", "Stage", "Expiration", "Risk"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c.id)} style={trStyle}>
                <td style={tdStyle}><strong>{c.counterparty}</strong></td>
                <td style={tdStyle}>{c.documentType}</td>
                <td style={tdStyle}>{c.businessOwner}</td>
                <td style={tdStyle}>{fmtMoney(c.contractValue)}</td>
                <td style={tdStyle}><StatusBadge status={c.status} /></td>
                <td style={tdStyle}><ExpirationBadge dateStr={c.expirationDate} /></td>
                <td style={tdStyle}><RiskBadge level={c.riskLevel} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td style={tdStyle} colSpan={7}>No contracts match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Detail view                                                              */
/* ----------------------------------------------------------------------- */

function DetailView({ contract, stages, onBack, onAdvance, onReject, onReopen }) {
  const [comment, setComment] = useState("");
  const f = expirationFlag(contract.expirationDate);
  const isTerminal = ["Approved", "Rejected", "Completed"].includes(contract.status);
  const idx = stages.indexOf(contract.status);
  const nextStage = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: COLOR.slate, fontSize: 13, cursor: "pointer", padding: 0 }}>
        <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to contracts
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 25, margin: 0, color: COLOR.ink, fontWeight: 600 }}>{contract.counterparty}</h1>
            <StatusBadge status={contract.status} />
            <RiskBadge level={contract.riskLevel} />
          </div>
          <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>{contract.documentType} · Submitted by {contract.contactName}</p>
        </div>
        <ExpirationBadge dateStr={contract.expirationDate} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Panel title="Contract metadata">
          <MetaGrid contract={contract} />
        </Panel>

        <Panel title="Take action" subtitle={isTerminal ? "This contract has reached a terminal state." : `Currently in ${contract.status}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              placeholder="Add a comment for this stage (optional)…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "Inter, sans-serif" }}
              disabled={isTerminal}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {!isTerminal && nextStage && (
                <Btn variant="primary" icon={ArrowRight} onClick={() => { onAdvance(contract.id, comment); setComment(""); }}>
                  Advance to {nextStage}
                </Btn>
              )}
              {!isTerminal && (
                <Btn variant="danger" icon={XCircle} onClick={() => { onReject(contract.id, comment); setComment(""); }}>
                  Reject
                </Btn>
              )}
              {contract.status === "Rejected" && (
                <Btn variant="subtle" icon={Undo2} onClick={() => onReopen(contract.id)}>
                  Reopen at Submitted
                </Btn>
              )}
            </div>
            <div style={{ fontSize: 12.5, color: COLOR.slateLight, marginTop: 4, lineHeight: 1.6 }}>
              Next responsible party: <strong style={{ color: COLOR.inkSoft }}>{nextStage ? responsibleFor(nextStage, contract) : "—"}</strong>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Approval timeline" subtitle="Each stage, responsible person, and dates">
        <Timeline contract={contract} allStages={stages} />
      </Panel>

      {contract.notes && (
        <Panel title="Notes">
          <p style={{ margin: 0, fontSize: 14, color: COLOR.inkSoft, lineHeight: 1.6 }}>{contract.notes}</p>
        </Panel>
      )}
    </div>
  );
}

function MetaGrid({ contract }) {
  const rows = [
    ["Contact name", contract.contactName],
    ["Counterparty", contract.counterparty],
    ["Document type", contract.documentType],
    ["Business owner", contract.businessOwner],
    ["Legal owner", contract.legalOwner],
    ["Assigned reviewer", contract.assignedReviewer],
    ["Contract value", fmtMoney(contract.contractValue)],
    ["Urgency", contract.urgency],
    ["Effective date", fmtDate(contract.effectiveDate)],
    ["Expiration date", fmtDate(contract.expirationDate)],
    ["Renewal date", fmtDate(contract.renewalDate)],
    ["Reminder dates", contract.reminderDates.map(fmtDate).join(" · ")],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 12, columnGap: 10 }}>
      {rows.map(([label, val]) => (
        <div key={label}>
          <div style={{ fontSize: 11.5, color: COLOR.slate, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 13.5, color: COLOR.ink, marginTop: 2 }}>{val || "—"}</div>
        </div>
      ))}
      {contract.justification && (
        <div style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 11.5, color: COLOR.slate, fontWeight: 600 }}>Justification</div>
          <div style={{ fontSize: 13.5, color: COLOR.ink, marginTop: 2, lineHeight: 1.5 }}>{contract.justification}</div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* New submission form                                                      */
/* ----------------------------------------------------------------------- */

function NewSubmission({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    contactName: "",
    counterparty: "",
    documentType: "",
    justification: "",
    businessOwner: "",
    legalOwner: "",
    assignedReviewer: "",
    contractValue: "",
    effectiveDate: iso(new Date()),
    expirationDate: iso(addDays(new Date(), 365)),
    riskLevel: "Medium",
    urgency: "Medium",
    notes: "",
  });
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (!form.counterparty || !form.documentType || !form.businessOwner || !form.legalOwner) {
      setError("Counterparty, document type, business owner, and legal owner are required.");
      return;
    }
    onSubmit(form);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 27, margin: 0, color: COLOR.ink, fontWeight: 600 }}>New Submission</h1>
        <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>Enters the workflow at <strong>Submitted</strong>. Reminder dates are calculated automatically.</p>
      </div>

      <Panel title="Submission details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Contact name"><input style={inputStyle} value={form.contactName} onChange={set("contactName")} placeholder="e.g. Priya Anand" /></Field>
          <Field label="Counterparty"><input style={inputStyle} value={form.counterparty} onChange={set("counterparty")} placeholder="e.g. Solara Photonics Ltd." /></Field>
          <Field label="Document type"><input style={inputStyle} value={form.documentType} onChange={set("documentType")} placeholder="e.g. Master Supply Agreement" /></Field>
          <Field label="Contract value (USD)"><input style={inputStyle} type="number" value={form.contractValue} onChange={set("contractValue")} placeholder="0" /></Field>
          <Field label="Business owner"><input style={inputStyle} value={form.businessOwner} onChange={set("businessOwner")} /></Field>
          <Field label="Legal owner"><input style={inputStyle} value={form.legalOwner} onChange={set("legalOwner")} /></Field>
          <Field label="Assigned reviewer (Legal)"><input style={inputStyle} value={form.assignedReviewer} onChange={set("assignedReviewer")} /></Field>
          <Field label="Risk level">
            <select style={inputStyle} value={form.riskLevel} onChange={set("riskLevel")}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </Field>
          <Field label="Urgency">
            <select style={inputStyle} value={form.urgency} onChange={set("urgency")}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
          </Field>
          <Field label="Effective date"><input style={inputStyle} type="date" value={form.effectiveDate} onChange={set("effectiveDate")} /></Field>
          <Field label="Expiration date"><input style={inputStyle} type="date" value={form.expirationDate} onChange={set("expirationDate")} /></Field>
          <Field label="Renewal date"><input style={inputStyle} type="date" value={form.renewalDate || iso(addDays(new Date(form.expirationDate), -30))} onChange={set("renewalDate")} /></Field>
          <Field label="Justification" span={2}>
            <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: "Inter, sans-serif" }} value={form.justification} onChange={set("justification")} placeholder="Business reason for this agreement" />
          </Field>
          <Field label="Notes" span={2}>
            <textarea style={{ ...inputStyle, minHeight: 60, fontFamily: "Inter, sans-serif" }} value={form.notes} onChange={set("notes")} />
          </Field>
        </div>

        {error && <div style={{ marginTop: 12, color: COLOR.red, fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Btn variant="primary" icon={FilePlus2} onClick={submit}>Submit for Review</Btn>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Workflow settings / capabilities                                         */
/* ----------------------------------------------------------------------- */

function WorkflowSettings({ workflow, setWorkflow }) {
  const toggle = (i) => {
    setWorkflow((w) => w.map((s, idx) => (idx === i ? { ...s, enabled: !s.enabled } : s)));
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 620 }}>
      <div>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 27, margin: 0, color: COLOR.ink, fontWeight: 600 }}>Workflow Settings</h1>
        <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>
          Turn stages on or off to reconfigure the approval path. Changes apply to future stage advances only — existing contract history is preserved.
        </p>
      </div>
      <Panel title="Approval sequence">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {workflow.map((s, i) => (
            <label
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 4px",
                borderBottom: i < workflow.length - 1 ? `1px solid ${COLOR.lineSoft}` : "none",
                cursor: s.locked ? "default" : "pointer",
                opacity: s.locked ? 0.55 : 1,
              }}
            >
              <input type="checkbox" checked={s.enabled} disabled={s.locked} onChange={() => toggle(i)} />
              <span style={{ width: 22, fontSize: 12.5, color: COLOR.slateLight, fontWeight: 700 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: COLOR.ink, fontWeight: 500, flex: 1 }}>{s.name}</span>
              {s.locked && <span style={{ fontSize: 11.5, color: COLOR.slateLight }}>Always on</span>}
            </label>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Capabilities() {
  const items = [
    {
      title: "Automatic expiration tracking",
      body: "Every contract's days-to-expiration is calculated live and color-flagged — green beyond 90 days, amber at 30–90, red under 30 — with no separate conditional-formatting rules to maintain across spreadsheets.",
    },
    {
      title: "One workflow, one source of truth",
      body: "Intake, review, and approval status live in a single record instead of being split across email threads, a SharePoint list, and an Outlook approval card.",
    },
    {
      title: "Built-in audit trail",
      body: "Every stage automatically records who was responsible, when it opened, when it closed, and any comment left — a complete approval history with no manual logging.",
    },
    {
      title: "Reconfigurable without a flow rebuild",
      body: "Turning a stage on or off updates the live approval path immediately, without redesigning a Power Automate flow or a set of SharePoint list views.",
    },
    {
      title: "Portfolio visibility by default",
      body: "Stage, risk, and expiration roll-ups are always current on the dashboard — no separate Power BI report to build, refresh, or maintain permissions on.",
    },
    {
      title: "Purpose-built for legal review",
      body: "Fields like risk level, urgency, business/legal ownership, and renewal date are first-class parts of every record, not extra list columns bolted onto a generic template.",
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 27, margin: 0, color: COLOR.ink, fontWeight: 600 }}>Why This, Not a Spreadsheet</h1>
        <p style={{ margin: "6px 0 0", color: COLOR.slate, fontSize: 14 }}>
          This demo shows what a purpose-built approval tracker can do that stitching together Outlook, SharePoint lists, and Power Automate typically can't, without the setup overhead.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {items.map((it) => (
          <Panel key={it.title} title={it.title}>
            <p style={{ margin: 0, fontSize: 13.5, color: COLOR.inkSoft, lineHeight: 1.6 }}>{it.body}</p>
          </Panel>
        ))}
      </div>
      <div style={{ fontSize: 12, color: COLOR.slateLight, lineHeight: 1.6 }}>
        All contracts, counterparties, and reviewers in this demo are fictional and created for illustration only.
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* App shell                                                                */
/* ----------------------------------------------------------------------- */

const STORAGE_KEY = "contract-tracker-contracts-v1";
const WORKFLOW_KEY = "contract-tracker-workflow-v1";

export default function App() {
  const [contracts, setContracts] = useState(null);
  const [workflow, setWorkflow] = useState(
    DEFAULT_STAGES.map((s) => ({ name: s, enabled: true, locked: s === "Submitted" || s === "Completed" }))
  );
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await window.storage.get(STORAGE_KEY);
        if (stored && stored.value) {
          setContracts(JSON.parse(stored.value));
        } else {
          const seeded = seedContracts();
          setContracts(seeded);
          await window.storage.set(STORAGE_KEY, JSON.stringify(seeded));
        }
      } catch (e) {
        setContracts(seedContracts());
      }
      try {
        const storedWf = await window.storage.get(WORKFLOW_KEY);
        if (storedWf && storedWf.value) setWorkflow(JSON.parse(storedWf.value));
      } catch (e) {
        /* keep default */
      }
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setContracts(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      /* best effort */
    }
  }, []);

  const persistWorkflow = useCallback((updater) => {
    setWorkflow((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set(WORKFLOW_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const enabledStages = useMemo(() => workflow.filter((s) => s.enabled).map((s) => s.name), [workflow]);

  const openContract = (id) => {
    setSelectedId(id);
    setView("detail");
  };

  const advanceStage = (id, comment) => {
    if (!contracts) return;
    const next = contracts.map((c) => {
      if (c.id !== id) return c;
      const idx = enabledStages.indexOf(c.status);
      const nextStage = idx >= 0 && idx < enabledStages.length - 1 ? enabledStages[idx + 1] : null;
      if (!nextStage) return c;
      const today = iso(new Date());
      const history = c.history.map((h) =>
        h.stage === c.status && !h.dateCompleted ? { ...h, dateCompleted: today, comment: comment || h.comment } : h
      );
      history.push({ id: uid(), stage: nextStage, responsible: responsibleFor(nextStage, c), dateSubmitted: today, dateCompleted: null, comment: "" });
      return { ...c, status: nextStage, history };
    });
    persist(next);
  };

  const rejectContract = (id, comment) => {
    if (!contracts) return;
    const next = contracts.map((c) => {
      if (c.id !== id) return c;
      const today = iso(new Date());
      const history = c.history.map((h) =>
        h.stage === c.status && !h.dateCompleted ? { ...h, dateCompleted: today, comment: comment || h.comment || "Rejected." } : h
      );
      return { ...c, status: "Rejected", history };
    });
    persist(next);
  };

  const reopenContract = (id) => {
    if (!contracts) return;
    const today = iso(new Date());
    const next = contracts.map((c) => {
      if (c.id !== id) return c;
      const history = [
        ...c.history,
        { id: uid(), stage: "Submitted", responsible: responsibleFor("Submitted", c), dateSubmitted: today, dateCompleted: null, comment: "Reopened for resubmission." },
      ];
      return { ...c, status: "Submitted", history };
    });
    persist(next);
  };

  const addSubmission = (form) => {
    const today = iso(new Date());
    const expirationDate = form.expirationDate;
    const c = {
      id: uid(),
      contactName: form.contactName || form.businessOwner,
      counterparty: form.counterparty,
      documentType: form.documentType,
      justification: form.justification,
      businessOwner: form.businessOwner,
      legalOwner: form.legalOwner,
      assignedReviewer: form.assignedReviewer || form.legalOwner,
      contractValue: form.contractValue === "" ? 0 : Number(form.contractValue),
      effectiveDate: form.effectiveDate,
      expirationDate,
      renewalDate: form.renewalDate || iso(addDays(new Date(expirationDate), -30)),
      reminderDates: reminderDates(expirationDate),
      riskLevel: form.riskLevel,
      urgency: form.urgency,
      status: "Submitted",
      notes: form.notes,
      createdDate: today,
      history: [{ id: uid(), stage: "Submitted", responsible: form.businessOwner, dateSubmitted: today, dateCompleted: null, comment: "" }],
    };
    const next = [c, ...(contracts || [])];
    persist(next);
    setSelectedId(c.id);
    setView("detail");
  };

  if (!loaded || !contracts) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: COLOR.slate, fontFamily: "Inter, sans-serif" }}>
        Loading contract register…
      </div>
    );
  }

  const selected = contracts.find((c) => c.id === selectedId);

  const NAV = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "list", label: "All Contracts", icon: FileStack },
    { key: "new", label: "New Submission", icon: FilePlus2 },
    { key: "workflow", label: "Workflow Settings", icon: Settings2 },
    { key: "capabilities", label: "Why This Tool", icon: Info },
  ];

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: COLOR.ink, background: COLOR.paper, minHeight: 600, display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${COLOR.line}` }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: ${COLOR.brass} !important; box-shadow: 0 0 0 2px ${COLOR.brassSoft}; }
        tr:hover td { background: ${COLOR.paper}; }
        table tr { transition: background 0.1s ease; }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 224, background: COLOR.ink, padding: "22px 14px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div style={{ padding: "0 10px 22px" }}>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 17, color: "#fff", fontWeight: 600, lineHeight: 1.25 }}>
            Meridian Legal Ops
          </div>
          <div style={{ fontSize: 11, color: "#8892A0", marginTop: 3, letterSpacing: 0.3 }}>Contract Approval Tracker</div>
        </div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = view === n.key || (view === "detail" && n.key === "list");
          return (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 4,
                border: "none",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                borderLeft: active ? `3px solid ${COLOR.brass}` : "3px solid transparent",
                color: active ? "#fff" : "#AEB6C2",
                fontSize: 13.5,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <Icon size={16} strokeWidth={2} />
              {n.label}
            </button>
          );
        })}
        <div style={{ marginTop: "auto", padding: "14px 10px 0", borderTop: `1px solid rgba(255,255,255,0.1)`, marginTop: 18, fontSize: 11, color: "#7C8494", lineHeight: 1.6 }}>
          Demo data only.<br />All names and companies are fictional.
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "26px 32px", overflow: "auto", background: COLOR.paper }}>
        {view === "dashboard" && (
          <Dashboard contracts={contracts} stages={enabledStages} onOpen={openContract} onGoNew={() => setView("new")} />
        )}
        {view === "list" && <ContractList contracts={contracts} onOpen={openContract} stages={enabledStages} />}
        {view === "detail" && selected && (
          <DetailView
            contract={selected}
            stages={enabledStages}
            onBack={() => setView("list")}
            onAdvance={advanceStage}
            onReject={rejectContract}
            onReopen={reopenContract}
          />
        )}
        {view === "detail" && !selected && (
          <div style={{ color: COLOR.slate }}>Contract not found. <button onClick={() => setView("list")} style={{ color: COLOR.brass, background: "none", border: "none", cursor: "pointer" }}>Back to list</button></div>
        )}
        {view === "new" && <NewSubmission onSubmit={addSubmission} onCancel={() => setView("dashboard")} />}
        {view === "workflow" && <WorkflowSettings workflow={workflow} setWorkflow={persistWorkflow} />}
        {view === "capabilities" && <Capabilities />}
      </div>
    </div>
  );
}
