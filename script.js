const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const workflowTabs = [...document.querySelectorAll('.workflow-tab')];
const workflowPanel = document.querySelector('#workflow-panel');
const progressBar = document.querySelector('#scroll-progress-bar');
const mainTrack = document.querySelector('#main');
const horizontalLayout = window.matchMedia('(min-width: 701px)');

const workflows = {
  mail: {
    code: 'A01',
    caption: 'A message arrives. AI helps interpret it; the next step can be reviewed before anything moves.',
    aria: 'Gmail trigger connects to AI processing, then an optional reviewed response or action.',
    nodes: [
      ['↘', 'TRIGGER', 'Gmail'], ['≋', 'DATA', 'Message'], ['✳', 'AI / LOGIC', 'Interpret'], ['◇', 'DECISION', 'Review'], ['↗', 'ACTION', 'Reply / route'],
    ],
  },
  crm: {
    code: 'A02',
    caption: 'A form submission can be normalized, enriched with AI-assisted context, then mapped into CRM fields.',
    aria: 'Form trigger passes submitted fields to AI processing, then reviewed CRM field mapping and an update action.',
    nodes: [
      ['↘', 'TRIGGER', 'Form'], ['≋', 'DATA', 'Fields'], ['✳', 'AI / LOGIC', 'Enrich'], ['◇', 'DECISION', 'Map fields'], ['↗', 'ACTION', 'CRM update'],
    ],
  },
  calendar: {
    code: 'A03',
    caption: 'A scheduling request can be parsed for intent, checked against a calendar, then routed as a notification.',
    aria: 'Calendar request trigger passes scheduling details to availability logic, followed by an optional notification.',
    nodes: [
      ['↘', 'TRIGGER', 'Request'], ['≋', 'DATA', 'Time / intent'], ['✳', 'AI / LOGIC', 'Schedule'], ['◇', 'DECISION', 'Availability'], ['↗', 'ACTION', 'Notify'],
    ],
  },
  rag: {
    code: 'A04',
    caption: 'A document can be retrieved as context for a grounded response; the retrieval pattern is an experiment.',
    aria: 'Document input is split into retrievable context, passed to RAG and AI, then used for a grounded response.',
    nodes: [
      ['↘', 'TRIGGER', 'Question'], ['≋', 'DATA', 'Document'], ['✳', 'AI / LOGIC', 'RAG context'], ['◇', 'DECISION', 'Ground'], ['↗', 'ACTION', 'AI response'],
    ],
  },
};

const thermalModel = {
  mud_brick: { k: 0.75, density: 1700, colorClass: 'mud' },
  puf_panel: { k: 0.022, density: 40, colorClass: 'puf' },
  pcm_wall: { k: 0.2, density: 850, colorClass: 'pcm' },
};

function updateWorkflow(key) {
  const workflow = workflows[key];
  if (!workflow || !workflowPanel) return;

  workflowTabs.forEach((tab) => {
    const isActive = tab.dataset.flow === key;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  workflowPanel.setAttribute('aria-labelledby', `flow-tab-${key}`);
  document.querySelector('#flow-code').textContent = workflow.code;
  document.querySelector('#workflow-caption').textContent = workflow.caption;
  document.querySelector('.workflow-canvas').setAttribute('aria-label', workflow.aria);

  const nodeContainer = document.querySelector('#flow-nodes');
  nodeContainer.replaceChildren(...workflow.nodes.map(([icon, type, label]) => {
    const node = document.createElement('div');
    node.className = `flow-node ${type === 'AI / LOGIC' ? 'node-ai' : ''} ${type === 'DECISION' ? 'node-decision' : ''} ${type === 'ACTION' ? 'node-action' : ''}`;
    const iconElement = document.createElement('span');
    iconElement.className = 'node-icon';
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.textContent = icon;
    const typeElement = document.createElement('span');
    typeElement.className = 'node-type';
    typeElement.textContent = type;
    const labelElement = document.createElement('strong');
    labelElement.textContent = label;
    node.append(iconElement, typeElement, labelElement);
    return node;
  }));
}

function formatTemperature(value) {
  return `${value < 0 ? '−' : ''}${Math.abs(value)} °C`;
}

function buildThermalSeries(highTemperature, lowTemperature, thickness, material) {
  const resistance = thickness / material.k;
  const massFactor = 1 + 0.15 * Math.sqrt(material.density / 500);
  const responseFactor = 1 / (1 + resistance * massFactor);
  const average = (highTemperature + lowTemperature) / 2;
  const amplitude = (highTemperature - lowTemperature) / 2;

  return Array.from({ length: 24 }, (_, hour) => {
    const outside = average + amplitude * Math.sin((hour - 8) * (Math.PI / 12));
    return Math.round((average + (outside - average) * responseFactor) * 10) / 10;
  });
}

function chartPath(values, minimum, maximum) {
  const width = 596;
  const height = 194;
  const left = 47;
  const top = 17;
  return values.map((value, index) => {
    const x = left + (index / (values.length - 1)) * width;
    const y = top + ((maximum - value) / (maximum - minimum)) * height;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function renderThermalChart(highTemperature, lowTemperature, thickness) {
  const chart = document.querySelector('#thermal-chart');
  if (!chart) return;

  const allValues = Object.values(thermalModel).flatMap((material) => buildThermalSeries(highTemperature, lowTemperature, thickness, material));
  const minimum = Math.floor(Math.min(lowTemperature - 3, ...allValues) / 5) * 5;
  const maximum = Math.ceil(Math.max(highTemperature + 3, ...allValues) / 5) * 5;
  const step = Math.max(5, Math.ceil((maximum - minimum) / 4 / 5) * 5);
  const labels = [];

  for (let temperature = Math.ceil(minimum / step) * step; temperature <= maximum; temperature += step) {
    const y = 17 + ((maximum - temperature) / (maximum - minimum)) * 194;
    labels.push(`<line class="chart-gridline" x1="47" y1="${y.toFixed(2)}" x2="643" y2="${y.toFixed(2)}" />`);
    labels.push(`<text class="chart-axis-label" x="37" y="${(y + 3).toFixed(2)}" text-anchor="end">${temperature}°</text>`);
  }

  [0, 4, 8, 12, 16, 20, 23].forEach((hour) => {
    const x = 47 + (hour / 23) * 596;
    labels.push(`<text class="chart-axis-label" x="${x.toFixed(2)}" y="232" text-anchor="middle">${String(hour).padStart(2, '0')}</text>`);
  });

  const paths = Object.values(thermalModel).map((material) => {
    const values = buildThermalSeries(highTemperature, lowTemperature, thickness, material);
    return `<path class="chart-path chart-path-${material.colorClass}" d="${chartPath(values, minimum, maximum)}"><title>${material.colorClass} material screening temperature profile</title></path>`;
  });

  chart.setAttribute('aria-label', `Prototype 24-hour screening curves from ${formatTemperature(lowTemperature)} overnight minimum to ${formatTemperature(highTemperature)} daytime maximum with ${thickness.toFixed(2)} metre wall thickness. This heuristic is not measured indoor temperature.`);
  chart.innerHTML = `<title>Illustrative 24-hour material temperature curves</title><desc>A screening heuristic model for mud brick, PUF panel and PCM wall. Input range ${lowTemperature} to ${highTemperature} degrees Celsius; wall thickness ${thickness.toFixed(2)} metres. Not measured indoor temperature.</desc>${labels.join('')}${paths.join('')}`;
}

function initializeThermalModel() {
  const highInput = document.querySelector('#high-temp');
  const lowInput = document.querySelector('#low-temp');
  const highOutput = document.querySelector('#high-temp-output');
  const lowOutput = document.querySelector('#low-temp-output');
  const thicknessInput = document.querySelector('#wall-depth');
  const status = document.querySelector('#model-status');
  const runButton = document.querySelector('#run-model');

  if (!highInput || !lowInput || !highOutput || !lowOutput || !thicknessInput || !runButton) return;

  const updateLabels = () => {
    highOutput.textContent = formatTemperature(Number(highInput.value));
    lowOutput.textContent = formatTemperature(Number(lowInput.value));
  };

  highInput.addEventListener('input', updateLabels);
  lowInput.addEventListener('input', updateLabels);
  runButton.addEventListener('click', () => {
    const highTemperature = Number(highInput.value);
    const lowTemperature = Number(lowInput.value);
    const thickness = Number(thicknessInput.value);

    if (!Number.isFinite(thickness) || thickness < 0.05 || thickness > 1) {
      thicknessInput.setAttribute('aria-invalid', 'true');
      status.textContent = 'Choose a wall thickness from 0.05 to 1.00 metres.';
      thicknessInput.focus();
      return;
    }

    thicknessInput.removeAttribute('aria-invalid');
    renderThermalChart(highTemperature, lowTemperature, thickness);
    status.textContent = 'Updated using the repository’s simple resistance-and-mass screening heuristic—not a whole-building simulation.';
  });

  updateLabels();
  renderThermalChart(Number(highInput.value), Number(lowInput.value), Number(thicknessInput.value));
}

function initializeNavigation() {
  if (!menuButton || !navLinks) return;

  const closeMenu = (returnFocus = false) => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
    navLinks.classList.remove('is-open');
    if (returnFocus) menuButton.focus();
  };

  menuButton.addEventListener('click', () => {
    const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isExpanded));
    menuButton.setAttribute('aria-label', isExpanded ? 'Open navigation' : 'Close navigation');
    navLinks.classList.toggle('is-open', !isExpanded);
  });

  navLinks.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
    if (event.key === 'Tab' && menuButton.getAttribute('aria-expanded') === 'true' && !navLinks.contains(event.target) && event.target !== menuButton) closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) closeMenu();
  });
}

function initializeScrollProgress() {
  if (!progressBar) return;

  let isScheduled = false;
  const update = () => {
    const desktop = horizontalLayout.matches && mainTrack;
    const available = desktop
      ? mainTrack.scrollWidth - mainTrack.clientWidth
      : document.documentElement.scrollHeight - window.innerHeight;
    const position = desktop ? mainTrack.scrollLeft : window.scrollY;
    const ratio = available > 0 ? position / available : 0;
    progressBar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    isScheduled = false;
  };

  const scheduleUpdate = () => {
    if (!isScheduled) {
      window.requestAnimationFrame(update);
      isScheduled = true;
    }
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  mainTrack?.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', update);
  horizontalLayout.addEventListener('change', update);
  update();
}

function initializeHorizontalScrolling() {
  if (!mainTrack) return;

  let wheelLocked = false;

  const getCurrentPanelIndex = () => {
    const panels = [...mainTrack.querySelectorAll(':scope > section')];
    const trackLeft = mainTrack.getBoundingClientRect().left;
    const currentIndex = panels.findIndex((panel) => {
      const rect = panel.getBoundingClientRect();
      return rect.left <= trackLeft + 1 && rect.right > trackLeft + 1;
    });
    return { panels, index: Math.max(0, currentIndex) };
  };

  const moveToPanel = (direction) => {
    if (wheelLocked) return;
    const { panels, index } = getCurrentPanelIndex();
    const nextIndex = Math.max(0, Math.min(panels.length - 1, index + direction));
    if (nextIndex === index) return;

    wheelLocked = true;
    panels[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    window.setTimeout(() => { wheelLocked = false; }, 650);
  };

  document.addEventListener('click', (event) => {
    if (!horizontalLayout.matches || !(event.target instanceof Element)) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    const panel = target?.closest('main > section');
    if (!target || !panel) return;

    event.preventDefault();
    panel.scrollTo({ top: 0, behavior: 'auto' });
    mainTrack.scrollTo({ left: panel.offsetLeft, behavior: 'smooth' });
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  });

  if (horizontalLayout.matches && location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const panel = target?.closest('main > section');
    if (panel) requestAnimationFrame(() => { mainTrack.scrollLeft = panel.offsetLeft; });
  }

  mainTrack.addEventListener('wheel', (event) => {
    if (!horizontalLayout.matches || event.ctrlKey || event.metaKey) return;

    const horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : 0;
    const verticalDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : 0;
    const activePanel = event.target instanceof Element
      ? event.target.closest('main > section')
      : null;
    const canScrollPanel = verticalDelta !== 0
      && activePanel
      && activePanel.scrollHeight > activePanel.clientHeight
      && (verticalDelta < 0
        ? activePanel.scrollTop > 0
        : activePanel.scrollTop + activePanel.clientHeight < activePanel.scrollHeight - 1);

    if (canScrollPanel) return;

    const delta = horizontalDelta || verticalDelta;
    if (Math.abs(delta) < 4) return;
    event.preventDefault();
    moveToPanel(delta > 0 ? 1 : -1);
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (!horizontalLayout.matches || !['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(event.key)) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"], button, a')) return;

    const panels = [...mainTrack.querySelectorAll(':scope > section')];
    const currentIndex = panels.findIndex((panel) => {
      const rect = panel.getBoundingClientRect();
      return rect.left <= 1 && rect.right > 1;
    });
    const current = Math.max(0, currentIndex);
    const next = event.key === 'ArrowLeft' || event.key === 'PageUp'
      ? Math.max(0, current - 1)
      : Math.min(panels.length - 1, current + 1);

    if (next === current) return;
    event.preventDefault();
    panels[next].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  });
}

function initializeContactCopy() {
  const copyBtn = document.querySelector('.channel-btn-copy');
  if (!copyBtn) return;
  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.email || 'avikadhakar23@gmail.com';
    try {
      await navigator.clipboard.writeText(email);
      const textSpan = copyBtn.querySelector('.copy-text') || copyBtn;
      const originalText = textSpan.textContent;
      textSpan.textContent = '✓ Copied!';
      copyBtn.classList.add('is-copied');
      setTimeout(() => {
        textSpan.textContent = originalText;
        copyBtn.classList.remove('is-copied');
      }, 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  });
}

function initialize() {
  document.querySelectorAll('.workflow-tab').forEach((tab) => {
    tab.addEventListener('click', () => updateWorkflow(tab.dataset.flow));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = workflowTabs.indexOf(tab);
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? workflowTabs.length - 1
          : (currentIndex + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + workflowTabs.length) % workflowTabs.length;
      workflowTabs[nextIndex].focus();
      updateWorkflow(workflowTabs[nextIndex].dataset.flow);
    });
  });

  initializeThermalModel();
  initializeNavigation();
  initializeScrollProgress();
  initializeHorizontalScrolling();
  initializeContactCopy();
}

initialize();