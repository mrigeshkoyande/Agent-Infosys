const roleSignals = {
  manufacturing: ['machine operation', 'quality control', 'maintenance', 'forklift', 'lean safety'],
  retail: ['customer support', 'inventory', 'cash handling', 'conflict resolution', 'scheduling'],
  caregiving: ['patient care', 'documentation', 'empathy', 'medication reminders', 'home safety'],
  food: ['food safety', 'prep workflow', 'sanitation', 'supplier receiving', 'rush-hour coordination'],
  logistics: ['route planning', 'warehouse systems', 'loading', 'dispatch', 'OSHA awareness'],
};

const pathways = [
  { title: 'Certified Medical Assistant', wage: '$21-29/hr', training: '10 week evening bridge', tags: ['caregiving', 'retail'], why: 'High local demand and strong fit for service, documentation, and calm-under-pressure experience.' },
  { title: 'Industrial Maintenance Technician', wage: '$27-38/hr', training: '8 week paid apprenticeship', tags: ['manufacturing', 'logistics'], why: 'Converts hands-on troubleshooting into a credential employers can verify quickly.' },
  { title: 'Supply Chain Coordinator', wage: '$24-34/hr', training: '6 week hybrid certificate', tags: ['logistics', 'retail', 'food'], why: 'Matches inventory, dispatch, vendor, and scheduling skills to resilient operations roles.' },
  { title: 'Food Safety Supervisor', wage: '$23-31/hr', training: '4 week ServSafe + leadership sprint', tags: ['food', 'retail'], why: 'Turns frontline food experience into management-ready compliance evidence.' },
];

const state = {
  selected: ['manufacturing', 'logistics'],
  urgency: 'lost-job',
  notes: 'Laid off after plant closure. Can work evenings, has reliable bus access, and needs childcare-safe schedule.',
};

function icon(name) {
  const icons = { sparkles: '✦', alert: '⚠', brain: '🧠', check: '✓', mic: '🎙', shield: '🛡', upload: '⇧', briefcase: '💼', map: '⌖' };
  return `<span class="icon" aria-hidden="true">${icons[name] || '•'}</span>`;
}

function scorePathway(pathway, selected, urgency) {
  const overlap = pathway.tags.filter((tag) => selected.includes(tag)).length;
  const urgencyBoost = urgency === 'lost-job' ? 12 : urgency === 'at-risk' ? 8 : 4;
  return Math.min(98, 58 + overlap * 15 + urgencyBoost);
}

function rankedPathways() {
  return pathways
    .map((pathway) => ({ ...pathway, score: scorePathway(pathway, state.selected, state.urgency) }))
    .sort((a, b) => b.score - a.score);
}

function transferableSkills() {
  return [...new Set(state.selected.flatMap((key) => roleSignals[key] || []))];
}

function render() {
  document.querySelector('#root').innerHTML = `
    <main>
      <section class="hero">
        <div class="eyebrow">${icon('sparkles')} OpenAI Codex Hackathon · Domain Agents + Evals</div>
        <h1>SkillBridge Agent turns disrupted workers into verified job pathways.</h1>
        <p>A practical agentic workflow for a real-world problem: when factories close, stores downsize, or caregivers leave unpaid work, people need fast translation from lived experience to credible, local opportunities—not another generic job board.</p>
        <div class="hero-actions"><a href="#agent" class="primary">Try the agent</a><a href="#why" class="secondary">Why it can win</a></div>
      </section>

      <section class="problem" id="why">
        <article>${icon('alert')}<h2>Real-world issue</h2><p>Millions of workers have valuable skills that are invisible to hiring systems because they lack the exact credential or resume language.</p></article>
        <article>${icon('brain')}<h2>Agentic solution</h2><p>Codex can orchestrate intake, skill extraction, labor pathway matching, document generation, and evaluation checks as auditable tools.</p></article>
        <article>${icon('check')}<h2>Built-in evals</h2><p>Every recommendation is scored for skill fit, urgency, barrier risk, explainability, and next-step clarity.</p></article>
      </section>

      <section class="workspace" id="agent">
        <div class="panel intake">
          <div class="panel-title">${icon('mic')} Multimodal intake</div>
          <label for="notes">Worker context</label>
          <textarea id="notes">${state.notes}</textarea>
          <label for="urgency">Current situation</label>
          <select id="urgency">
            <option value="lost-job" ${state.urgency === 'lost-job' ? 'selected' : ''}>Recently lost job</option>
            <option value="at-risk" ${state.urgency === 'at-risk' ? 'selected' : ''}>At risk of displacement</option>
            <option value="career-change" ${state.urgency === 'career-change' ? 'selected' : ''}>Seeking better role</option>
          </select>
          <label>Experience signals</label>
          <div class="chips">${Object.keys(roleSignals).map((key) => `<button class="chip ${state.selected.includes(key) ? 'active' : ''}" data-signal="${key}">${key}</button>`).join('')}</div>
          <div class="upload">${icon('upload')} Future input: resume PDF, voice note, layoff letter, credential photo</div>
        </div>

        <div class="panel results">
          <div class="panel-title">${icon('shield')} Agent output</div>
          <div class="skills">${transferableSkills().map((skill) => `<span>${skill}</span>`).join('')}</div>
          ${rankedPathways().slice(0, 3).map((pathway, index) => `
            <article class="card">
              <div><small>Pathway #${index + 1}</small><h3>${pathway.title}</h3><p>${pathway.why}</p><div class="meta">${icon('briefcase')} ${pathway.wage} · ${pathway.training}</div></div>
              <div class="score"><strong>${pathway.score}</strong><span>fit</span></div>
            </article>`).join('')}
        </div>
      </section>

      <section class="roadmap"><h2>Demo story for judges</h2><div class="steps">
        <div>${icon('check')}<b>1. Extract skills</b><p>Codex parses messy human context into transferable skill evidence.</p></div>
        <div>${icon('map')}<b>2. Match locally</b><p>Tools connect to workforce boards, transit time, childcare windows, and training calendars.</p></div>
        <div>${icon('check')}<b>3. Evaluate quality</b><p>Recommendations must pass transparent rubrics before being shown.</p></div>
        <div>${icon('sparkles')}<b>4. Generate artifacts</b><p>The agent drafts resume bullets, training applications, and employer outreach.</p></div>
      </div></section>
    </main>`;

  document.querySelector('#notes').addEventListener('input', (event) => { state.notes = event.target.value; });
  document.querySelector('#urgency').addEventListener('change', (event) => { state.urgency = event.target.value; render(); });
  document.querySelectorAll('[data-signal]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.signal;
    state.selected = state.selected.includes(key) ? state.selected.filter((item) => item !== key) : [...state.selected, key];
    render();
  }));
}

render();
