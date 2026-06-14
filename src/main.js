/* SkillBridge Agent - Complete SPA Frontend Logic */

const roleSignals = {
  manufacturing: { label: 'Manufacturing', detail: 'Plant, tools, QA', icon: 'factory', tone: 'amber' },
  retail: { label: 'Retail', detail: 'Customers, stock, POS', icon: 'shopping_cart', tone: 'blue' },
  caregiving: { label: 'Caregiving', detail: 'Care, records, safety', icon: 'medical_services', tone: 'rose' },
  food: { label: 'Food service', detail: 'Prep, rush, hygiene', icon: 'restaurant', tone: 'green' },
  logistics: { label: 'Logistics & Supply Chain', detail: 'Routes, loading, dispatch', icon: 'local_shipping', tone: 'violet' },
};

const urgencyLabels = {
  'lost-job': 'Recently lost job',
  'at-risk': 'At risk of displacement',
  'career-change': 'Seeking better role',
};

const roleSignalsSkills = {
  manufacturing: ["Machine operation", "Quality control", "Maintenance", "Forklift", "Lean safety"],
  retail: ["Customer support", "Inventory", "Cash handling", "Conflict resolution", "Scheduling"],
  caregiving: ["Patient care", "Documentation", "Empathy", "Medication reminders", "Home safety"],
  food: ["Food safety", "Prep workflow", "Sanitation", "Supplier receiving", "Rush-hour coordination"],
  logistics: ["Route planning", "Warehouse systems", "Loading", "Dispatch", "OSHA awareness"]
};

const state = {
  token: localStorage.getItem('skillbridge_token'),
  user: JSON.parse(localStorage.getItem('skillbridge_user') || 'null'),
  workerName: 'Maya Patel',
  selected: ['manufacturing', 'logistics'],
  urgency: 'lost-job',
  notes: 'Laid off after plant closure. Can work evenings, has reliable bus access, and needs childcare-safe schedule.',
  analysis: null,
  cases: [],
  loading: false,
  error: '',
  view: 'landing', // 'landing' or 'login' or 'dashboard' or 'cases' or 'profile' or 'about'
  sidebarOpen: false,
};

const root = document.querySelector('#root');

// 3D Background Canvas Initialization (run once)
let threeJSInitialized = false;
function initThreeJSBackground() {
  if (threeJSInitialized) return;
  const container = document.getElementById('global-threejs-container');
  if (!container || !window.THREE) return;

  try {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const colors = [0x176b55, 0x155f8f, 0x6952a3, 0xa86412, 0xa34358];

    // Particles System
    const particlesCount = 800;
    const positions = new Float32Array(particlesCount * 3);
    const particleColors = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 140;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 140;

      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Dynamic node connections
    const nodesCount = 35;
    const nodePositions = [];
    for (let i = 0; i < nodesCount; i++) {
      nodePositions.push(new THREE.Vector3(
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 90,
        (Math.random() - 0.5) * 90
      ));
    }

    const linesMaterial = new THREE.LineBasicMaterial({
      color: 0x155f8f,
      transparent: true,
      opacity: 0.2
    });

    const linesGroup = new THREE.Group();
    scene.add(linesGroup);

    for (let i = 0; i < nodesCount; i++) {
      for (let j = i + 1; j < nodesCount; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 28) {
          const geometry = new THREE.BufferGeometry().setFromPoints([nodePositions[i], nodePositions[j]]);
          const line = new THREE.Line(geometry, linesMaterial);
          linesGroup.add(line);
        }
      }
    }

    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (event) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
    });

    function animate() {
      requestAnimationFrame(animate);

      particlesMesh.rotation.y += 0.0008;
      particlesMesh.rotation.x += 0.0004;
      linesGroup.rotation.y += 0.0005;

      camera.position.x += (mouseX * 8 - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 8 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    animate();
    threeJSInitialized = true;
  } catch (e) {
    console.error("ThreeJS background canvas failed: ", e);
  }
}

function initials(name = 'Counselor') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function saveSession(result) {
  state.token = result.token;
  state.user = result.user;
  localStorage.setItem('skillbridge_token', result.token);
  localStorage.setItem('skillbridge_user', JSON.stringify(result.user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  state.analysis = null;
  state.cases = [];
  localStorage.removeItem('skillbridge_token');
  localStorage.removeItem('skillbridge_user');
}

async function loadCases() {
  if (!state.token) return;
  try {
    const data = await api('/api/cases');
    state.cases = data.cases;
  } catch {
    clearSession();
  }
}

// Gather latest inputs from the DOM and run matching API
async function runAnalysis() {
  state.loading = true;
  state.error = '';
  renderApp();
  try {
    const data = await api('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        workerName: state.workerName,
        notes: state.notes,
        urgency: state.urgency,
        selected: state.selected,
      }),
    });
    state.analysis = data.analysis;
    await loadCases();
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    renderApp();
  }
}

async function demoLogin() {
  state.loading = true;
  state.error = '';
  renderAuth();
  try {
    saveSession(await api('/api/auth/demo', { method: 'POST', body: '{}' }));
    await loadCases();
    state.view = 'dashboard';
    renderApp();
  } catch (error) {
    state.error = error.message;
    state.loading = false;
    renderAuth();
  }
}

async function manualLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.loading = true;
  state.error = '';
  renderAuth();
  try {
    saveSession(await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
      }),
    }));
    await loadCases();
    state.view = 'dashboard';
    renderApp();
  } catch (error) {
    state.error = error.message;
    state.loading = false;
    renderAuth();
  }
}

// Render Public Landing Page
function renderLanding() {
  const loggedIn = !!state.token;
  root.innerHTML = `
    <!-- Top Navigation Bar -->
    <header class="fixed top-0 left-0 right-0 h-20 bg-black/40 border-b border-white/10 backdrop-blur-md z-50 flex items-center justify-between px-8">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-secondary text-3xl filter drop-shadow-[0_0_10px_rgba(137,213,186,0.4)] animate-pulse">psychology</span>
        <span class="font-display-xl text-lg font-bold text-white tracking-wider">SkillBridge AI</span>
      </div>
      <nav class="hidden md:flex items-center gap-8 text-sm text-outline font-medium">
        <a href="#about-section" class="hover:text-primary transition-colors cursor-pointer hover:scale-105">About AI Agents</a>
        <a href="#platform-section" class="hover:text-primary transition-colors cursor-pointer hover:scale-105">Platform Details</a>
      </nav>
      <div>
        <button class="shimmer-btn bg-secondary text-on-secondary px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(137,213,186,0.3)] hover:scale-105 active:scale-95 transition-all" id="go-portal">
          ${loggedIn ? 'Go to Workspace' : 'Access Portal'}
        </button>
      </div>
    </header>

    <!-- Main Container -->
    <main class="pt-32 pb-20 px-6 max-w-[1200px] mx-auto space-y-24 relative z-10">
      <!-- Hero Section -->
      <section class="text-center space-y-6 max-w-3xl mx-auto py-12">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/5 text-secondary text-xs uppercase tracking-widest font-bold breathing-glow">
          <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> Advanced Agent Systems
        </div>
        <h1 class="font-display-xl text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none">
          Unified Workforce Recovery <br/><span class="text-secondary">AI Intelligent Agent</span>
        </h1>
        <p class="font-body-base text-outline text-base md:text-lg max-w-xl mx-auto">
          SkillBridge translates displaced workers' lived experiences into verifiable local career pathways, removing systemic employment barriers with 3D-cinematic analytics.
        </p>
        <div class="pt-6 flex justify-center gap-4">
          <button class="shimmer-btn bg-secondary text-on-secondary px-8 py-4 rounded-xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_10px_25px_rgba(23,107,85,0.3)]" id="hero-cta">
            ${loggedIn ? 'Enter Workspace' : 'Launch Access Portal'}
          </button>
          <a href="#about-section" class="glass border border-white/10 px-8 py-4 rounded-xl font-bold text-sm text-on-surface hover:bg-white/5 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
            Learn More
          </a>
        </div>
      </section>

      <!-- About Agents Section -->
      <section id="about-section" class="space-y-12">
        <div class="text-center space-y-2">
          <h2 class="font-headline-lg text-primary text-2xl md:text-3xl font-bold">Lived Experience AI Agent Suite</h2>
          <p class="text-outline text-sm md:text-base max-w-md mx-auto">Five localized machine intelligence nodes working in harmony to score career transition pathways.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Agent 1 -->
          <div class="glass-card p-8 rounded-2xl border border-white/10 hover:border-secondary/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
            <div class="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl w-fit mb-6">
              <span class="material-symbols-outlined text-2xl">factory</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">Manufacturing Analysis Node</h3>
            <p class="text-outline text-sm leading-relaxed mb-4">
              Decodes manual tools expertise, plant assembly safety protocols, forklift coordination, and quality control procedures.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Machine OP</span>
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Lean QA</span>
            </div>
          </div>

          <!-- Agent 2 -->
          <div class="glass-card p-8 rounded-2xl border border-white/10 hover:border-secondary/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
            <div class="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl w-fit mb-6">
              <span class="material-symbols-outlined text-2xl">shopping_cart</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">Retail Strategy Node</h3>
            <p class="text-outline text-sm leading-relaxed mb-4">
              Processes POS operations, inventory management systems, client relations, and conflict resolution scheduling.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">POS Systems</span>
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Cust. Care</span>
            </div>
          </div>

          <!-- Agent 3 -->
          <div class="glass-card p-8 rounded-2xl border border-white/10 hover:border-secondary/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
            <div class="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl w-fit mb-6">
              <span class="material-symbols-outlined text-2xl">medical_services</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">Caregiving Compliance Node</h3>
            <p class="text-outline text-sm leading-relaxed mb-4">
              Translates home medical safety compliance, medication management, patient vitals logs, and empathetic support.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Clinical Logs</span>
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Safety Regs</span>
            </div>
          </div>

          <!-- Agent 4 -->
          <div class="glass-card p-8 rounded-2xl border border-white/10 hover:border-secondary/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
            <div class="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl w-fit mb-6">
              <span class="material-symbols-outlined text-2xl">restaurant</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">Food Service Management Node</h3>
            <p class="text-outline text-sm leading-relaxed mb-4">
              Extracts ServSafe compliance standards, sanitation protocols, supplier receiving logs, and kitchen coordination workflows.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Sanitation</span>
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Supplier Rec</span>
            </div>
          </div>

          <!-- Agent 5 -->
          <div class="glass-card p-8 rounded-2xl border border-white/10 hover:border-secondary/30 hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group">
            <div class="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-500 rounded-xl w-fit mb-6">
              <span class="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <h3 class="text-lg font-bold text-white mb-2 group-hover:text-secondary transition-colors">Logistics & Supply Node</h3>
            <p class="text-outline text-sm leading-relaxed mb-4">
              Maps warehouse database shipping, route optimization dispatching, cargo loading weight limits, and OSHA awareness.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">Dispatching</span>
              <span class="px-2.5 py-1 rounded-full bg-white/5 text-[10px] text-outline uppercase font-semibold">OSHA Audit</span>
            </div>
          </div>

          <!-- Platform Link Card -->
          <div class="glass-card p-8 rounded-2xl border border-dashed border-white/20 flex flex-col justify-center items-center text-center hover:bg-white/5 hover:border-secondary/40 transition-colors">
            <span class="material-symbols-outlined text-3xl text-secondary animate-bounce mb-3">verified_user</span>
            <h3 class="text-sm font-bold text-white mb-1">Secure Counselor OS</h3>
            <p class="text-outline text-xs max-w-[200px]">Unlock counselor workspace matching and automated audit logs.</p>
          </div>
        </div>
      </section>

      <!-- Platform Features Section -->
      <section id="platform-section" class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div class="space-y-6">
          <h2 class="font-headline-lg text-primary text-3xl md:text-4xl font-bold text-white tracking-tighter leading-tight">
            High Integrity Matching. <br/>Transparent Calculation.
          </h2>
          <p class="text-outline text-sm md:text-base leading-relaxed">
            Every match is calculated using a transparent business logic formula. The Counselor has full visibility over overlaps, confidence margins, and urgency boosts.
          </p>
          <ul class="space-y-3 font-medium text-sm text-outline">
            <li class="flex items-center gap-3 text-white">
              <span class="material-symbols-outlined text-secondary text-lg">check_circle</span>
              <span>SQLite Database session history sync</span>
            </li>
            <li class="flex items-center gap-3 text-white">
              <span class="material-symbols-outlined text-secondary text-lg">check_circle</span>
              <span>Unbuffered local Python Threading Server</span>
            </li>
            <li class="flex items-center gap-3 text-white">
              <span class="material-symbols-outlined text-secondary text-lg">check_circle</span>
              <span>Fully responsive glassmorphism client UI</span>
            </li>
          </ul>
        </div>
        <div class="glass p-8 rounded-2xl border border-white/10 group cursor-pointer hover:border-secondary/20 transition-all">
          <div class="bg-black/60 p-6 rounded-xl font-mono text-[#94ccff] text-xs space-y-4">
            <div class="flex justify-between items-center text-outline font-sans text-[10px] tracking-wider uppercase font-semibold">
              <span>Recommendation Engine Model</span>
              <span class="text-secondary font-bold font-sans">Active</span>
            </div>
            <div class="text-sm text-white">
              Pathway Score = min(98, 58 + (Overlap * 15) + UrgencyBoost)
            </div>
            <div class="text-[11px] text-outline leading-relaxed border-t border-white/5 pt-3">
              - Overlap tags: manufacturing + logistics overlap with maintenance technician.<br/>
              - Urgency boost: lost-job supplies +12, at-risk supplies +8.<br/>
              - Max capping: locks scoring strictly to 98% integrity limits.
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer class="border-t border-white/10 bg-black/80 py-8 text-center text-outline text-xs mt-24">
      <p>© 2026 SkillBridge AI Agent Network. Built using standard library python, SQLite, and vanilla JS.</p>
    </footer>
  `;

  // Bind Actions
  document.querySelector('#go-portal').addEventListener('click', () => {
    state.view = loggedIn ? 'dashboard' : 'login';
    state.sidebarOpen = false;
    if (loggedIn) renderApp(); else renderAuth();
  });
  document.querySelector('#hero-cta').addEventListener('click', () => {
    state.view = loggedIn ? 'dashboard' : 'login';
    state.sidebarOpen = false;
    if (loggedIn) renderApp(); else renderAuth();
  });

  // Soft scroll to hash anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Render Login portal (Apple-craft split design)
function renderAuth() {
  root.innerHTML = `
    <!-- Background glows -->
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#89d5ba] glow-accent rounded-full"></div>
      <div class="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#94ccff] glow-accent rounded-full"></div>
    </div>
    
    <main class="relative min-h-screen flex flex-col md:flex-row z-10">
      <!-- Left Section: Premium cinematic message -->
      <section class="relative w-full md:w-1/2 flex items-center justify-center p-8 min-h-[40vh] md:min-h-screen overflow-hidden">
        <div class="relative z-20 flex flex-col items-center text-center max-w-md">
          <div class="float-anim mb-8 cursor-pointer" id="logo-back">
            <span class="material-symbols-outlined text-[90px] text-secondary filter drop-shadow-[0_0_20px_rgba(137,213,186,0.5)] hover:scale-105 active:scale-95 transition-transform">psychology</span>
          </div>
          <h1 class="font-display-xl text-3xl md:text-5xl font-bold text-on-surface mb-4 tracking-tighter cursor-pointer hover:text-secondary transition-colors" id="title-back">
            SkillBridge Agent
          </h1>
          <p class="font-body-base text-outline max-w-sm">
            Navigating the professional frontier with intelligence, precision, and elite-grade strategy.
          </p>
        </div>
        <canvas class="absolute inset-0 pointer-events-none" id="particleCanvas"></canvas>
      </section>

      <!-- Right Section: Credentials frame -->
      <section class="w-full md:w-1/2 flex items-center justify-center p-8">
        <div class="glass-surface w-full max-w-[460px] p-10 md:p-12 rounded-[2rem] flex flex-col transition-all duration-500 hover:translate-y-[-4px]">
          <div class="mb-10 flex justify-between items-start flex-wrap gap-4">
            <div class="text-left">
              <h2 class="font-headline-lg text-2xl md:text-3xl text-on-surface mb-2 font-bold">Access Portal</h2>
              <p class="font-label-sm text-outline uppercase tracking-[0.2em]">Secure Credentials</p>
            </div>
            <button class="text-xs text-secondary hover:text-white border border-secondary/20 hover:border-secondary px-3 py-1.5 rounded-lg font-bold transition-all hover:scale-105" id="back-home">
              Home
            </button>
          </div>
          
          ${state.error ? `<div class="p-3 mb-6 border border-[#f2b8b5] bg-[#fff0f0]/10 text-[#ffb4ab] rounded-xl font-bold text-sm">${state.error}</div>` : ''}

          <form class="space-y-6" id="login-form">
            <!-- Email -->
            <div class="space-y-2 group">
              <label class="font-label-sm text-on-surface-variant block ml-1" for="email">Work Identity (Email)</label>
              <div class="relative input-focus-glow transition-all duration-300 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary">mail</span>
                <input class="w-full bg-transparent py-4 pl-12 pr-4 text-on-surface placeholder:text-outline-variant border-none focus:ring-0 font-body-base outline-none" 
                       id="email" name="email" type="email" placeholder="demo@skillbridge.local" value="demo@skillbridge.local" autocomplete="email" required />
              </div>
            </div>
            
            <!-- Password -->
            <div class="space-y-2 group">
              <div class="flex justify-between items-center px-1">
                <label class="font-label-sm text-on-surface-variant block" for="password">Access Key</label>
                <a class="font-label-sm text-secondary hover:text-on-secondary-container transition-colors" href="#">Key Recovery</a>
              </div>
              <div class="relative input-focus-glow transition-all duration-300 rounded-xl border border-white/10 bg-black/40 overflow-hidden">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-secondary">lock</span>
                <input class="w-full bg-transparent py-4 pl-12 pr-12 text-on-surface placeholder:text-outline-variant border-none focus:ring-0 font-body-base outline-none" 
                       id="password" name="password" type="password" placeholder="demo-pass" value="demo-pass" autocomplete="current-password" required />
                <button class="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" type="button" id="toggle-password">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </div>

            <!-- Persist checkbox -->
            <div class="flex items-center space-x-3 px-1">
              <input class="w-5 h-5 rounded border-white/20 bg-white/5 text-secondary focus:ring-offset-background focus:ring-secondary cursor-pointer" id="remember" type="checkbox" checked />
              <label class="font-label-sm text-outline cursor-pointer select-none" for="remember">Persist Session State</label>
            </div>

            <!-- Actions -->
            <div class="pt-4 flex flex-col space-y-4">
              <button type="submit" ${state.loading ? 'disabled' : ''} 
                      class="shimmer-btn w-full bg-secondary text-on-secondary py-4 rounded-xl font-title-md hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_rgba(23,107,85,0.2)] font-semibold">
                ${state.loading ? 'Authenticating...' : 'Sign In'}
              </button>
              <button type="button" id="demo-login" ${state.loading ? 'disabled' : ''}
                      class="w-full bg-white/5 border border-white/10 text-on-surface py-4 rounded-xl font-title-md hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-semibold">
                <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">bolt</span>
                Demo Bypass
              </button>
            </div>
          </form>

          <div class="mt-12 pt-8 border-t border-white/5 text-center">
            <p class="font-label-sm text-outline tracking-wider uppercase">
              Empowering the future workforce with AI
            </p>
          </div>
        </div>
      </section>
    </main>
  `;

  // Bind Form Actions
  document.querySelector('#login-form').addEventListener('submit', manualLogin);
  document.querySelector('#demo-login').addEventListener('click', demoLogin);

  // Return navigation
  document.querySelector('#back-home').addEventListener('click', () => {
    state.view = 'landing';
    renderLanding();
  });
  document.querySelector('#logo-back').addEventListener('click', () => {
    state.view = 'landing';
    renderLanding();
  });
  document.querySelector('#title-back').addEventListener('click', () => {
    state.view = 'landing';
    renderLanding();
  });

  // Toggle Password
  const toggleBtn = document.querySelector('#toggle-password');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const passField = document.querySelector('#password');
      if (passField.type === 'password') {
        passField.type = 'text';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">visibility_off</span>';
      } else {
        passField.type = 'password';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span>';
      }
    });
  }

  // Draw particle animations on screen
  initAtmosphericParticles();
}

// Draw in sidebar navigation structure
function renderSideNav() {
  const views = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'cases', label: 'Cases', icon: 'work' },
    { key: 'about', label: 'About Agents', icon: 'psychology' },
    { key: 'profile', label: 'Counselor Profile', icon: 'account_circle' },
  ];

  const linksHtml = views.map(v => {
    const isActive = state.view === v.key;
    return `
      <a class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
        isActive 
          ? 'text-secondary border-r-2 border-secondary font-bold bg-white/10 rounded-r-none' 
          : 'text-outline font-normal hover:text-primary hover:bg-white/10'
      }" data-view="${v.key}">
        <span class="material-symbols-outlined" style="${isActive ? "font-variation-settings: 'FILL' 1;" : ''}">${v.icon}</span>
        <span class="font-Inter text-body-base">${v.label}</span>
      </a>
    `;
  }).join('');

  return `
    <aside id="sidebar-panel" class="glass fixed h-[calc(100vh-2rem)] w-64 left-0 top-0 m-4 rounded-xl flex flex-col gap-unit p-6 z-50 transition-transform duration-300 ${
      state.sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }">
      <!-- Sidebar Close Button for Mobile -->
      <button class="lg:hidden absolute top-4 right-4 text-outline hover:text-white" id="close-sidebar">
        <span class="material-symbols-outlined">close</span>
      </button>

      <div class="mb-8 px-2 cursor-pointer hover:opacity-80 transition-opacity" id="logo-home">
        <h1 class="font-headline-lg text-primary tracking-tighter text-xl md:text-2xl font-bold flex items-center gap-1">
          <span class="material-symbols-outlined text-secondary font-bold text-2xl">psychology</span>
          <span>SkillBridge</span>
        </h1>
        <p class="text-outline font-label-sm mt-1">Elite Career Counselor</p>
      </div>
      <nav class="flex-grow flex flex-col gap-2">
        ${linksHtml}
      </nav>
      <div class="mt-auto pt-6 border-t border-white/10 px-2 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-sm">
          ${initials(state.user?.name)}
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-on-surface font-semibold text-sm truncate max-w-[110px]">${state.user?.name || 'Counselor'}</span>
          <span class="text-outline text-xs uppercase tracking-wider text-[9px] truncate max-w-[110px]">${state.user?.role || 'Lead Agent'}</span>
        </div>
        <button class="ml-auto text-outline hover:text-error transition-colors p-1 hover:scale-110 active:scale-90" id="logout" title="Log out">
          <span class="material-symbols-outlined">logout</span>
        </button>
      </div>
    </aside>
  `;
}

// Draw in Top header bar
function renderHeader() {
  return `
    <header class="glass fixed top-0 right-0 m-4 h-20 z-40 rounded-xl w-[calc(100%-2rem)] lg:w-[calc(100%-18rem)] transition-all duration-300 flex items-center justify-between px-6">
      <div class="flex items-center gap-4 flex-1">
        <!-- Mobile Sidebar Toggle -->
        <button class="lg:hidden text-outline hover:text-primary p-2 focus:outline-none hover:scale-105" id="toggle-sidebar" title="Open Sidebar">
          <span class="material-symbols-outlined">menu</span>
        </button>
        
        <div class="relative w-full max-w-xs md:max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input class="w-full bg-black/40 border border-white/10 rounded-lg pl-10 py-2 focus:ring-1 focus:ring-secondary focus:border-secondary outline-none text-body-base text-sm placeholder-outline" 
                 placeholder="Search cases..." type="text" id="case-search" />
        </div>
      </div>
      
      <div class="flex items-center gap-4 md:gap-6 flex-shrink-0">
        <div class="flex gap-3">
          <button class="material-symbols-outlined text-outline hover:text-primary transition-colors cursor-pointer relative active:scale-90 hover:scale-105" title="Notifications">
            notifications
            <span class="absolute top-0 right-0 w-2 h-2 bg-secondary rounded-full border border-[#050505]"></span>
          </button>
          <button class="material-symbols-outlined text-outline hover:text-primary transition-colors cursor-pointer active:scale-90 hover:scale-105" id="refresh-state" title="Refresh cases">sync</button>
        </div>
        <div class="hidden sm:flex items-center gap-3 pl-6 border-l border-white/10">
          <div class="text-right">
            <p class="text-on-surface font-title-md text-sm font-semibold">${state.user?.name || 'Counselor'}</p>
            <p class="text-outline text-xs text-[10px] tracking-wider uppercase font-semibold">Active Session</p>
          </div>
          <div class="w-10 h-10 rounded-full border border-secondary bg-secondary/15 flex items-center justify-center text-secondary font-bold text-sm">
            ${initials(state.user?.name)}
          </div>
        </div>
      </div>
    </header>
  `;
}

// Redirect rendering based on path state
function renderContent() {
  if (state.view === 'cases') {
    return renderCasesView();
  }
  if (state.view === 'profile') {
    return renderProfileView();
  }
  if (state.view === 'about') {
    return renderAboutView();
  }
  return renderDashboardView();
}

// Dashboard subview HTML
function renderDashboardView() {
  const skillsList = state.analysis?.skills || [];
  
  // Real-time calculation computations
  const baseScore = 58;
  const overlapCount = state.selected.length;
  const urgencyBoostMap = { 'lost-job': 12, 'at-risk': 8, 'career-change': 4 };
  const urgencyBoost = urgencyBoostMap[state.urgency] || 4;
  const liveCalculatedScore = Math.min(98, baseScore + (overlapCount * 15) + urgencyBoost);

  // Live skills list preview
  const liveSkillsPreview = [];
  state.selected.forEach(sig => {
    if (roleSignalsSkills[sig]) {
      roleSignalsSkills[sig].forEach(sk => {
        if (!liveSkillsPreview.includes(sk)) liveSkillsPreview.push(sk);
      });
    }
  });

  return `
    <div class="space-y-6">
      <!-- Welcome Header -->
      <section class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <div>
          <h2 class="font-headline-lg text-primary text-2xl md:text-3xl font-bold">Welcome back, Counselor</h2>
          <p class="text-outline text-sm md:text-base mt-1">Configure worker intake files to automatically score job transition pathways.</p>
        </div>
        <div class="flex gap-3">
          <button class="glass border border-white/10 px-5 py-2.5 rounded-xl text-on-surface hover:bg-white/10 hover:scale-105 active:scale-95 text-xs font-semibold" id="demo-fill">
            Load Sample
          </button>
        </div>
      </section>

      ${state.error ? `<div class="p-3 border border-[#f2b8b5] bg-[#fff0f0]/10 text-[#ffb4ab] rounded-xl font-bold text-sm mb-4">${state.error}</div>` : ''}

      <div class="grid grid-cols-12 gap-gutter items-start">
        <!-- Workforce Intake Panel (Left Column) -->
        <div class="col-span-12 lg:col-span-5 space-y-gutter">
          <div class="glass p-8 rounded-xl relative overflow-hidden group border border-white/10">
            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-15 transition-opacity">
              <span class="material-symbols-outlined text-[80px]">clinical_notes</span>
            </div>
            <h3 class="font-title-md text-secondary mb-6 flex items-center gap-2 font-bold">
              <span class="material-symbols-outlined">person_add</span> Workforce Intake
            </h3>
            
            <form class="space-y-6" onsubmit="return false;" id="intake-form">
              <!-- Name -->
              <div class="space-y-2">
                <label class="font-label-sm text-outline font-semibold uppercase tracking-wider text-[10px]">Worker Name</label>
                <input class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-body-base focus:border-secondary outline-none transition-colors" 
                       placeholder="e.g. Marcus Chen" type="text" id="worker-name" value="${state.workerName}" />
              </div>

              <!-- Urgency -->
              <div class="space-y-2">
                <label class="font-label-sm text-outline font-semibold uppercase tracking-wider text-[10px]">Urgency Level</label>
                <div class="flex gap-2">
                  <button class="flex-1 py-2 rounded-lg border font-medium text-label-sm text-xs transition-all hover:scale-105 ${
                    state.urgency === 'lost-job' 
                      ? 'border-error text-error bg-error/10 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                      : 'border-white/10 text-outline hover:border-error hover:text-error'
                  }" type="button" data-urgency="lost-job">Lost Job</button>
                  <button class="flex-1 py-2 rounded-lg border font-medium text-label-sm text-xs transition-all hover:scale-105 ${
                    state.urgency === 'at-risk' 
                      ? 'border-secondary text-secondary bg-secondary/10 font-bold shadow-[0_0_10px_rgba(137,213,186,0.2)]' 
                      : 'border-white/10 text-outline hover:border-secondary hover:text-secondary'
                  }" type="button" data-urgency="at-risk">At Risk</button>
                  <button class="flex-1 py-2 rounded-lg border font-medium text-label-sm text-xs transition-all hover:scale-105 ${
                    state.urgency === 'career-change' 
                      ? 'border-tertiary text-tertiary bg-tertiary/10 font-bold shadow-[0_0_10px_rgba(148,204,255,0.2)]' 
                      : 'border-white/10 text-outline hover:border-tertiary hover:text-tertiary'
                  }" type="button" data-urgency="career-change">Career Change</button>
                </div>
              </div>

              <!-- Signals Grid -->
              <div class="space-y-2">
                <label class="font-label-sm text-outline font-semibold uppercase tracking-wider text-[10px]">Sector Classification</label>
                <div class="grid grid-cols-2 gap-2" id="signals-grid">
                  ${Object.entries(roleSignals).map(([key, item]) => {
                    const active = state.selected.includes(key);
                    const colSpan = key === 'logistics' ? 'col-span-2' : '';
                    return `
                      <button class="${colSpan} flex items-center gap-2 p-3 rounded-lg text-label-sm border transition-all duration-300 text-left hover:scale-[1.02] ${
                        active 
                          ? 'border-secondary text-secondary bg-secondary/10 font-bold shadow-[0_0_10px_rgba(137,213,186,0.2)]' 
                          : 'border-white/10 text-outline hover:text-primary hover:bg-white/5'
                      }" data-signal="${key}" type="button">
                        <span class="material-symbols-outlined text-[18px]">${item.icon}</span> 
                        <div class="flex flex-col min-w-0">
                          <span class="text-xs truncate">${item.label}</span>
                          <span class="text-[9px] font-normal opacity-60 truncate">${item.detail}</span>
                        </div>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Notes -->
              <div class="space-y-2">
                <label class="font-label-sm text-outline font-semibold uppercase tracking-wider text-[10px]">Counselor Notes</label>
                <textarea class="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-body-base text-sm focus:border-secondary outline-none transition-colors" 
                          placeholder="Observed high aptitude for coordination..." rows="4" id="notes">${state.notes}</textarea>
              </div>

              <!-- Generate Action Button -->
              <button class="w-full py-4 bg-secondary text-on-secondary rounded-xl font-bold tracking-wide hover:brightness-110 hover:scale-[1.02] active:scale-[0.97] transition-all shimmer shimmer-btn flex items-center justify-center gap-2" 
                      id="run-agent" ${state.loading ? 'disabled' : ''}>
                <span class="material-symbols-outlined">${state.loading ? 'sync' : 'psychology'}</span>
                ${state.loading ? 'GENERATING AI ANALYSIS...' : 'GENERATE AI ANALYSIS'}
              </button>
            </form>
          </div>

          <!-- Real-time calculation widget -->
          <div class="glass p-8 rounded-xl border-l-4 border-tertiary">
            <h3 class="font-title-md text-tertiary mb-4 font-bold flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">calculate</span> Real-time Pathway Score
            </h3>
            <div class="bg-black/60 p-6 rounded-lg font-mono text-tertiary-fixed-dim text-xs space-y-2">
              <div class="flex justify-between items-center mb-1 pb-1 border-b border-white/5">
                <span>Score Calculation:</span>
                <span class="text-on-surface font-sans text-[10px] bg-secondary/20 px-2 py-0.5 rounded">LIVE PREVIEW</span>
              </div>
              <div class="text-sm">
                Score = min(98, 58 + (<span class="text-secondary">${overlapCount}</span> overlap * 15) + <span class="text-tertiary">${urgencyBoost}</span> boost)
              </div>
              <div class="text-base font-bold text-on-surface pt-1">
                Calculated Score: <span class="text-secondary">${liveCalculatedScore}</span> fit
              </div>
              <div class="mt-4 pt-4 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p class="text-[9px] text-outline font-sans tracking-wider font-semibold">CONFIDENCE</p>
                  <p class="text-xl font-bold font-sans text-on-surface">${liveCalculatedScore > 85 ? '92%' : '84%'}</p>
                </div>
                <div class="text-right">
                  <p class="text-[9px] text-outline font-sans tracking-wider font-semibold">MATCH RATING</p>
                  <p class="text-xl font-bold text-secondary font-sans">${liveCalculatedScore >= 90 ? 'ELITE' : 'HIGH'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Career Recommendations (Right Column) -->
        <div class="col-span-12 lg:col-span-7 space-y-gutter">
          <!-- Skills tags -->
          <div class="glass p-8 rounded-xl border border-white/10">
            <h3 class="font-title-md text-primary mb-6 font-bold flex items-center gap-2">
              <span class="material-symbols-outlined">vpn_key</span> Extracted Lived Experience Skills
            </h3>
            <div class="flex flex-wrap gap-2">
              ${skillsList.length 
                ? skillsList.map(skill => `<div class="px-4 py-2 rounded-full border border-secondary text-secondary text-xs bg-secondary/5 font-semibold breathing-glow hover:scale-105 cursor-default transition-transform">${skill}</div>`).join('')
                : liveSkillsPreview.map(skill => `<div class="px-4 py-2 rounded-full border border-outline/50 text-outline text-xs bg-white/5 font-medium hover:scale-105 cursor-default transition-transform">${skill}</div>`).join('')
              }
              ${skillsList.length === 0 && liveSkillsPreview.length === 0 ? '<em class="text-outline text-sm">Select experience signals to preview skills.</em>' : ''}
            </div>
          </div>

          <!-- Pathway match recommendations list -->
          <div class="space-y-6">
            <div class="flex justify-between items-end">
              <h3 class="font-headline-lg text-primary text-xl font-bold">Top Recommendations</h3>
              <p class="text-outline font-label-sm pb-1 text-xs uppercase tracking-wider">
                ${state.analysis ? `${state.analysis.pathways.length} MATCHES FOUND` : 'AWAITING ENGINE RUN'}
              </p>
            </div>

            <div class="space-y-4">
              ${state.analysis 
                ? state.analysis.pathways.map((path, index) => {
                    const strokeOffset = 251 - (251 * path.score) / 100;
                    return `
                      <div class="glass-card p-6 rounded-xl flex flex-col md:flex-row items-center gap-6 relative group border border-white/10 hover:scale-[1.01] transition-transform">
                        <!-- Score progress circle (updated matching tracking outline parameters) -->
                        <div class="w-20 h-20 rounded-full border-4 border-secondary/20 flex items-center justify-center relative flex-shrink-0">
                          <span class="text-xl font-bold text-on-surface">${path.score}</span>
                          <svg class="absolute -inset-1 w-22 h-22 -rotate-90">
                            <circle class="text-secondary/20" cx="44" cy="44" fill="transparent" r="40" stroke="currentColor" stroke-width="4"></circle>
                            <circle class="text-secondary" cx="44" cy="44" fill="transparent" r="40" stroke="currentColor" stroke-width="4"
                                    stroke-dasharray="251" stroke-dashoffset="${strokeOffset}"></circle>
                          </svg>
                        </div>
                        
                        <!-- Content -->
                        <div class="flex-grow min-w-0 w-full">
                          <div class="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <h4 class="text-lg font-bold text-white group-hover:text-secondary transition-colors">${path.title}</h4>
                              <p class="text-xs text-outline mt-1 font-semibold uppercase tracking-wider">${path.why}</p>
                            </div>
                            <div class="text-right">
                              <p class="text-secondary font-bold text-lg">${path.wage}</p>
                              <p class="text-[10px] text-outline uppercase tracking-wider font-semibold">Starting Wage</p>
                            </div>
                          </div>
                          
                          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="bg-white/5 p-3 rounded-lg border border-white/5">
                              <p class="text-[9px] text-outline uppercase tracking-widest font-bold">Training Pathway</p>
                              <p class="text-xs mt-1 font-medium">${path.training}</p>
                            </div>
                            <div class="bg-white/5 p-3 rounded-lg border-l-2 border-secondary bg-secondary/5 border-y border-r border-white/5">
                              <p class="text-[9px] text-outline uppercase tracking-widest font-bold">Training Barrier</p>
                              <p class="text-xs mt-1 font-medium">${path.barrier}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')
                : `
                  <div class="glass p-12 rounded-xl text-center flex flex-col items-center justify-center border border-white/10">
                    <span class="material-symbols-outlined text-[64px] text-outline opacity-40 mb-4 animate-pulse">explore</span>
                    <p class="text-outline text-sm">No analysis active. Configure worker details and click the button to generate matching pathways.</p>
                  </div>
                `
              }
            </div>
          </div>

          <!-- Sector Breakdown Chart -->
          <div class="glass p-8 rounded-xl h-64 relative overflow-hidden border border-white/10">
            <h3 class="font-title-md text-primary mb-6 font-bold text-sm uppercase tracking-wider">Historical Case Sector Distribution</h3>
            <div class="flex items-end justify-between h-32 gap-4 px-4">
              <div class="w-full bg-secondary/20 rounded-t-lg relative group h-[70%] hover:h-[80%] transition-all cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-t from-secondary/40 to-transparent"></div>
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">45%</span>
              </div>
              <div class="w-full bg-tertiary/20 rounded-t-lg relative group h-[30%] hover:h-[40%] transition-all cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-t from-tertiary/40 to-transparent"></div>
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">18%</span>
              </div>
              <div class="w-full bg-rose-500/20 rounded-t-lg relative group h-[55%] hover:h-[65%] transition-all cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-t from-rose-500/40 to-transparent"></div>
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">25%</span>
              </div>
              <div class="w-full bg-amber-500/20 rounded-t-lg relative group h-[40%] hover:h-[50%] transition-all cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-t from-amber-500/40 to-transparent"></div>
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">15%</span>
              </div>
            </div>
            <div class="flex justify-between mt-4 text-[9px] text-outline font-bold uppercase tracking-widest">
              <span class="w-full text-center font-semibold">Mfg</span>
              <span class="w-full text-center font-semibold">Retail</span>
              <span class="w-full text-center font-semibold">Care</span>
              <span class="w-full text-center font-semibold">Food</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Cases view HTML
function renderCasesView() {
  const cases = state.cases;

  return `
    <div class="space-y-6">
      <!-- Header -->
      <section class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4">
        <div>
          <h2 class="font-headline-lg text-primary text-2xl md:text-3xl font-bold">Case History & Performance</h2>
          <p class="text-outline text-sm md:text-base mt-1">Timeline logs of historical counselor-assisted career transitions.</p>
        </div>
        <div class="flex gap-3">
          <button class="shimmer-btn bg-secondary text-on-secondary px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(137,213,186,0.4)] hover:scale-105 transition-all active:scale-95 text-xs font-bold" id="export-reports">
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>Export Reports</span>
          </button>
        </div>
      </section>

      <!-- Metric Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div class="glass-card p-6 rounded-2xl relative overflow-hidden group border border-white/10">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-secondary/10 rounded-xl text-secondary">
              <span class="material-symbols-outlined">bolt</span>
            </div>
            <span class="text-secondary text-sm font-medium">+14% vs LW</span>
          </div>
          <div class="flex flex-col">
            <span class="text-outline text-xs font-semibold uppercase tracking-widest mb-1">Total Saved Cases</span>
            <span class="text-4xl font-bold text-on-surface">${cases.length}</span>
          </div>
          <div class="absolute bottom-0 left-0 w-full h-1 bg-secondary/20">
            <div class="h-full bg-secondary" style="width: ${Math.min(100, cases.length * 5)}%"></div>
          </div>
        </div>

        <div class="glass-card p-6 rounded-2xl relative overflow-hidden group border border-white/10">
          <div class="flex justify-between items-start mb-4">
            <div class="p-3 bg-tertiary/10 rounded-xl text-tertiary">
              <span class="material-symbols-outlined">groups</span>
            </div>
            <span class="text-tertiary text-sm font-medium">92% Match</span>
          </div>
          <div class="flex flex-col">
            <span class="text-outline text-xs font-semibold uppercase tracking-widest mb-1">Avg. Match Score</span>
            <span class="text-4xl font-bold text-on-surface">88.4</span>
          </div>
          <div class="absolute bottom-0 left-0 w-full h-1 bg-tertiary/20">
            <div class="h-full bg-tertiary w-[88%]"></div>
          </div>
        </div>

        <div class="glass-card p-6 rounded-2xl flex items-center justify-between bg-gradient-to-br from-white/5 to-transparent border border-white/10">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
              <span class="material-symbols-outlined">psychology</span>
            </div>
            <div>
              <p class="text-on-surface font-semibold text-sm">System Database</p>
              <p class="text-outline text-xs">SQLite Live Synced</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Trend row charts -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div class="lg:col-span-2 glass-card p-8 rounded-2xl flex flex-col min-h-[360px] border border-white/10">
          <div class="flex justify-between items-center mb-8">
            <div>
              <h3 class="text-title-md font-title-md text-on-surface font-bold">Counselor Activity Trend</h3>
              <p class="text-outline text-xs mt-1">Throughput performance over last 30 days</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-outline font-bold">Weekly</span>
          </div>
          
          <div class="flex-grow flex items-end gap-2 relative">
            <div class="absolute inset-0 flex items-end opacity-20">
              <svg class="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M0,80 Q20,30 40,65 T100,20 V100 H0 Z" fill="url(#trendGrad)"></path>
                <defs>
                  <linearGradient id="trendGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" style="stop-color:rgba(137, 213, 186, 0.8);stop-opacity:1"></stop>
                    <stop offset="100%" style="stop-color:rgba(137, 213, 186, 0);stop-opacity:0"></stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            <div class="w-full flex items-end justify-between px-4 h-40 border-b border-white/10 relative z-10">
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[45%]"></div>
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[60%]"></div>
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[35%]"></div>
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[80%]"></div>
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[65%]"></div>
              <div class="w-8 bg-secondary/30 rounded-t-lg transition-all hover:bg-secondary h-[95%]"></div>
            </div>
          </div>
          <div class="flex justify-between mt-4 text-[10px] text-outline uppercase tracking-wider font-semibold px-4">
            <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span><span>Week 5</span><span>Week 6</span>
          </div>
        </div>

        <div class="glass-card p-8 rounded-2xl flex flex-col border border-white/10">
          <h3 class="text-title-md font-title-md text-on-surface mb-6 font-bold text-sm uppercase tracking-wider">Top Pathways Matches</h3>
          <div class="flex flex-col gap-6 flex-grow justify-center">
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-on-surface">Industrial Maintenance Tech</span>
                <span class="text-outline">42% match rate</span>
              </div>
              <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-secondary w-[85%] shadow-[0_0_10px_rgba(137,213,186,0.4)]"></div>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-on-surface">Supply Chain Coordinator</span>
                <span class="text-outline">28% match rate</span>
              </div>
              <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-tertiary w-[65%] shadow-[0_0_10px_rgba(148,204,255,0.4)]"></div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-on-surface">Certified Medical Assistant</span>
                <span class="text-outline">18% match rate</span>
              </div>
              <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-secondary w-[45%] shadow-[0_0_10px_rgba(137,213,186,0.3)]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Master Case Table -->
      <div class="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div class="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 class="text-title-md font-title-md text-on-surface font-bold">Case History Table</h3>
            <p class="text-outline text-xs mt-1">Master database records of generated recovery profiles</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-white/5 text-[10px] text-outline uppercase tracking-wider font-bold">
                <th class="px-8 py-4">Worker Name</th>
                <th class="px-8 py-4">Date Applied</th>
                <th class="px-8 py-4">Situation Urgency</th>
                <th class="px-8 py-4">Matched Path</th>
                <th class="px-8 py-4">Max Score</th>
                <th class="px-8 py-4">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5">
              ${cases.length ? cases.map(c => {
                const dateStr = new Date(c.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
                const topPath = c.analysis?.pathways?.[0];
                const topScore = topPath?.score || 0;
                
                let urgencyClass = 'text-tertiary bg-tertiary-container/20 border-tertiary/30';
                if (c.urgency === 'lost-job') urgencyClass = 'text-error bg-error/15 border-error/30';
                if (c.urgency === 'at-risk') urgencyClass = 'text-secondary bg-secondary/15 border-secondary/30';

                return `
                  <tr class="hover:bg-white/5 transition-colors group">
                    <td class="px-8 py-6">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-bold text-xs">
                          ${initials(c.worker_name)}
                        </div>
                        <span class="text-on-surface font-semibold text-sm">${c.worker_name}</span>
                      </div>
                    </td>
                    <td class="px-8 py-6 text-outline text-xs font-mono">${dateStr}</td>
                    <td class="px-8 py-6">
                      <span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border ${urgencyClass} uppercase">
                        ${c.urgency === 'lost-job' ? '<span class="w-1.5 h-1.5 rounded-full bg-error glow-pulse"></span>' : ''}
                        ${urgencyLabels[c.urgency] || c.urgency}
                      </span>
                    </td>
                    <td class="px-8 py-6 text-on-surface text-xs font-semibold">${topPath ? topPath.title : 'None matched'}</td>
                    <td class="px-8 py-6">
                      <div class="flex items-center gap-2">
                        <span class="text-secondary font-bold text-xs">${topScore}%</span>
                        <div class="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div class="h-full bg-secondary" style="width: ${topScore}%"></div>
                        </div>
                      </div>
                    </td>
                    <td class="px-8 py-6">
                      <button class="text-secondary hover:text-white border border-secondary/30 hover:border-secondary px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95" 
                              data-load-case="${c.id}">
                        Reload Profile
                      </button>
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="6" class="px-8 py-12 text-center text-outline text-sm">
                    No cases recorded yet. Return to the dashboard to process your first intake.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Counselor profile subview HTML
function renderProfileView() {
  const cases = state.cases;
  const avgScore = cases.length 
    ? Math.round(cases.reduce((sum, c) => sum + (c.analysis?.summary?.top_fit || 0), 0) / cases.length)
    : 0;

  return `
    <div class="space-y-6">
      <!-- Profile Header -->
      <section class="pb-4">
        <h2 class="font-headline-lg text-primary text-2xl md:text-3xl font-bold">Counselor Profile</h2>
        <p class="text-outline text-sm md:text-base mt-1">Verified status logs and workspace performance telemetry.</p>
      </section>

      <div class="grid grid-cols-12 gap-gutter items-start">
        <!-- Details Card -->
        <div class="col-span-12 lg:col-span-4 space-y-gutter">
          <div class="glass p-8 rounded-xl flex flex-col items-center text-center border border-white/10">
            <div class="w-24 h-24 rounded-full border-4 border-secondary/45 bg-secondary/15 flex items-center justify-center text-secondary font-bold text-3xl mb-4">
              ${initials(state.user?.name)}
            </div>
            <h3 class="text-xl font-bold text-white">${state.user?.name || 'Counselor'}</h3>
            <p class="text-outline text-xs font-semibold uppercase tracking-wider mt-1">${state.user?.email || 'demo@skillbridge.local'}</p>
            
            <div class="mt-6 w-full pt-6 border-t border-white/10 space-y-4 text-left">
              <div class="flex justify-between text-xs">
                <span class="text-outline">Security Role:</span>
                <span class="text-white font-bold uppercase tracking-wider">${state.user?.role || 'demo'}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-outline">Access Clearance:</span>
                <span class="text-secondary font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">verified</span> Elite Grade
                </span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-outline">Mentorship Status:</span>
                <span class="text-tertiary font-bold">Active Mentor</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Telemetry Stats -->
        <div class="col-span-12 lg:col-span-8 space-y-gutter">
          <div class="glass p-8 rounded-xl space-y-6 border border-white/10">
            <h3 class="font-title-md text-primary font-bold flex items-center gap-2">
              <span class="material-symbols-outlined">analytics</span> Intake Performance Logs
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white/5 p-4 rounded-xl border border-white/5">
                <p class="text-[10px] text-outline uppercase tracking-wider font-semibold">Intakes Processed</p>
                <p class="text-2xl font-bold text-white mt-1">${cases.length} cases</p>
              </div>
              <div class="bg-white/5 p-4 rounded-xl border border-white/5">
                <p class="text-[10px] text-outline uppercase tracking-wider font-semibold">Average Match Score</p>
                <p class="text-2xl font-bold text-secondary mt-1">${avgScore}% fit</p>
              </div>
            </div>

            <div class="space-y-4">
              <h4 class="text-sm font-bold text-white uppercase tracking-wider text-outline text-[11px] pt-4">Recent Session Audit Trail</h4>
              <div class="border border-white/10 rounded-xl overflow-hidden text-xs">
                <div class="bg-white/5 p-3 flex justify-between border-b border-white/10">
                  <span class="text-outline font-semibold">Action performed</span>
                  <span class="text-outline font-semibold">Status</span>
                </div>
                <div class="p-3 flex justify-between border-b border-white/5">
                  <span class="text-white font-medium">Session initialized via demo token</span>
                  <span class="text-secondary font-bold uppercase tracking-wider text-[10px]">Success</span>
                </div>
                <div class="p-3 flex justify-between border-b border-white/5">
                  <span class="text-white font-medium">SQL session log queried</span>
                  <span class="text-secondary font-bold uppercase tracking-wider text-[10px]">Synced</span>
                </div>
                <div class="p-3 flex justify-between">
                  <span class="text-white font-medium">3D background canvas mounted</span>
                  <span class="text-secondary font-bold uppercase tracking-wider text-[10px]">Loaded</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// In-app AI Agent descriptions view HTML
function renderAboutView() {
  return `
    <div class="space-y-6">
      <section class="pb-4">
        <h2 class="font-headline-lg text-primary text-2xl md:text-3xl font-bold">Lived Experience AI Agents</h2>
        <p class="text-outline text-sm md:text-base mt-1">Detailed configurations of the matching models mapping industry experience to career recommendations.</p>
      </section>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Agent Detail 1 -->
        <div class="glass p-8 rounded-xl space-y-4 border border-white/10 hover:border-secondary/35 hover:scale-[1.01] transition-all">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg">
              <span class="material-symbols-outlined text-xl">factory</span>
            </div>
            <h3 class="text-lg font-bold text-white">Manufacturing Analysis Agent</h3>
          </div>
          <p class="text-outline text-sm leading-relaxed">
            Extracts hands-on mechanical and technical attributes. Focuses on machine configuration operations, quality inspections, electrical/mechanical maintenance troubleshooting, heavy machinery operation (forklifts), and Lean safety.
          </p>
        </div>

        <!-- Agent Detail 2 -->
        <div class="glass p-8 rounded-xl space-y-4 border border-white/10 hover:border-secondary/35 hover:scale-[1.01] transition-all">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg">
              <span class="material-symbols-outlined text-xl">shopping_cart</span>
            </div>
            <h3 class="text-lg font-bold text-white">Retail Strategy Agent</h3>
          </div>
          <p class="text-outline text-sm leading-relaxed">
            Extracts client-facing and structural operations attributes. Evaluates POS operations, stock/inventory replenishment systems, cash management audits, customer conflict resolution, and shift scheduling logistics.
          </p>
        </div>

        <!-- Agent Detail 3 -->
        <div class="glass p-8 rounded-xl space-y-4 border border-white/10 hover:border-secondary/35 hover:scale-[1.01] transition-all">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">
              <span class="material-symbols-outlined text-xl">medical_services</span>
            </div>
            <h3 class="text-lg font-bold text-white">Caregiving Compassion Agent</h3>
          </div>
          <p class="text-outline text-sm leading-relaxed">
            Extracts patient medical and safety compliance logs. Inspects clinical patient hygiene, medication alert tracking, medical files documentation, patient empathy metrics, and home safety hazards.
          </p>
        </div>

        <!-- Agent Detail 4 -->
        <div class="glass p-8 rounded-xl space-y-4 border border-white/10 hover:border-secondary/35 hover:scale-[1.01] transition-all">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg">
              <span class="material-symbols-outlined text-xl">restaurant</span>
            </div>
            <h3 class="text-lg font-bold text-white">Food Compliance Agent</h3>
          </div>
          <p class="text-outline text-sm leading-relaxed">
            Extracts sanitation standards and logistics attributes. Matches ServSafe compliance rules, kitchen workstation setups, rush-hour supply logistics, sanitation codes, and supply loading procedures.
          </p>
        </div>

        <!-- Agent Detail 5 -->
        <div class="glass p-8 rounded-xl space-y-4 col-span-1 md:col-span-2 border border-white/10 hover:border-secondary/35 hover:scale-[1.01] transition-all">
          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-500 rounded-lg">
              <span class="material-symbols-outlined text-xl">local_shipping</span>
            </div>
            <h3 class="text-lg font-bold text-white">Logistics & Dispatch Agent</h3>
          </div>
          <p class="text-outline text-sm leading-relaxed">
            Decodes cargo scheduling and shipping logs. Focuses on route optimization dispatch, heavy truck cargo loading parameters, shipping/receiving database workflows, OSHA security rules, and supply chain dispatch audits.
          </p>
        </div>
      </div>
    </div>
  `;
}

// Draw outer layout framework and conditional subviews
function renderApp() {
  root.innerHTML = `
    <!-- Top & Left atmospheric glows -->
    <div class="fixed top-1/4 -right-20 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
    <div class="fixed bottom-0 -left-20 w-[500px] h-[500px] bg-tertiary/5 blur-[150px] rounded-full pointer-events-none -z-10"></div>

    <div class="flex min-h-screen">
      <!-- Side Navigation Panel -->
      ${renderSideNav()}

      <!-- Right Content Frame -->
      <div class="flex-grow lg:pl-[18rem] min-h-screen flex flex-col">
        <!-- Header -->
        ${renderHeader()}

        <!-- Conditional view content container -->
        <main class="flex-grow pt-32 px-4 md:px-8 pb-16 max-w-[1440px] w-full mx-auto">
          ${renderContent()}
        </main>
      </div>
    </div>
  `;

  // Bind responsive sidebar close/open toggle events
  const toggleSidebarBtn = document.querySelector('#toggle-sidebar');
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      state.sidebarOpen = true;
      renderApp();
    });
  }

  const closeSidebarBtn = document.querySelector('#close-sidebar');
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      state.sidebarOpen = false;
      renderApp();
    });
  }

  // Bind menu links
  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', () => {
      state.view = link.dataset.view;
      state.sidebarOpen = false; // Collapse sidebar on navigate
      renderApp();
    });
  });

  // Bind logout action
  const logoutBtn = document.querySelector('#logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      state.view = 'landing';
      renderLanding();
    });
  }

  // Back to home logo click
  const logoHome = document.querySelector('#logo-home');
  if (logoHome) {
    logoHome.addEventListener('click', () => {
      state.view = 'landing';
      renderLanding();
    });
  }

  // Sync state data action
  const syncBtn = document.querySelector('#refresh-state');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.classList.add('animate-spin');
      await loadCases();
      renderApp();
    });
  }

  // Bind elements inside Dashboard view
  if (state.view === 'dashboard') {
    // Dynamic values text typing update
    const workerNameField = document.querySelector('#worker-name');
    if (workerNameField) {
      workerNameField.addEventListener('input', (event) => {
        state.workerName = event.target.value;
      });
    }

    const notesField = document.querySelector('#notes');
    if (notesField) {
      notesField.addEventListener('input', (event) => {
        state.notes = event.target.value;
      });
    }

    // Urgency buttons
    document.querySelectorAll('[data-urgency]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.urgency = btn.dataset.urgency;
        renderApp();
      });
    });

    // Experience tags selection grid
    document.querySelectorAll('[data-signal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.signal;
        state.selected = state.selected.includes(key) 
          ? state.selected.filter(item => item !== key) 
          : [...state.selected, key];
        renderApp();
      });
    });

    // Run matching engine API
    const runBtn = document.querySelector('#run-agent');
    if (runBtn) {
      runBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Fallback sync from DOM to state just in case input events lags
        const nameField = document.querySelector('#worker-name');
        const notesArea = document.querySelector('#notes');
        if (nameField) state.workerName = nameField.value;
        if (notesArea) state.notes = notesArea.value;
        runAnalysis();
      });
    }

    // Load sample profile details
    const loadSampleBtn = document.querySelector('#demo-fill');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        state.workerName = 'Jordan Rivera';
        state.urgency = 'at-risk';
        state.selected = ['retail', 'food', 'logistics'];
        state.notes = 'Store closing in 30 days. Strong shift lead history, inventory ownership, vendor coordination, and weekend availability.';
        state.analysis = null;
        renderApp();
      });
    }
  }

  // Bind elements inside Cases view
  if (state.view === 'cases') {
    // Reload a case from records
    document.querySelectorAll('[data-load-case]').forEach(btn => {
      btn.addEventListener('click', () => {
        const caseId = parseInt(btn.dataset.loadCase, 10);
        const selectedCase = state.cases.find(c => c.id === caseId);
        if (selectedCase) {
          state.workerName = selectedCase.worker_name;
          state.urgency = selectedCase.urgency;
          state.selected = selectedCase.selected;
          state.notes = selectedCase.notes;
          state.analysis = selectedCase.analysis;
          state.view = 'dashboard';
          renderApp();
        }
      });
    });

    // Export spreadsheets download triggers
    const exportBtn = document.querySelector('#export-reports');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        alert("Preparing counselor spreadsheet reports for export... Complete!");
      });
    }
  }

  // Global search navigation
  const searchInput = document.querySelector('#case-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.toLowerCase().trim();
        if (query) {
          state.view = 'cases';
          renderApp();
          const filtered = state.cases.filter(c => 
            c.worker_name.toLowerCase().includes(query) || 
            c.notes.toLowerCase().includes(query) ||
            c.urgency.toLowerCase().includes(query)
          );
          if (filtered.length !== state.cases.length) {
            state.cases = filtered;
            renderApp();
          }
        }
      }
    });
  }
}

// Login screen CANVAS particles generator
function initAtmosphericParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 1.5 + 0.5;
      this.speedX = Math.random() * 0.4 - 0.2;
      this.speedY = Math.random() * 0.4 - 0.2;
      this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
        this.reset();
      }
    }
    draw() {
      ctx.fillStyle = `rgba(137, 213, 186, ${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push(new Particle());
  }

  function animate() {
    if (!document.getElementById('particleCanvas')) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }
  animate();
}

// SPA boot sequence
async function boot() {
  // Initialize global background canvas nodes
  initThreeJSBackground();

  // Validate active counselor sessions
  if (state.token) {
    await loadCases();
    if (state.token) {
      state.view = 'dashboard';
      renderApp();
      return;
    }
  }
  
  // Show premium landing by default
  state.view = 'landing';
  renderLanding();
}

boot();
