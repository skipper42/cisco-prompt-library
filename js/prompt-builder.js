/**
 * Cisco AI Prompt Navigator — Prompt Builder Modal
 * Freeform parameter substitution engine with live preview & dual Webex actions.
 */

import { copyToClipboard, openWebexBot, showToast, WEBEX_BOTS } from './webex.js';

class PromptBuilder {
  constructor() {
    this.currentPrompt = null;
    this.fieldValues = {};
    this.modalEl = null;
  }

  init() {
    this.modalEl = document.getElementById('prompt-builder-modal');
    if (!this.modalEl) return;

    // Close button & scrim listener
    const closeBtn = document.getElementById('close-builder-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // Action button listeners
    const copyBtn = document.getElementById('builder-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.handleCopy());
    }

    const copyWebexBtn = document.getElementById('builder-copy-webex-btn');
    if (copyWebexBtn) {
      copyWebexBtn.addEventListener('click', () => this.handleCopyAndOpenWebex());
    }
  }

  /**
   * Opens the builder for a given prompt
   */
  open(prompt) {
    this.currentPrompt = prompt;
    this.fieldValues = {};

    // Populate title, category, description, and bot badge
    document.getElementById('builder-title').textContent = prompt.title;
    document.getElementById('builder-desc').textContent = prompt.description || '';

    const botKey = prompt.target_bot || 'circuit';
    const botMeta = WEBEX_BOTS[botKey] || WEBEX_BOTS.circuit;
    const botBadge = document.getElementById('builder-bot-badge');
    if (botBadge) {
      botBadge.className = `bot-badge ${botMeta.badgeClass}`;
      botBadge.textContent = botMeta.name;
    }

    const botEmailEl = document.getElementById('builder-bot-email');
    if (botEmailEl) {
      botEmailEl.textContent = botMeta.email;
    }

    // Parse variables from template
    const templateVars = this._extractVariables(prompt.template);
    
    // Merge configured fields with extracted template variables
    const fieldsToRender = [];
    const fieldsMap = new Map();
    if (Array.isArray(prompt.fields)) {
      prompt.fields.forEach(f => fieldsMap.set(f.name, f));
    }

    templateVars.forEach(varName => {
      const existing = fieldsMap.get(varName);
      if (existing) {
        fieldsToRender.push(existing);
        this.fieldValues[varName] = existing.default || '';
      } else {
        const generated = {
          name: varName,
          label: varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          placeholder: `Enter ${varName.replace(/_/g, ' ')}...`,
          default: ''
        };
        fieldsToRender.push(generated);
        this.fieldValues[varName] = '';
      }
    });

    // Render parameter input fields (Strictly text inputs and textareas — NO dropdowns!)
    const fieldsContainer = document.getElementById('builder-fields-container');
    fieldsContainer.innerHTML = '';

    if (fieldsToRender.length === 0) {
      fieldsContainer.innerHTML = `
        <div style="font-size: 0.85rem; color: var(--md-sys-color-outline); padding: 0.5rem 0;">
          This prompt requires no custom variables. You can copy it directly or send it to Webex.
        </div>
      `;
    } else {
      fieldsToRender.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';

        const isLongText = (field.default && field.default.length > 60) || field.name.includes('notes') || field.name.includes('question') || field.name.includes('threat');
        const inputHtml = isLongText
          ? `<textarea class="form-textarea" data-var="${field.name}" placeholder="${this._escapeHtml(field.placeholder || '')}" rows="3">${this._escapeHtml(this.fieldValues[field.name])}</textarea>`
          : `<input type="text" class="form-input" data-var="${field.name}" placeholder="${this._escapeHtml(field.placeholder || '')}" value="${this._escapeHtml(this.fieldValues[field.name])}">`;

        group.innerHTML = `
          <label class="form-label">
            <span>${this._escapeHtml(field.label)}</span>
            <span style="font-size: 0.75rem; color: var(--md-sys-color-outline); font-family: var(--md-font-family-mono);">{${field.name}}</span>
          </label>
          ${inputHtml}
        `;

        fieldsContainer.appendChild(group);
      });

      // Bind input events for live preview update
      fieldsContainer.querySelectorAll('[data-var]').forEach(input => {
        input.addEventListener('input', (e) => {
          const varName = e.target.getAttribute('data-var');
          this.fieldValues[varName] = e.target.value;
          this.updateLivePreview();
        });
      });
    }

    // Initial Live Preview
    this.updateLivePreview();

    // Show modal
    this.modalEl.classList.add('active');
    if (window.lucide) lucide.createIcons();
  }

  close() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
    this.currentPrompt = null;
  }

  /**
   * Replaces variables in the prompt template with current input values.
   * If asHtml is true, wraps replaced variables in a glowing highlight tag.
   */
  getGeneratedPromptText(asHtml = false) {
    if (!this.currentPrompt || !this.currentPrompt.template) return '';
    let result = this.currentPrompt.template;

    if (asHtml) {
      // First escape the base template to prevent XSS
      result = this._escapeHtml(result);

      // Now substitute highlighted spans
      for (const [key, val] of Object.entries(this.fieldValues)) {
        const hasVal = val && val.trim() !== '';
        const displayVal = hasVal ? this._escapeHtml(val) : `{${key}}`;
        const cls = hasVal ? 'var-highlight' : 'var-highlight var-empty';
        const replacement = `<span class="${cls}">${displayVal}</span>`;
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, replacement);
      }
      return result;
    }

    // Plain text mode for clipboard copying
    for (const [key, val] of Object.entries(this.fieldValues)) {
      const replacement = val && val.trim() !== '' ? val : `{${key}}`;
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, replacement);
    }
    return result;
  }

  updateLivePreview() {
    const previewEl = document.getElementById('builder-preview-text');
    if (previewEl) {
      previewEl.innerHTML = this.getGeneratedPromptText(true);
    }
  }

  async handleCopy() {
    const text = this.getGeneratedPromptText(false);
    const success = await copyToClipboard(text);
    if (success) {
      showToast('Prompt copied to clipboard!', 'success');
    } else {
      showToast('Failed to copy to clipboard', 'error');
    }
  }

  async handleCopyAndOpenWebex() {
    const text = this.getGeneratedPromptText(false);
    await copyToClipboard(text);
    if (!this.currentPrompt) return;
    const botKey = this.currentPrompt.target_bot || 'circuit';
    const botMeta = WEBEX_BOTS[botKey] || WEBEX_BOTS.circuit;
    openWebexBot(botKey);
    showToast(`Copied! Opening Webex with ${botMeta.name} — hit Paste (Ctrl+V)`, 'success', 4000);
  }

  _extractVariables(template) {
    if (!template) return [];
    const matches = template.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (!matches) return [];
    const vars = new Set();
    matches.forEach(m => vars.add(m.replace(/[{}]/g, '')));
    return Array.from(vars);
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

export const promptBuilder = new PromptBuilder();
