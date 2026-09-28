// Review lenses injected into the prompt. Keys must stay in sync with
// client/src/taxonomy.js.

export const SECTORS = {
  tmt: {
    label: "Tech, media and telecomms",
    guidance: [
      "License counts, subscription tiers, and entitlement claims must match the reference numbers exactly.",
      "Uptime, latency, and availability figures are high risk; verify every number against the reference.",
      "Check content rights, IP ownership, and open-source obligations against the reference only.",
    ],
  },
  pharma_life_sciences: {
    label: "Pharma and life sciences",
    guidance: [
      "GxP, 21 CFR Part 11, computer system validation, and Annex 11 commitments must be explicitly supported.",
      "Validation deliverables (IQ/OQ/PQ), qualification scope, and audit-trail claims are high risk when invented.",
      "Do not accept unsupported statements about regulatory submission timelines or agency interaction.",
    ],
  },
  industrial_products: {
    label: "Industrial products and services",
    guidance: [
      "Plant counts, production lines, aftermarket/service scope, and shift patterns must match the reference.",
      "Quality and safety standards (IATF 16949, ISO 9001, ISO 27001) must not be asserted without support.",
      "Check claims about OT/shop-floor integration and equipment interfaces carefully.",
    ],
  },
  oil_gas_energy: {
    label: "Oil, gas and energy",
    guidance: [
      "Asset counts, site names, outage windows, and capacity figures are high-risk invented details.",
      "HSSE, joint-venture, and production-sharing commitments must trace to the reference.",
      "Emissions, ESG, and sustainability claims require explicit reference support.",
    ],
  },
  retail: {
    label: "Retail",
    guidance: [
      "Store counts, SKU volumes, channel coverage, and peak-season freeze windows must trace to the reference.",
      "Payment card handling (PCI DSS) and loyalty/customer data commitments need explicit support.",
      "Verify promised launch dates against the reference, especially around peak trading periods.",
    ],
  },
  aerospace_defense: {
    label: "Aerospace and defense",
    guidance: [
      "ITAR, EAR, CMMC, and other export-control or program-security claims must match the reference exactly.",
      "Program names, contract vehicles, and classification handling are high risk when invented.",
      "Quality and configuration-management standards (AS9100, configuration baseline) need explicit support.",
    ],
  },
  utilities: {
    label: "Utilities",
    guidance: [
      "Regulatory and reliability standards (NERC CIP, FERC, ISO/RTO rules) must match the reference precisely.",
      "Asset counts, plant/site names, outage windows, and capacity figures are high-risk invented details.",
      "Customer counts, rate-case, and regulated-entity scope must trace to the reference.",
    ],
  },
  consumer_markets: {
    label: "Consumer markets",
    guidance: [
      "Brand, channel, and market-scope claims must match the reference.",
      "Promotions, trade-spend, and volume figures are high risk when invented.",
      "Data-privacy and consumer-protection commitments need explicit support.",
    ],
  },
};

export const CAPABILITIES = {
  digital_supply_chain: {
    label: "Digital supply chain",
    guidance: [
      "Plants, warehouses, storage locations, and material counts must trace to the reference.",
      "Check planning scope (MRP, PP/DS, IBP, EWM) and any inventory or throughput figures.",
      "Verify supplier integration, logistics, and EDI scope claims against the reference only.",
    ],
  },
  procurement: {
    label: "Procurement",
    guidance: [
      "Vendor counts, category scope, sourcing events, and contract volumes must match the reference.",
      "Check P2P process scope, approval limits, and catalog claims carefully.",
      "Do not accept invented savings percentages or supplier-enablement numbers.",
    ],
  },
  customer: {
    label: "Customer",
    guidance: [
      "Sales organisations, channels, pricing procedures, and order types must match the reference.",
      "CRM, commerce, billing, and service-scope claims need explicit support.",
      "Watch for invented customer counts, NPS targets, or order volumes.",
    ],
  },
  hcm: {
    label: "Human capital management",
    guidance: [
      "Employee counts, countries in scope, and payroll entities must match the reference.",
      "Check claims about SuccessFactors/HCM modules, time, benefits, and union rules.",
      "Do not accept invented headcount, go-live waves, or statutory-payroll coverage.",
    ],
  },
  finance: {
    label: "Finance",
    guidance: [
      "Chart of accounts, company codes, ledgers, and currency handling must match the reference.",
      "Period-close timelines, statutory reporting, and tax scope are high risk when invented.",
      "Verify any reference to Central Finance, Group Reporting, or FI/CO submodules against the reference.",
    ],
  },
  technology: {
    label: "Technology",
    guidance: [
      "System landscape, hosting, hyperscaler, Basis, and security/authorization claims must trace to the reference.",
      "Check interface counts, middleware (CPI/PI/BTP), and environment strategy.",
      "Do not accept invented environment counts, integration numbers, or RISE terms.",
    ],
  },
  tmo_integration: {
    label: "TMO integration",
    guidance: [
      "Transformation scope, value targets, and benefit-realisation figures must trace to the reference.",
      "Watch for invented business-case numbers, KPIs, or benefit percentages.",
      "Verify wave sequencing, in-scope entities, and how workstreams integrate with the TMO.",
    ],
  },
  data_analytics: {
    label: "Data and analytics",
    guidance: [
      "Migration object counts, record volumes, report/dashboard counts, and tooling must match the reference.",
      "Check mock-load cycles, reconciliation criteria, KPI definitions, and refresh frequency.",
      "Invented data objects, volumes, or analytics scope are high severity.",
    ],
  },
};

export const IMPLEMENTATIONS = {
  greenfield: {
    label: "Greenfield",
    guidance: [
      "New-build scope, clean-core claims, and 'net new' process design must be supported by the reference.",
      "Watch for leftover brownfield or conversion assumptions that do not belong in a greenfield SoW.",
      "Verify landscape, data-load, and cutover language matches a new implementation, not a conversion.",
    ],
  },
  brownfield: {
    label: "Brownfield",
    guidance: [
      "Conversion, upgrade, and retain-and-adapt claims must match the reference.",
      "Custom-code remediation, SPDD/SPAU, and historical-data retention are high risk when invented.",
      "Do not accept greenfield 'redesign everything' language unless the reference says so.",
    ],
  },
  hybrid: {
    label: "Hybrid",
    guidance: [
      "Which legal entities, processes, or systems are greenfield vs brownfield must match the reference.",
      "Watch for a single approach being applied to the whole programme when the reference splits them.",
      "Verify selective data transition, mix-and-match landscape, and dual-run claims carefully.",
    ],
  },
  phase_0: {
    label: "Phase 0",
    guidance: [
      "Discovery, current-state, and design-only deliverables must not be stated as build or run commitments.",
      "Watch for implementation, cutover, or hypercare dates that a Phase 0 SoW does not include.",
      "Verify workshop counts, assessment scope, and 'no build' language against the reference.",
    ],
  },
  technical_functional_upgrade: {
    label: "Technical / functional upgrade",
    guidance: [
      "Release, enhancement-pack, and version targets must match the reference exactly.",
      "Regression-test scope, downtime, and compatibility claims are high risk when invented.",
      "Do not treat an upgrade SoW as a full transformation unless the reference says so.",
    ],
  },
  sap_expansion_rollout: {
    label: "SAP expansion / rollout",
    guidance: [
      "Countries, company codes, plants, and template-reuse claims must match the reference.",
      "Localisation, legal-entity, and language coverage are high risk when invented.",
      "Verify whether this is a template rollout or a new design; do not blur the two.",
    ],
  },
};

export function buildLensGuidance(sector, capability, implementations) {
  const sections = [];

  const sectorEntry = SECTORS[sector];
  if (sectorEntry) {
    sections.push(
      `SECTOR LENS — ${sectorEntry.label}:\n${bullets(sectorEntry.guidance)}`
    );
  }

  const capabilityEntry = CAPABILITIES[capability];
  if (capabilityEntry) {
    sections.push(
      `CAPABILITY LENS — ${capabilityEntry.label}:\n${bullets(
        capabilityEntry.guidance
      )}`
    );
  }

  const selected = (Array.isArray(implementations) ? implementations : [])
    .map((key) => IMPLEMENTATIONS[key])
    .filter(Boolean);

  for (const entry of selected) {
    sections.push(
      `IMPLEMENTATION LENS — ${entry.label}:\n${bullets(entry.guidance)}`
    );
  }

  if (!sections.length) {
    return "";
  }

  return `\n\nApply these additional review lenses. They tell you where issues are most likely and most costly, but they never override the reference material.\n\n${sections.join(
    "\n\n"
  )}`;
}

function bullets(lines) {
  return lines.map((line) => `- ${line}`).join("\n");
}
