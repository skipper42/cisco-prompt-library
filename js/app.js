/**
 * Cisco AI Prompt Navigator — Main App Controller
 * Orchestrates wizard, filters, card rendering, and theme management with Modern SaaS UI.
 */

import { store } from './prompts-store.js';
import { promptBuilder } from './prompt-builder.js';
import { dbEditor } from './editor.js';
import { copyToClipboard, openWebexBot, showToast, WEBEX_BOTS } from './webex.js';

class App {
  constructor() {
    this.currentMode = 'all'; // 'ae_spotlight' or 'full_library'
    this.selectedRole = 'all';
    this.selectedBot = 'all'; // 'all', 'circuit', 'my_agent'
    this.searchTerm = '';
    this.wizardModalEl = null;
  }

  async init() {
    // Theme setup (default dark modern SaaS)
    const savedTheme = store.getTheme();
    store.setTheme(savedTheme);
    this.setupThemeToggle();

    // Initialize submodules
    promptBuilder.init();
    dbEditor.init();

    // Initialize prompts store
    await store.init();

    // Setup Wizard Modal & Check State
    this.wizardModalEl = document.getElementById('wizard-modal');
    this.setupWizard();

    // Setup Search & Filters
    this.setupFilters();

    // Subscribe to store updates
    store.subscribe(() => {
      this.render();
    });

    // Check saved wizard state
    const savedWizard = store.getWizardState();
    if (savedWizard && savedWizard.mode) {
      this.setMode(savedWizard.mode);
    } else {
      // First visit: launch onboarding wizard
      this.openWizard();
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      store.setTheme(next);
      this.updateThemeIcon(next);
    });

    this.updateThemeIcon(store.getTheme());
  }

  updateThemeIcon(theme) {
    const iconContainer = document.getElementById('theme-icon');
    if (!iconContainer) return;
    if (theme === 'dark') {
      iconContainer.innerHTML = `<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>`;
    } else {
      iconContainer.innerHTML = `<i data-lucide="moon" class="w-4 h-4 text-cyan-500"></i>`;
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  setupWizard() {
    const wizardAeCard = document.getElementById('wizard-opt-ae');
    const wizardAllCard = document.getElementById('wizard-opt-all');
    const restartBtn = document.getElementById('restart-wizard-btn');

    if (wizardAeCard) {
      wizardAeCard.addEventListener('click', () => {
        this.selectRoleMode('ae_spotlight');
      });
    }

    if (wizardAllCard) {
      wizardAllCard.addEventListener('click', () => {
        this.selectRoleMode('full_library');
      });
    }

    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.openWizard();
      });
    }

    // Switch mode banner button
    const switchBannerBtn = document.getElementById('banner-switch-mode-btn');
    if (switchBannerBtn) {
      switchBannerBtn.addEventListener('click', () => {
        const nextMode = this.currentMode === 'ae_spotlight' ? 'full_library' : 'ae_spotlight';
        this.selectRoleMode(nextMode);
      });
    }
  }

  openWizard() {
    if (this.wizardModalEl) {
      this.wizardModalEl.classList.add('active');
      if (window.lucide) lucide.createIcons();
    }
  }

  closeWizard() {
    if (this.wizardModalEl) {
      this.wizardModalEl.classList.remove('active');
    }
  }

  selectRoleMode(mode) {
    this.setMode(mode);
    store.setWizardState({ mode, timestamp: Date.now() });
    this.closeWizard();
  }

  setMode(mode) {
    this.currentMode = mode;
    this.selectedRole = 'all';

    // Update Banner UI
    const bannerTitle = document.getElementById('mode-banner-title');
    const bannerDesc = document.getElementById('mode-banner-desc');
    const bannerBtnText = document.getElementById('banner-switch-mode-text');
    const roleChipsContainer = document.getElementById('role-chips-container');

    if (mode === 'ae_spotlight') {
      if (bannerTitle) bannerTitle.textContent = 'Account Executive & Sales Spotlight';
      if (bannerDesc) bannerDesc.textContent = 'Curated high-leverage prompts for deal velocity, MBR insights, Cisco Ready inventory, inbox triage, and CCW discounts.';
      if (bannerBtnText) bannerBtnText.textContent = 'Explore All Cisco Roles';
      if (roleChipsContainer) roleChipsContainer.style.display = 'none';
    } else {
      if (bannerTitle) bannerTitle.textContent = 'Cisco Full Workforce AI Library';
      if (bannerDesc) bannerDesc.textContent = 'Consolidated, high-impact prompts for Workplace Productivity, Sales, People Leaders, Marketing & Finance.';
      if (bannerBtnText) bannerBtnText.textContent = 'Switch to Account Executive Spotlight';
      if (roleChipsContainer) roleChipsContainer.style.display = 'flex';
    }

    this.render();
  }

  setupFilters() {
    // Search input
    const searchInput = document.getElementById('global-search-input');
    const clearBtn = document.getElementById('clear-search-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        if (clearBtn) {
          clearBtn.style.display = this.searchTerm ? 'flex' : 'none';
        }
        this.render();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.searchTerm = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        this.render();
      });
    }

    // Bot filter pills
    const botPills = document.querySelectorAll('.bot-pill');
    botPills.forEach(pill => {
      pill.addEventListener('click', () => {
        botPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.selectedBot = pill.getAttribute('data-bot');
        this.render();
      });
    });
  }

  renderRoleChips(prompts) {
    const container = document.getElementById('role-chips-container');
    if (!container || this.currentMode === 'ae_spotlight') return;

    // Collect roles
    const roleCounts = new Map();
    prompts.forEach(p => {
      if (p.role && p.role !== 'Account Executive Spotlight') {
        roleCounts.set(p.role, (roleCounts.get(p.role) || 0) + 1);
      }
    });

    let html = `
      <button class="chip ${this.selectedRole === 'all' ? 'active' : ''}" data-role="all">
        All Roles <span class="chip-count">${prompts.length}</span>
      </button>
    `;

    for (const [role, count] of roleCounts.entries()) {
      const isActive = this.selectedRole === role ? 'active' : '';
      html += `
        <button class="chip ${isActive}" data-role="${this._escapeHtml(role)}">
          ${this._escapeHtml(role)} <span class="chip-count">${count}</span>
        </button>
      `;
    }

    container.innerHTML = html;

    // Bind chip clicks
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.selectedRole = chip.getAttribute('data-role');
        this.render();
      });
    });
  }

  render() {
    const all = store.getAllPrompts();

    // 1. Filter by Mode
    let filtered = all.filter(p => {
      if (this.currentMode === 'ae_spotlight') {
        return p.is_ae_top10 === true || p.role === 'Account Executive Spotlight';
      }
      return true;
    });

    // Render Role chips if in full library mode
    if (this.currentMode !== 'ae_spotlight') {
      this.renderRoleChips(all);
    }

    // 2. Filter by Role (if in full library)
    if (this.currentMode !== 'ae_spotlight' && this.selectedRole !== 'all') {
      filtered = filtered.filter(p => p.role === this.selectedRole);
    }

    // 3. Filter by Bot
    if (this.selectedBot !== 'all') {
      filtered = filtered.filter(p => p.target_bot === this.selectedBot || p.target_bot === 'both');
    }

    // 4. Filter by Search Query
    if (this.searchTerm) {
      filtered = filtered.filter(p => {
        const titleMatch = p.title && p.title.toLowerCase().includes(this.searchTerm);
        const descMatch = p.description && p.description.toLowerCase().includes(this.searchTerm);
        const catMatch = p.category && p.category.toLowerCase().includes(this.searchTerm);
        const tagMatch = Array.isArray(p.tags) && p.tags.some(t => t.toLowerCase().includes(this.searchTerm));
        return titleMatch || descMatch || catMatch || tagMatch;
      });
    }

    // Update Results Meta Counter
    const metaEl = document.getElementById('results-count-meta');
    if (metaEl) {
      metaEl.textContent = `Showing ${filtered.length} prompt${filtered.length === 1 ? '' : 's'}`;
    }

    // Render Grid
    const gridEl = document.getElementById('prompts-grid');
    if (!gridEl) return;

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full p-12 text-center rounded-2xl bg-slate-900/60 dynamic-blur border border-white/10">
          <div class="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
            <i data-lucide="search-x" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white tracking-tight">No matching prompts found</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Try adjusting your search query, selecting another category, or resetting filters.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    gridEl.innerHTML = filtered.map(p => this.renderPromptCard(p)).join('');

    // Attach card event listeners
    gridEl.querySelectorAll('.prompt-card').forEach(card => {
      const id = card.getAttribute('data-id');
      const prompt = store.getPromptById(id);
      if (!prompt) return;

      // Card click or "Use Prompt" button opens builder
      card.querySelectorAll('.use-prompt-btn, .prompt-card-clickable').forEach(el => {
        el.addEventListener('click', () => {
          promptBuilder.open(prompt);
        });
      });

      // Quick Copy button
      const copyBtn = card.querySelector('.quick-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const success = await copyToClipboard(prompt.template);
          if (success) {
            showToast('Prompt copied to clipboard!', 'success');
          }
        });
      }

      // Quick Copy & Open Webex button
      const copyWebexBtn = card.querySelector('.quick-copy-webex-btn');
      if (copyWebexBtn) {
        copyWebexBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await copyToClipboard(prompt.template);
          openWebexBot(prompt.target_bot);
          const botMeta = WEBEX_BOTS[prompt.target_bot] || WEBEX_BOTS.circuit;
          showToast(`Copied! Opening Webex with ${botMeta.name} — hit Paste (Ctrl+V)`, 'success', 4000);
        });
      }
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  renderPromptCard(prompt) {
    const botKey = prompt.target_bot || 'circuit';
    const botMeta = WEBEX_BOTS[botKey] || WEBEX_BOTS.circuit;
    const isCircuit = botKey === 'circuit';
    const connectorsHtml = Array.isArray(prompt.connectors) && prompt.connectors.length > 0
      ? `<div class="flex flex-wrap gap-1.5 mb-4">${prompt.connectors.map(c => `<span class="connector-chip">${this._escapeHtml(c)}</span>`).join('')}</div>`
      : '';

    return `
      <div class="prompt-card group relative p-5 rounded-2xl bg-slate-900/60 dynamic-blur border border-white/10 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between" data-id="${prompt.id}">
        <div class="prompt-card-clickable cursor-pointer flex-1 flex flex-col">
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
              isCircuit 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }">
              <span class="w-1.5 h-1.5 rounded-full ${isCircuit ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}"></span>
              ${botMeta.name}
            </span>
            <span class="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-800/80 border border-white/5">
              ${this._escapeHtml(prompt.category || 'General')}
            </span>
          </div>

          <h3 class="font-bold text-base tracking-tight text-white group-hover:text-cyan-400 transition-colors mb-2 leading-snug">
            ${this._escapeHtml(prompt.title)}
          </h3>

          <p class="text-xs text-slate-400 leading-relaxed mb-4 flex-1">
            ${this._escapeHtml(prompt.description || '')}
          </p>

          ${connectorsHtml}
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2 mt-auto">
          <button class="use-prompt-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all hover:shadow-lg hover:shadow-cyan-500/20" title="Customize variables and preview prompt">
            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
            <span>Use Prompt</span>
          </button>

          <div class="flex items-center gap-1.5">
            <button class="quick-copy-btn p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors" title="Copy raw prompt template" aria-label="Copy prompt">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
            <button class="quick-copy-webex-btn p-2 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 transition-colors" title="Copy & Open Webex (${botMeta.name})" aria-label="Copy & Open Webex">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  _escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate and start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
