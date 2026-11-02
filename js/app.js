/**
 * Cisco AI Prompt Navigator — Main App Controller
 * Orchestrates wizard, filters, card rendering, and theme management.
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
    // Theme setup
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
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
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
      iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    } else {
      iconContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
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
    const bannerBtn = document.getElementById('banner-switch-mode-btn');
    const roleChipsContainer = document.getElementById('role-chips-container');

    if (mode === 'ae_spotlight') {
      if (bannerTitle) bannerTitle.textContent = 'Account Executive & Sales Spotlight';
      if (bannerDesc) bannerDesc.textContent = 'Curated high-leverage prompts for deal velocity, MBR insights, Cisco Ready inventory, inbox triage, and CCW discounts.';
      if (bannerBtn) bannerBtn.textContent = 'Explore All Cisco Roles';
      if (roleChipsContainer) roleChipsContainer.style.display = 'none';
    } else {
      if (bannerTitle) bannerTitle.textContent = 'Cisco Full Workforce AI Library';
      if (bannerDesc) bannerDesc.textContent = 'Consolidated, high-impact prompts for Workplace Productivity, Sales, People Leaders, Marketing & Finance.';
      if (bannerBtn) bannerBtn.textContent = 'Switch to Account Executive Spotlight';
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
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No matching prompts found</h3>
          <p style="margin-top: 0.5rem; font-size: 0.85rem;">Try adjusting your search query, selecting another category, or resetting filters.</p>
        </div>
      `;
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
  }

  renderPromptCard(prompt) {
    const botKey = prompt.target_bot || 'circuit';
    const botMeta = WEBEX_BOTS[botKey] || WEBEX_BOTS.circuit;
    const connectorsHtml = Array.isArray(prompt.connectors) && prompt.connectors.length > 0
      ? `<div class="connectors-list">${prompt.connectors.map(c => `<span class="connector-chip">${this._escapeHtml(c)}</span>`).join('')}</div>`
      : '';

    return `
      <div class="prompt-card" data-id="${prompt.id}">
        <div class="card-top prompt-card-clickable" style="cursor: pointer;">
          <div class="card-badges">
            <span class="bot-badge ${botMeta.badgeClass}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="margin-right:2px;"><circle cx="12" cy="12" r="10"/></svg>
              ${botMeta.name}
            </span>
            <span class="category-tag">${this._escapeHtml(prompt.category || 'General')}</span>
          </div>
          <h3 class="prompt-title">${this._escapeHtml(prompt.title)}</h3>
          <p class="prompt-description">${this._escapeHtml(prompt.description || '')}</p>
          ${connectorsHtml}
        </div>
        
        <div class="card-actions">
          <button class="btn btn-primary btn-sm use-prompt-btn" title="Customize variables and preview prompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Use Prompt
          </button>
          
          <div class="card-actions-left">
            <button class="btn btn-outlined btn-icon quick-copy-btn" title="Copy raw prompt to clipboard" aria-label="Copy prompt">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="btn btn-outlined btn-icon quick-copy-webex-btn" title="Copy &amp; Open Webex (${botMeta.name})" aria-label="Copy &amp; Open Webex">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
