// Keys must stay in sync with server/src/knowledge.js and worker/src/knowledge.js.

export const SECTORS = [
  { value: "financial_services", label: "Financial services" },
  { value: "health_industries", label: "Health industries" },
  { value: "pharma_life_sciences", label: "Pharmaceuticals and life sciences" },
  { value: "tmt", label: "Technology, media and telecom" },
  { value: "energy_utilities", label: "Energy, utilities and resources" },
  { value: "consumer_markets", label: "Consumer markets and retail" },
  {
    value: "industrial_manufacturing",
    label: "Industrial manufacturing and automotive",
  },
  { value: "public_sector", label: "Government and public sector" },
];

export const WORKSTREAMS = [
  { value: "pmo", label: "PMO" },
  { value: "tmo", label: "TMO" },
  { value: "ocm", label: "Change management (OCM)" },
  { value: "finance", label: "Finance (FI/CO)" },
  { value: "supply_chain", label: "Supply chain (MM/PP/EWM)" },
  { value: "order_to_cash", label: "Order to cash (SD)" },
  { value: "data_migration", label: "Data migration" },
  { value: "technical_basis", label: "Technical and Basis" },
  { value: "security_grc", label: "Security, authorizations and GRC" },
  { value: "integration", label: "Integration" },
  { value: "testing", label: "Testing and QA" },
  { value: "cutover_hypercare", label: "Cutover and hypercare" },
  { value: "training", label: "Training and enablement" },
  { value: "analytics", label: "Analytics and reporting" },
];
