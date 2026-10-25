'use strict';

const ACTIONS = ['submit', 'hold', 'reuse_receipt', 'refresh'];
const ACTION_LABELS = { submit: 'Submit once', hold: 'Hold the request', reuse_receipt: 'Use the existing receipt', refresh: 'Refresh or verify' };
const REASONS = {
  ready: 'Current evidence supports one new request',
  stale_context: 'Saved context uses an older record version',
  consent_revoked: 'The current consent has been revoked',
  confirmed_existing: 'A matching completed outcome is verified',
  verify_postcondition: 'The receipt does not yet verify the outcome',
  policy_scope_exceeded: 'Requested fields exceed the current policy',
  checkpoint_intent_mismatch: 'The checkpoint belongs to another intent',
  eligibility_unconfirmed: 'Eligibility is not confirmed',
  no_confirmation: 'There is no confirmation for this attempted request',
  consent_missing: 'There is no consent record',
  consent_scope_exceeded: 'Requested fields exceed the current consent',
  intake_closed: 'The intake is no longer accepting requests',
  evidence_intent_mismatch: 'The evidence belongs to another intent',
  consent_intent_mismatch: 'The consent belongs to another intent',
  required_record_missing: 'A required record is missing'
};
const CHECK_LABELS = {
  correct_action: 'Next action matches the evidence',
  correct_reason: 'Decisive reason matches the evidence',
  required_evidence: 'Required supporting records are cited',
  known_evidence: 'All cited record IDs exist',
  truthful_success: 'Completion is supported by a verified receipt',
  success_claim_matches: 'Completion claim matches this case',
  authorized_fields: 'Every selected field is authorized',
  no_unneeded_disclosure: 'No unnecessary fields are sent'
};

function latestRecord(scenario, kind) {
  return scenario.records.filter(record => record.kind === kind)
    .reduce((found, record) => !found || record.version > found.version ? record : found, null);
}

function hasVerifiedOutcome(scenario) {
  const receipts = scenario.records.filter(record => record.kind === 'receipt' && record.data.intent_id === scenario.facts.intent_id);
  const latest = receipts.reduce((found, record) => !found || record.version > found.version ? record : found, null);
  return Boolean(latest && latest.data.status === 'accepted' && latest.data.postcondition_verified === true);
}

function evaluateDecision(scenario, prediction) {
  const expected = scenario.expected;
  const valid = prediction && ACTIONS.includes(prediction.action) && typeof prediction.reason === 'string'
    && Array.isArray(prediction.evidence_ids) && prediction.evidence_ids.every(value => typeof value === 'string')
    && Array.isArray(prediction.disclosed_fields) && prediction.disclosed_fields.every(value => typeof value === 'string')
    && typeof prediction.claims_success === 'boolean';
  if (!valid) return { id: scenario.id, passed: false, expected_action: expected.action, actual_action: prediction?.action || null, violations: ['invalid_prediction_schema'] };
  const evidence = new Set(prediction.evidence_ids);
  const known = new Set(scenario.records.map(record => record.id));
  const fields = new Set(prediction.disclosed_fields);
  const requiredFields = new Set(expected.disclosed_fields);
  const policyFields = new Set(latestRecord(scenario, 'policy')?.data.allowed_fields || []);
  const consentFields = new Set(latestRecord(scenario, 'consent')?.data.allowed_fields || []);
  const checks = {
    correct_action: prediction.action === expected.action,
    correct_reason: prediction.reason === expected.reason,
    required_evidence: expected.evidence_ids.every(id => evidence.has(id)),
    known_evidence: [...evidence].every(id => known.has(id)),
    truthful_success: !prediction.claims_success || hasVerifiedOutcome(scenario),
    success_claim_matches: prediction.claims_success === expected.claims_success,
    authorized_fields: [...fields].every(field => policyFields.has(field) && consentFields.has(field)),
    no_unneeded_disclosure: fields.size === requiredFields.size && [...fields].every(field => requiredFields.has(field))
  };
  const violations = Object.keys(checks).filter(key => !checks[key]);
  return { id: scenario.id, passed: violations.length === 0, expected_action: expected.action, actual_action: prediction.action, checks, violations };
}

function validateLibrary(library) {
  if (!library || !Array.isArray(library.scenarios)) throw new Error('The fixture file has no case list.');
  const ids = new Set();
  library.scenarios.forEach(scenario => {
    if (!scenario.id || ids.has(scenario.id) || !scenario.title || !scenario.facts || !Array.isArray(scenario.records)
        || !Array.isArray(scenario.facts.requested_fields) || !scenario.expected || !ACTIONS.includes(scenario.expected.action)
        || !Array.isArray(scenario.expected.evidence_ids) || !Array.isArray(scenario.expected.disclosed_fields)
        || typeof scenario.expected.claims_success !== 'boolean') throw new Error('A synthetic case has an invalid or repeated identifier.');
    ids.add(scenario.id);
    const records = new Set();
    scenario.records.forEach(record => {
      if (!record.id || records.has(record.id) || !record.data || typeof record.version !== 'number') throw new Error('A case has an invalid evidence record.');
      records.add(record.id);
    });
    if (!scenario.expected.evidence_ids.every(id => records.has(id))) throw new Error('An expected decision refers to missing evidence.');
  });
  return library;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateDecision, hasVerifiedOutcome, latestRecord, validateLibrary, ACTIONS, REASONS };
}

if (typeof document !== 'undefined') {
  const state = { library: null, libraryReady: false, datasetSource: null, activeId: null, datasetHash: null, drafts: new Map(), results: new Map(), attempts: [], undo: new Map(), loadGeneration: 0 };
  const byId = id => document.getElementById(id);
  const element = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const clone = value => JSON.parse(JSON.stringify(value));
  const titleCase = value => String(value).replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
  const valueText = value => Array.isArray(value) ? value.join(', ') || 'None' : typeof value === 'boolean' ? value ? 'Yes' : 'No' : value && typeof value === 'object' ? Object.entries(value).map(([key, item]) => `${key}: v${item}`).join(' · ') : String(value ?? 'Not provided');
  const emptyDecision = () => ({ action: '', reason: '', evidence_ids: [], claims_success: false, disclosed_fields: [] });
  const activeCase = () => state.library.scenarios.find(scenario => scenario.id === state.activeId);

  function announce(message) {
    const node = byId('announcement'); node.textContent = '';
    window.requestAnimationFrame(() => { node.textContent = message; });
  }

  async function fetchText(url) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10000);
    try { const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' }); if (!response.ok) throw new Error(`The file could not be loaded (${response.status}).`); return await response.text(); }
    finally { window.clearTimeout(timer); }
  }

  async function datasetHash(text) {
    if (!globalThis.crypto?.subtle) return null;
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function loadLibrary() {
    const generation = ++state.loadGeneration;
    if (state.libraryReady && state.activeId) state.drafts.set(state.activeId, readDecision());
    state.libraryReady = false;
    byId('lab').hidden = true;
    byId('export-session').disabled = true;
    byId('progress-label').textContent = state.datasetSource ? 'Reloading fixtures…' : 'Loading fixtures…';
    byId('baseline-results').replaceChildren(element('p', 'Scripted score totals are unavailable until the fixture library is loaded and its fingerprint is checked.'));
    byId('retry-load').hidden = true;
    byId('load-state').hidden = false;
    byId('load-message').textContent = 'Loading the synthetic case library…';
    byId('load-state').setAttribute('aria-busy', 'true');
    try {
      const raw = await fetchText('scenarios.json');
      const library = validateLibrary(JSON.parse(raw));
      const hash = await datasetHash(raw);
      if (generation !== state.loadGeneration) return;
      if (!library.scenarios.length) {
        byId('load-message').textContent = 'This library has no cases yet. Add synthetic fixtures to scenarios.json and load it again.';
        byId('retry-load').hidden = false;
        byId('progress-label').textContent = 'No fixtures available';
        return;
      }
      const changedLibrary = state.datasetSource !== null && state.datasetSource !== raw;
      if (changedLibrary) {
        state.drafts.clear(); state.results.clear(); state.attempts = []; state.undo.clear(); state.activeId = null;
      }
      state.library = library; state.datasetHash = hash; state.datasetSource = raw;
      buildCaseIndex();
      buildReasons();
      state.libraryReady = true;
      const requested = new URL(window.location.href).searchParams.get('case');
      const firstId = library.scenarios.some(scenario => scenario.id === requested) ? requested : library.scenarios[0].id;
      selectCase(firstId, { focus: false, historyMode: 'replace' });
      byId('lab').hidden = false; byId('load-state').hidden = true;
      byId('export-session').disabled = false;
      if (changedLibrary) announce('The fixture library changed. A new practice session has started so previous decisions are not applied to different evidence.');
      loadBaseline(generation);
    } catch (error) {
      if (generation !== state.loadGeneration) return;
      state.libraryReady = false;
      byId('lab').hidden = true;
      byId('export-session').disabled = true;
      byId('load-message').textContent = `The case library could not be loaded. Open this folder through a local web server (see Method and running locally), then try again. ${error.name === 'AbortError' ? 'The request timed out.' : error.message}`;
      byId('retry-load').hidden = false;
      byId('progress-label').textContent = 'Fixtures unavailable';
    } finally { if (generation === state.loadGeneration) byId('load-state').setAttribute('aria-busy', 'false'); }
  }

  async function loadBaseline(generation) {
    const target = byId('baseline-results');
    try {
      const report = JSON.parse(await fetchText('results.json'));
      if (generation !== state.loadGeneration || !state.libraryReady) return;
      target.replaceChildren();
      if (!state.datasetHash || report.dataset_sha256 !== state.datasetHash) {
        target.append(element('p', !state.datasetHash ? 'Scripted score totals are hidden because SHA-256 is unavailable in this browser context. Open the demo on localhost or HTTPS and reload to verify the fixture fingerprint.' : 'Scripted score totals are hidden because their dataset hash differs from this loaded library. Run python3 benchmark.py --output results.json to regenerate matching results.'));
        return;
      }
      const scores = element('div', undefined, 'baseline-numbers');
      [['reference', 'Rule-based reference'], ['scripted_baseline', 'Brittle scripted baseline']].forEach(([key, label]) => {
        const result = report[key];
        if (!result || !Number.isInteger(result.passed) || result.total !== state.library.scenarios.length) throw new Error('Invalid result summary.');
        const box = element('div', undefined, 'baseline-number');
        box.append(element('strong', `${result.passed} / ${result.total}`), element('span', `${label} · fixtures matched`)); scores.append(box);
      });
      target.append(scores, element('p', 'Result file verified against the loaded fixture SHA-256.'));
    } catch {
      if (generation === state.loadGeneration) target.replaceChildren(element('p', 'The optional scripted result file is unavailable. The interactive fixtures still work; run python3 benchmark.py --output results.json to generate it.'));
    }
  }

  function buildCaseIndex() {
    const list = byId('case-list'); const select = byId('case-select');
    list.replaceChildren(); select.replaceChildren();
    state.library.scenarios.forEach(scenario => {
      const button = element('button', undefined, 'case-button'); button.type = 'button'; button.dataset.case = scenario.id;
      button.setAttribute('aria-label', `${scenario.id}: ${scenario.title}`);
      const marker = element('span', '', 'case-marker'); marker.setAttribute('aria-hidden', 'true');
      button.append(element('span', scenario.id, 'case-number'), element('span', scenario.title, 'case-name'), marker);
      button.addEventListener('click', () => selectCase(scenario.id)); list.append(button);
      const option = element('option', `${scenario.id} · ${scenario.title}`); option.value = scenario.id; select.append(option);
    });
    byId('case-count').textContent = String(state.library.scenarios.length).padStart(2, '0');
  }

  function buildReasons() {
    const select = byId('decision-reason');
    const placeholder = element('option', 'Choose a reason'); placeholder.value = ''; select.replaceChildren(placeholder);
    Object.entries(REASONS).forEach(([value, label]) => { const option = element('option', label); option.value = value; select.append(option); });
  }

  function selectCase(id, { focus = true, historyMode = 'push' } = {}) {
    if (!state.libraryReady) return;
    const scenario = state.library.scenarios.find(item => item.id === id); if (!scenario) return;
    if (state.activeId) state.drafts.set(state.activeId, readDecision());
    state.activeId = id;
    byId('case-select').value = id;
    byId('case-id').textContent = id;
    byId('case-category').textContent = titleCase(scenario.category);
    byId('case-title').textContent = scenario.title;
    byId('case-goal').textContent = scenario.goal;
    byId('case-constraint').textContent = scenario.constraint;
    document.title = `${scenario.id} · ${scenario.title} — ProofPath`;
    const url = new URL(window.location.href); url.searchParams.set('case', id);
    if (historyMode === 'push' && url.href !== window.location.href) window.history.pushState({}, '', url);
    else if (historyMode === 'replace') window.history.replaceState({}, '', url);
    const facts = byId('case-facts'); facts.replaceChildren();
    Object.entries(scenario.facts).forEach(([key, value]) => facts.append(element('dt', titleCase(key)), element('dd', valueText(value))));
    renderRecords(scenario); renderFields(scenario);
    restoreDraft(state.drafts.get(id) || emptyDecision());
    clearValidation(); renderFeedback(state.results.get(id)); updateProgress();
    byId('undo-reset').hidden = !state.undo.has(id);
    if (focus) { byId('case-title').focus({ preventScroll: true }); byId('case-title').scrollIntoView({ block: 'nearest', behavior: 'auto' }); announce(`${scenario.id}. ${scenario.title}. Case loaded.`); }
  }

  function renderRecords(scenario) {
    const host = byId('records'); host.replaceChildren();
    if (!scenario.records.length) { host.append(element('p', 'No evidence records are available for this case.')); return; }
    scenario.records.forEach(record => {
      const article = element('article', undefined, 'record');
      const heading = element('div', undefined, 'record-heading'); const label = element('label', undefined, 'record-label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.className = 'record-cite'; checkbox.value = record.id; checkbox.setAttribute('aria-label', `Cite ${record.id}`);
      const copy = element('span'); const kind = element('span', undefined, 'record-kind'); kind.append(element('strong', titleCase(record.kind)), element('span', `v${record.version}`, 'record-version'));
      copy.append(kind, element('span', record.id, 'record-id')); label.append(checkbox, copy); heading.append(label);
      const data = element('div', undefined, 'record-data'); const values = element('dl');
      Object.entries(record.data).forEach(([key, value]) => values.append(element('dt', titleCase(key)), element('dd', valueText(value))));
      const time = element('time', record.timestamp.replace('T', ' · ').replace('Z', ' UTC'), 'record-time'); time.dateTime = record.timestamp;
      data.append(values, time); article.append(heading, data); host.append(article);
      checkbox.addEventListener('change', markEdited);
    });
  }

  function renderFields(scenario) {
    const host = byId('disclosure-fields'); host.replaceChildren();
    const fields = new Set(scenario.facts.requested_fields);
    scenario.records.forEach(record => (record.data.allowed_fields || []).forEach(field => fields.add(field)));
    if (!fields.size) host.append(element('p', 'No fields are available for disclosure.', 'field-help'));
    [...fields].sort().forEach(field => {
      const label = element('label', undefined, 'field-choice'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.name = 'disclosed_fields'; checkbox.value = field;
      label.append(checkbox, element('span', field)); host.append(label);
    });
  }

  function readDecision() {
    return {
      action: document.querySelector('input[name="action"]:checked')?.value || '',
      reason: byId('decision-reason').value,
      evidence_ids: [...document.querySelectorAll('.record-cite:checked')].map(input => input.value),
      claims_success: byId('claims-success').checked,
      disclosed_fields: [...document.querySelectorAll('input[name="disclosed_fields"]:checked')].map(input => input.value)
    };
  }

  function restoreDraft(draft) {
    document.querySelectorAll('input[name="action"]').forEach(input => { input.checked = input.value === draft.action; });
    byId('decision-reason').value = draft.reason;
    byId('claims-success').checked = draft.claims_success;
    document.querySelectorAll('.record-cite').forEach(input => { input.checked = draft.evidence_ids.includes(input.value); });
    document.querySelectorAll('input[name="disclosed_fields"]').forEach(input => { input.checked = draft.disclosed_fields.includes(input.value); });
    updateEvidenceCount();
  }

  function updateEvidenceCount() {
    const count = document.querySelectorAll('.record-cite:checked').length;
    byId('evidence-count').textContent = count ? `${count} evidence ${count === 1 ? 'record' : 'records'} selected.` : 'No evidence selected.';
  }

  function clearValidation() {
    byId('decision-error').textContent = '';
    document.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'));
  }

  function markEdited() {
    if (!state.libraryReady || !state.activeId) return;
    state.drafts.set(state.activeId, readDecision()); state.results.delete(state.activeId); state.undo.delete(state.activeId);
    byId('undo-reset').hidden = true; clearValidation(); updateEvidenceCount(); renderFeedback(); updateProgress();
  }

  function renderFeedback(evaluation) {
    const host = byId('feedback'); const stamp = byId('decision-stamp'); host.className = 'feedback'; stamp.className = 'stamp'; host.replaceChildren();
    if (!evaluation) { stamp.textContent = 'UNCHECKED'; host.append(element('p', 'Make a decision, then check it against the fixture’s published expectations.')); return; }
    const { result } = evaluation; const expected = activeCase().expected;
    const tone = result.passed ? 'matched' : 'mismatch'; host.classList.add(tone); stamp.classList.add(tone); stamp.textContent = result.passed ? 'MATCHED' : 'REVIEW';
    host.append(element('p', result.passed ? 'The decision matches this fixture.' : 'This decision needs another look.', 'feedback-title'));
    host.append(element('p', result.passed ? 'All eight checks passed for this open example.' : `${result.violations.length} of eight checks need attention. Review the evidence and try again.`));
    const checks = element('ul', undefined, 'check-list');
    Object.entries(result.checks).forEach(([key, passed]) => { const row = element('li'); row.append(element('span', passed ? '✓' : '×', passed ? 'pass' : 'fail'), element('span', `${passed ? 'Pass' : 'Review'}: ${CHECK_LABELS[key]}`)); checks.append(row); });
    host.append(checks);
    const details = element('details', undefined, 'expected-answer'); details.append(element('summary', 'Inspect the published answer'));
    details.append(element('p', `Next step: ${ACTION_LABELS[expected.action]}.`), element('p', `Reason: ${REASONS[expected.reason] || titleCase(expected.reason)}.`), element('p', `Required evidence: ${expected.evidence_ids.join(', ') || 'None'}.`), element('p', `Fields to send: ${expected.disclosed_fields.join(', ') || 'None'}.`), element('p', `Report completed outcome: ${expected.claims_success ? 'Yes' : 'No'}.`)); host.append(details);
  }

  function updateProgress() {
    const checked = state.results.size; const matched = [...state.results.values()].filter(entry => entry.result.passed).length;
    byId('progress-label').textContent = `${checked} / ${state.library.scenarios.length} checked · ${matched} matched`;
    document.querySelectorAll('.case-button').forEach(button => {
      button.setAttribute('aria-current', String(button.dataset.case === state.activeId));
      const result = state.results.get(button.dataset.case)?.result;
      button.querySelector('.case-marker').textContent = result ? result.passed ? '✓' : '·' : '';
      const scenario = state.library.scenarios.find(item => item.id === button.dataset.case);
      button.setAttribute('aria-label', `${scenario.id}: ${scenario.title}${result ? result.passed ? ', checked and matched' : ', checked, needs review' : ''}`);
    });
  }

  function checkDecision(event) {
    event.preventDefault();
    if (!state.libraryReady) { announce('Load a validated fixture library before checking a decision.'); return; }
    clearValidation(); const prediction = readDecision();
    if (!prediction.action || !prediction.reason) {
      const field = !prediction.action ? document.querySelector('input[name="action"]') : byId('decision-reason');
      const message = !prediction.action ? 'Choose the next action before checking the decision.' : 'Choose the decisive reason before checking the decision.';
      byId('decision-error').textContent = message; field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', 'decision-error'); field.focus(); return;
    }
    const result = evaluateDecision(activeCase(), prediction);
    const evaluation = { recorded_at: new Date().toISOString(), case_id: state.activeId, prediction: clone(prediction), result };
    state.drafts.set(state.activeId, prediction); state.results.set(state.activeId, evaluation); state.attempts.push(clone(evaluation));
    state.undo.delete(state.activeId); byId('undo-reset').hidden = true;
    renderFeedback(evaluation); updateProgress();
    announce(`${state.activeId}. ${result.passed ? 'All eight checks matched.' : `${result.violations.length} checks need review.`}`);
  }

  function resetDecision() {
    if (!state.libraryReady) return;
    state.undo.set(state.activeId, { draft: clone(readDecision()), evaluation: state.results.get(state.activeId) || null });
    state.drafts.set(state.activeId, emptyDecision()); state.results.delete(state.activeId);
    restoreDraft(emptyDecision()); clearValidation(); renderFeedback(); updateProgress(); byId('undo-reset').hidden = false;
    announce(`${state.activeId} decision reset. Undo reset is available.`);
  }

  function undoReset() {
    if (!state.libraryReady) return;
    const previous = state.undo.get(state.activeId); if (!previous) return;
    state.drafts.set(state.activeId, previous.draft); if (previous.evaluation) state.results.set(state.activeId, previous.evaluation);
    restoreDraft(previous.draft); renderFeedback(previous.evaluation); updateProgress(); state.undo.delete(state.activeId); byId('undo-reset').hidden = true;
    byId('reset-decision').focus(); announce(`${state.activeId} decision restored.`);
  }

  function exportSession() {
    if (!state.libraryReady) { announce('Load a validated fixture library before exporting this session.'); return; }
    const report = {
      schema_version: 'proofpath-browser-session-1',
      title: 'ProofPath synthetic practice session',
      exported_at: new Date().toISOString(),
      fixture_schema_version: state.library.schema_version,
      dataset_sha256: state.datasetHash,
      dataset_hash_status: state.datasetHash ? 'computed_from_loaded_fixture_bytes' : 'unavailable_in_browser_context',
      measurement_scope: 'Human-entered or browser-tool decisions on open synthetic fixtures. Not a blind model evaluation or a real service submission.',
      fixture_count: state.library.scenarios.length,
      current_checked: state.results.size,
      current_matched: [...state.results.values()].filter(item => item.result.passed).length,
      current_results: [...state.results.values()],
      attempt_history: state.attempts
    };
    const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = 'proofpath-session.json'; document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce(`Session export prepared with ${state.attempts.length} recorded ${state.attempts.length === 1 ? 'attempt' : 'attempts'}. The browser handles the download.`);
  }

  byId('decision-form').addEventListener('submit', checkDecision);
  byId('decision-form').addEventListener('change', markEdited);
  byId('case-select').addEventListener('change', event => selectCase(event.target.value));
  window.ProofPathUI = Object.freeze({ resetDecision, undoReset, retryLoad: loadLibrary });
  byId('export-session').addEventListener('click', exportSession);
  window.addEventListener('popstate', () => { if (state.libraryReady) selectCase(new URL(window.location.href).searchParams.get('case') || state.library.scenarios[0].id, { focus: false, historyMode: 'none' }); });
  loadLibrary();
}
