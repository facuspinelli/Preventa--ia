/* PREVENTA IA - Núcleo de integración V2
   Fuente única de verdad para oportunidades y contexto actual.
   No depende de servidores ni de IA paga.
*/
(function () {
  "use strict";

  const OPPS = "preventa_opportunities";
  const CURRENT = "preventa_current_opportunity";
  const ANALYSIS = "preventa_document_analysis";

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function normalize(o) {
    if (!o) return null;
    const stage = o.stage || o.status || "new";
    return {
      ...o,
      id: o.id ?? Date.now(),
      client: o.client || o.company || "",
      project: o.project || o.title || "",
      status: stage,
      stage,
      quote: o.quote || null,
      analysis: o.analysis || null,
      finalProposal: o.finalProposal || null,
      createdAt: o.createdAt || new Date().toISOString(),
      updatedAt: o.updatedAt || new Date().toISOString()
    };
  }

  function getOpportunities() {
    const list = read(OPPS, []);
    return Array.isArray(list) ? list.map(normalize) : [];
  }

  function saveOpportunities(list) {
    return write(OPPS, (Array.isArray(list) ? list : []).map(normalize));
  }

  function getOpportunity(id) {
    return getOpportunities().find(o => String(o.id) === String(id)) || null;
  }

  function setCurrentOpportunity(opportunity) {
    if (!opportunity) {
      localStorage.removeItem(CURRENT);
      return null;
    }
    return write(CURRENT, normalize(opportunity));
  }

  function getCurrentOpportunity() {
    return normalize(read(CURRENT, null));
  }

  function upsertOpportunity(data) {
    const list = getOpportunities();
    const incoming = normalize(data);
    const index = list.findIndex(o => String(o.id) === String(incoming.id));

    if (index >= 0) {
      const previous = list[index];
      list[index] = normalize({
        ...previous,
        ...incoming,
        id: previous.id,
        createdAt: previous.createdAt,
        quote: incoming.quote ?? previous.quote ?? null,
        analysis: incoming.analysis ?? previous.analysis ?? null,
        finalProposal: incoming.finalProposal ?? previous.finalProposal ?? null,
        updatedAt: new Date().toISOString()
      });
    } else {
      incoming.createdAt = incoming.createdAt || new Date().toISOString();
      incoming.updatedAt = new Date().toISOString();
      list.unshift(incoming);
    }

    saveOpportunities(list);
    const saved = list.find(o => String(o.id) === String(incoming.id)) || incoming;
    setCurrentOpportunity(saved);
    return saved;
  }

  function updateOpportunity(id, patch) {
    const current = getOpportunity(id);
    if (!current) return null;
    return upsertOpportunity({ ...current, ...patch, id: current.id });
  }

  function attachAnalysis(analysis, opportunityId) {
    if (!analysis) return null;
    write(ANALYSIS, analysis);
    const current = opportunityId ? getOpportunity(opportunityId) : getCurrentOpportunity();
    if (!current) return null;
    return updateOpportunity(current.id, { analysis });
  }

  function attachQuote(quote, opportunityId) {
    const current = opportunityId ? getOpportunity(opportunityId) : getCurrentOpportunity();
    if (!current || !quote) return null;
    return updateOpportunity(current.id, {
      quote,
      product: quote.product || current.product || "",
      productFolderId: quote.productFolderId || current.productFolderId || "",
      solution: quote.product || current.solution || "",
      status: "quote",
      stage: "quote"
    });
  }

  function attachProposal(proposal, opportunityId) {
    const current = opportunityId ? getOpportunity(opportunityId) : getCurrentOpportunity();
    if (!current || !proposal) return null;
    return updateOpportunity(current.id, {
      finalProposal: proposal,
      status: "proposal",
      stage: "proposal"
    });
  }

  function setStatus(id, status, extra) {
    return updateOpportunity(id, {
      ...(extra || {}),
      status,
      stage: status
    });
  }

  function context() {
    const opportunity = getCurrentOpportunity();
    return {
      opportunity,
      analysis: opportunity?.analysis || read(ANALYSIS, null),
      quote: opportunity?.quote || null,
      proposal: opportunity?.finalProposal || null
    };
  }

  window.PreventaCore = {
    keys: { OPPS, CURRENT, ANALYSIS },
    read,
    write,
    getOpportunities,
    saveOpportunities,
    getOpportunity,
    setCurrentOpportunity,
    getCurrentOpportunity,
    upsertOpportunity,
    updateOpportunity,
    attachAnalysis,
    attachQuote,
    attachProposal,
    setStatus,
    context
  };
})();
