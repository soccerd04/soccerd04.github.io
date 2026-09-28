// Keys must stay in sync with server/src/knowledge.js and worker/src/knowledge.js.

export const SECTORS = [
  { value: "tmt", label: "Tech, media and telecomms" },
  { value: "pharma_life_sciences", label: "Pharma and life sciences" },
  { value: "industrial_products", label: "Industrial products and services" },
  { value: "oil_gas_energy", label: "Oil, gas and energy" },
  { value: "retail", label: "Retail" },
  { value: "aerospace_defense", label: "Aerospace and defense" },
  { value: "utilities", label: "Utilities" },
  { value: "consumer_markets", label: "Consumer markets" },
];

export const CAPABILITIES = [
  { value: "digital_supply_chain", label: "Digital supply chain" },
  { value: "procurement", label: "Procurement" },
  { value: "customer", label: "Customer" },
  { value: "hcm", label: "Human capital management" },
  { value: "finance", label: "Finance" },
  { value: "technology", label: "Technology" },
  { value: "tmo_integration", label: "TMO integration" },
  { value: "data_analytics", label: "Data and analytics" },
];

export const IMPLEMENTATIONS = [
  { value: "greenfield", label: "Greenfield" },
  { value: "brownfield", label: "Brownfield" },
  { value: "hybrid", label: "Hybrid" },
  { value: "phase_0", label: "Phase 0" },
  { value: "technical_functional_upgrade", label: "Technical / functional upgrade" },
  { value: "sap_expansion_rollout", label: "SAP expansion / rollout" },
];
