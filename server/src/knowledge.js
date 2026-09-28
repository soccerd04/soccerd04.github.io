// Review lenses injected into the prompt. Keys must stay in sync with
// client/src/taxonomy.js.

export const SECTORS = {
  financial_services: {
    label: "Financial services",
    guidance: [
      "Regulatory references (Basel, Dodd-Frank, MiFID II, PSD2, FFIEC) must match the reference exactly; a wrong regulation or article number is a high-severity issue.",
      "Watch for unsupported claims about regulator approval, audit sign-off, or model validation.",
      "Data residency, customer data handling, and outsourcing/third-party risk commitments must trace to the reference.",
    ],
  },
  health_industries: {
    label: "Health industries",
    guidance: [
      "HIPAA, PHI handling, and BAA commitments must appear in the reference before the document can assert them.",
      "Claims about patient safety, clinical outcomes, or accreditation (e.g. Joint Commission) need explicit support.",
      "Interoperability standards (HL7, FHIR, X12) and their versions must match the reference.",
    ],
  },
  pharma_life_sciences: {
    label: "Pharmaceuticals and life sciences",
    guidance: [
      "GxP, 21 CFR Part 11, computer system validation, and Annex 11 commitments must be explicitly supported.",
      "Validation deliverables (IQ/OQ/PQ), qualification scope, and audit-trail claims are high risk when invented.",
      "Do not accept unsupported statements about regulatory submission timelines or agency interaction.",
    ],
  },
  tmt: {
    label: "Technology, media and telecom",
    guidance: [
      "License counts, subscription tiers, and entitlement claims must match the reference numbers exactly.",
      "Uptime, latency, and availability figures are high risk; verify every number against the reference.",
      "Check content rights, IP ownership, and open-source obligations against the reference only.",
    ],
  },
  energy_utilities: {
    label: "Energy, utilities and resources",
    guidance: [
      "Regulatory and reliability standards (NERC CIP, FERC, ISO/RTO rules) must match the reference precisely.",
      "Asset counts, plant/site names, outage windows, and capacity figures are high-risk invented details.",
      "Emissions, ESG, and sustainability claims require explicit reference support.",
    ],
  },
  consumer_markets: {
    label: "Consumer markets and retail",
    guidance: [
      "Store counts, SKU volumes, channel coverage, and peak-season freeze windows must trace to the reference.",
      "Payment card handling (PCI DSS) and loyalty/customer data commitments need explicit support.",
      "Verify promised launch dates against the reference, especially around peak trading periods.",
    ],
  },
  industrial_manufacturing: {
    label: "Industrial manufacturing and automotive",
    guidance: [
      "Plant counts, production lines, shift patterns, and cutover blackout windows must match the reference.",
      "Quality and safety standards (IATF 16949, ISO 9001, ISO 27001) must not be asserted without support.",
      "Check claims about OT/shop-floor integration and equipment interfaces carefully.",
    ],
  },
  public_sector: {
    label: "Government and public sector",
    guidance: [
      "Procurement vehicle, contract number, and clause references (FAR/DFARS) must match the reference exactly.",
      "Security authorizations (FedRAMP, StateRAMP, ATO status) are high risk when claimed without support.",
      "Funding sources, appropriation periods, and option years must trace to the reference.",
    ],
  },
};

export const WORKSTREAMS = {
  pmo: {
    label: "PMO",
    guidance: [
      "Governance bodies, meeting cadence, escalation paths, and reporting frequency must match the reference.",
      "Check milestone dates, phase gates, and status-reporting commitments for invented or shifted dates.",
      "Verify assumptions, dependencies, and the change-control process are stated as the reference states them.",
    ],
  },
  tmo: {
    label: "TMO",
    guidance: [
      "Transformation scope, value targets, and benefit-realisation figures must trace to the reference.",
      "Watch for invented business-case numbers, KPIs, or benefit percentages.",
      "Verify the transformation roadmap, wave sequencing, and in-scope entities against the reference.",
    ],
  },
  ocm: {
    label: "Change management (OCM)",
    guidance: [
      "Stakeholder counts, impacted headcount, and communication commitments must match the reference.",
      "Check claims about readiness assessments, adoption metrics, and super-user networks.",
      "Do not accept invented training audiences or enablement volumes.",
    ],
  },
  finance: {
    label: "Finance (FI/CO)",
    guidance: [
      "Chart of accounts scope, company codes, ledgers, and currency handling must match the reference.",
      "Period-close timelines, statutory reporting, and tax scope are high risk when invented.",
      "Verify any reference to Central Finance, Group Reporting, or FI/CO submodules against the reference.",
    ],
  },
  supply_chain: {
    label: "Supply chain (MM/PP/EWM)",
    guidance: [
      "Plants, warehouses, storage locations, and material counts must trace to the reference.",
      "Check planning scope (MRP, PP/DS, IBP) and any inventory or throughput figures.",
      "Verify supplier integration and EDI scope claims against the reference only.",
    ],
  },
  order_to_cash: {
    label: "Order to cash (SD)",
    guidance: [
      "Sales organisations, distribution channels, pricing procedures, and order types must match the reference.",
      "Billing, credit management, and revenue recognition claims need explicit support.",
      "Watch for invented customer counts or order volumes.",
    ],
  },
  data_migration: {
    label: "Data migration",
    guidance: [
      "Object counts, record volumes, legacy source systems, and load cycles must match the reference exactly.",
      "Check the number of mock loads, data-quality thresholds, and reconciliation criteria.",
      "Verify which data objects are in scope; invented objects or volumes are high severity.",
    ],
  },
  technical_basis: {
    label: "Technical and Basis",
    guidance: [
      "System landscape, client strategy, sizing, hosting, and hyperscaler commitments must trace to the reference.",
      "Check release and patch levels, RISE/private-cloud terms, and infrastructure responsibilities.",
      "Do not accept invented environment counts or refresh schedules.",
    ],
  },
  security_grc: {
    label: "Security, authorizations and GRC",
    guidance: [
      "Role counts, authorization design scope, and SoD ruleset claims must match the reference.",
      "GRC module scope (Access Control, Process Control, Risk Management) needs explicit support.",
      "Verify any statement about audit readiness or compliance certification.",
    ],
  },
  integration: {
    label: "Integration",
    guidance: [
      "Interface counts, middleware (CPI/PI/BTP), and protocol choices must match the reference exactly.",
      "Check third-party systems named in the document against the reference list.",
      "Invented interface numbers or integration patterns are high severity.",
    ],
  },
  testing: {
    label: "Testing and QA",
    guidance: [
      "Test phases, cycle counts, script volumes, and defect-severity definitions must trace to the reference.",
      "Check entry and exit criteria, plus any pass-rate or coverage percentage.",
      "Verify who is accountable for UAT and what the acceptance criteria actually are.",
    ],
  },
  cutover_hypercare: {
    label: "Cutover and hypercare",
    guidance: [
      "Cutover windows, downtime duration, freeze periods, and go-live dates must match the reference exactly.",
      "Hypercare duration, staffing, and support coverage hours are high risk when invented.",
      "Verify rollback and contingency commitments against the reference.",
    ],
  },
  training: {
    label: "Training and enablement",
    guidance: [
      "Course counts, learner numbers, delivery modes, and language coverage must match the reference.",
      "Check claims about materials ownership and post-go-live enablement.",
      "Do not accept invented training durations or certification promises.",
    ],
  },
  analytics: {
    label: "Analytics and reporting",
    guidance: [
      "Report and dashboard counts, tooling (SAC, BW/4HANA, Datasphere), and data sources must match the reference.",
      "Check any KPI definitions or refresh-frequency commitments.",
      "Verify claims about embedded analytics scope against the reference.",
    ],
  },
};

export function buildLensGuidance(sector, workstreams) {
  const sections = [];

  const sectorEntry = SECTORS[sector];
  if (sectorEntry) {
    sections.push(
      `SECTOR LENS — ${sectorEntry.label}:\n${bullets(sectorEntry.guidance)}`
    );
  }

  const selected = (Array.isArray(workstreams) ? workstreams : [])
    .map((key) => [key, WORKSTREAMS[key]])
    .filter(([, entry]) => Boolean(entry));

  for (const [, entry] of selected) {
    sections.push(
      `WORKSTREAM LENS — ${entry.label}:\n${bullets(entry.guidance)}`
    );
  }

  if (!sections.length) {
    return "";
  }

  return `\n\nApply these additional review lenses. They tell you where issues are most likely and most costly, but they never override the reference material.\n\n${sections.join(
    "\n\n"
  )}`;
}

export function resolveAreaLabels(sector, workstreams) {
  const labels = (Array.isArray(workstreams) ? workstreams : [])
    .map((key) => WORKSTREAMS[key]?.label)
    .filter(Boolean);

  if (SECTORS[sector]) {
    labels.push(SECTORS[sector].label);
  }

  return labels;
}

function bullets(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}
