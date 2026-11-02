/**
 * Cisco AI Prompt Navigator — Database Manager & Editor
 * Enables in-browser CRUD, JSON export, JSON import, and reset to defaults.
 */

import { store } from './prompts-store.js';
import { showToast, WEBEX_BOTS } from './webex.js';

class DbEditor {
  constructor() {
    this.modalEl = null;
    this.editModalEl = null;
    this.editingPromptId = null;
    this.searchTerm = '';
  }

  init() {
    this.modalEl = document.getElementById('manage-db-modal');
    this.editModalEl = document.getElementById('edit-prompt-modal');
    if (!this.modalEl || !this.editModalEl) return;

    // Open DB Manager button in top app bar
    const openBtn = document.getElementById('manage-db-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.open());
    }

    // Close buttons
    const closeBtn = document.getElementById('close-manage-db-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    const closeEditBtn = document.getElementById('close-edit-prompt-btn');
    if (closeEditBtn) closeEditBtn.addEventListener('click', () => this.closeEditModal());

    this.editModalEl.addEventListener('click', (e) => {
      if (e.target === this.editModalEl) this.closeEditModal();
    });

    // DB Manager Action Buttons
    const exportBtn = document.getElementById('db-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        store.exportToJSON();
        showToast('Prompt library exported successfully!', 'success');
      });
    }

    const resetBtn = document.getElementById('db-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the prompt library to factory defaults? All custom edits will be cleared.')) {
          store.resetToDefaults();
          showToast('Prompt library reset to defaults.', 'info');
          this.renderTable();
        }
      });
    }

    const importInput = document.getElementById('db-import-file');
    if (importInput) {
      importInput.addEventListener('change', (e) => this.handleFileImport(e));
    }

    const importTriggerBtn = document.getElementById('db-import-btn');
    if (importTriggerBtn && importInput) {
      importTriggerBtn.addEventListener('click', () => importInput.click());
    }

    const addNewBtn = document.getElementById('db-add-new-btn');
    if (addNewBtn) {
      addNewBtn.addEventListener('click', () => this.openAddModal());
    }

    // Search filter within DB Manager
    const dbSearchInput = document.getElementById('db-search-input');
    if (dbSearchInput) {
      dbSearchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderTable();
      });
    }

    // Edit Form Save
    const editForm = document.getElementById('edit-prompt-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => this.handleSavePrompt(e));
    }
  }

  open() {
    this.searchTerm = '';
    const dbSearchInput = document.getElementById('db-search-input');
    if (dbSearchInput) dbSearchInput.value = '';
    this.renderTable();
    this.modalEl.classList.add('active');
  }

  close() {
    this.modalEl.classList.remove('active');
  }

  renderTable() {
    const tableBody = document.getElementById('db-table-body');
    const statsEl = document.getElementById('db-stats-badge');
    if (!tableBody) return;

    const allPrompts = store.getAllPrompts();
    const filtered = allPrompts.filter(p => {
      if (!this.searchTerm) return true;
      return (
        p.title.toLowerCase().includes(this.searchTerm) ||
        (p.role && p.role.toLowerCase().includes(this.searchTerm)) ||
        (p.category && p.category.toLowerCase().includes(this.searchTerm))
      );
    });

    if (statsEl) {
      statsEl.textContent = `${allPrompts.length} Prompts (${store.customPrompts.size} custom/edited)`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--md-sys-color-outline);">
            No prompts found matching "${this._escapeHtml(this.searchTerm)}"
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(p => {
      const botName = p.target_bot === 'my_agent' ? 'My Agent' : 'Circuit';
      const badgeType = p.target_bot === 'my_agent' ? 'agent' : 'circuit';
      const customTag = p.is_custom ? '<span style="font-size:0.68rem; background:rgba(4,159,217,0.15); color:var(--md-sys-color-primary); padding:2px 6px; border-radius:4px; margin-left:4px;">Custom</span>' : '';

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--md-sys-color-on-surface);">
              ${this._escapeHtml(p.title)} ${customTag}
            </div>
            <div style="font-size: 0.75rem; color: var(--md-sys-color-outline); margin-top: 2px;">
              ${this._escapeHtml(p.category || 'General')}
            </div>
          </td>
          <td>${this._escapeHtml(p.role || 'General')}</td>
          <td>
            <span class="bot-badge ${badgeType}">${botName}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outlined btn-sm edit-prompt-btn" data-id="${p.id}" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;">
              Edit
            </button>
            <button class="btn btn-text btn-sm delete-prompt-btn" data-id="${p.id}" style="padding: 0.25rem 0.6rem; font-size: 0.78rem; color: var(--md-sys-color-error);">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button events
    tableBody.querySelectorAll('.edit-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditModal(id);
      });
    });

    tableBody.querySelectorAll('.delete-prompt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this prompt from your library?')) {
          store.deletePrompt(id);
          showToast('Prompt deleted.', 'info');
          this.renderTable();
        }
      });
    });
  }

  openAddModal() {
    this.editingPromptId = null;
    document.getElementById('edit-modal-title').textContent = 'Add New Prompt';
    document.getElementById('edit-prompt-title').value = '';
    document.getElementById('edit-prompt-role').value = 'Workplace Productivity (Everyone)';
    document.getElementById('edit-prompt-category').value = 'General';
    document.getElementById('edit-prompt-bot').value = 'circuit';
    document.getElementById('edit-prompt-desc').value = '';
    document.getElementById('edit-prompt-template').value = '';
    document.getElementById('edit-prompt-tags').value = '';
    this.editModalEl.classList.add('active');
  }

  openEditModal(promptId) {
    const prompt = store.getPromptById(promptId);
    if (!prompt) return;

    this.editingPromptId = promptId;
    document.getElementById('edit-modal-title').textContent = 'Edit Prompt';
    document.getElementById('edit-prompt-title').value = prompt.title || '';
    document.getElementById('edit-prompt-role').value = prompt.role || 'Workplace Productivity (Everyone)';
    document.getElementById('edit-prompt-category').value = prompt.category || '';
    document.getElementById('edit-prompt-bot').value = prompt.target_bot || 'circuit';
    document.getElementById('edit-prompt-desc').value = prompt.description || '';
    document.getElementById('edit-prompt-template').value = prompt.template || '';
    document.getElementById('edit-prompt-tags').value = Array.isArray(prompt.tags) ? prompt.tags.join(', ') : '';

    this.editModalEl.classList.add('active');
  }

  closeEditModal() {
    this.editModalEl.classList.remove('active');
    this.editingPromptId = null;
  }

  handleSavePrompt(e) {
    e.preventDefault();
    const title = document.getElementById('edit-prompt-title').value.trim();
    const role = document.getElementById('edit-prompt-role').value.trim();
    const category = document.getElementById('edit-prompt-category').value.trim();
    const bot = document.getElementById('edit-prompt-bot').value;
    const desc = document.getElementById('edit-prompt-desc').value.trim();
    const template = document.getElementById('edit-prompt-template').value.trim();
    const rawTags = document.getElementById('edit-prompt-tags').value;
    const tags = rawTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    if (!title || !template) {
      alert('Title and Prompt Template are required.');
      return;
    }

    const promptObj = {
      id: this.editingPromptId || ('prompt_' + Date.now()),
      title,
      role,
      category: category || 'General',
      target_bot: bot,
      bot_label: bot === 'my_agent' ? 'My Agent (Skills & Tools)' : 'Circuit AI Chat',
      description: desc,
      template,
      tags,
      is_ae_top10: role === 'Account Executive Spotlight',
      connectors: bot === 'my_agent' ? ['Webex', 'Enterprise Connectors'] : ['Webex']
    };

    store.savePrompt(promptObj);
    showToast('Prompt saved successfully!', 'success');
    this.closeEditModal();
    this.renderTable();
  }

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          throw new Error('Imported JSON must be an array of prompts.');
        }

        const mode = confirm('Click OK to merge imported prompts into your current library.\nClick Cancel to replace entire library.') ? 'merge' : 'replace';
        store.importFromJSON(json, mode);
        showToast(`Imported ${json.length} prompts successfully!`, 'success');
        this.renderTable();
      } catch (err) {
        alert('Failed to import JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

export const dbEditor = new DbEditor();
