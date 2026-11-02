/**
 * Cisco AI Prompt Navigator — Prompts Data Store
 * Handles CRUD operations, local storage persistence, JSON import/export.
 */

const STORAGE_KEY_PROMPTS = 'cisco_prompts_custom_v1';
const STORAGE_KEY_DELETED = 'cisco_prompts_deleted_v1';
const STORAGE_KEY_WIZARD = 'cisco_prompts_wizard_v1';
const STORAGE_KEY_THEME = 'cisco_prompts_theme_v1';

class PromptsStore {
  constructor() {
    this.defaultPrompts = [];
    this.customPrompts = new Map(); // id -> prompt
    this.deletedPromptIds = new Set();
    this.listeners = [];
  }

  /**
   * Initializes the store from default-prompts.json and LocalStorage
   */
  async init() {
    try {
      const res = await fetch('data/default-prompts.json');
      if (res.ok) {
        this.defaultPrompts = await res.json();
      } else {
        console.warn('Failed to load default-prompts.json, using empty array');
        this.defaultPrompts = [];
      }
    } catch (err) {
      console.error('Error fetching default prompts:', err);
      this.defaultPrompts = [];
    }

    // Load custom overrides from localStorage
    try {
      const storedCustom = localStorage.getItem(STORAGE_KEY_PROMPTS);
      if (storedCustom) {
        const arr = JSON.parse(storedCustom);
        if (Array.isArray(arr)) {
          arr.forEach(p => this.customPrompts.set(p.id, p));
        }
      }

      const storedDeleted = localStorage.getItem(STORAGE_KEY_DELETED);
      if (storedDeleted) {
        const arr = JSON.parse(storedDeleted);
        if (Array.isArray(arr)) {
          arr.forEach(id => this.deletedPromptIds.add(id));
        }
      }
    } catch (err) {
      console.error('Error loading prompts from localStorage:', err);
    }

    this.notify();
  }

  /**
   * Returns merged prompt list (defaults - deleted + custom overrides/additions)
   */
  getAllPrompts() {
    const list = [];
    const seenIds = new Set();

    // 1. Add custom prompts first (they override defaults)
    for (const [id, prompt] of this.customPrompts.entries()) {
      if (!this.deletedPromptIds.has(id)) {
        list.push({ ...prompt, is_custom: true });
        seenIds.add(id);
      }
    }

    // 2. Add defaults that haven't been overridden or deleted
    for (const prompt of this.defaultPrompts) {
      if (!seenIds.has(prompt.id) && !this.deletedPromptIds.has(prompt.id)) {
        list.push({ ...prompt, is_custom: false });
        seenIds.add(prompt.id);
      }
    }

    return list;
  }

  /**
   * Get a single prompt by ID
   */
  getPromptById(id) {
    if (this.deletedPromptIds.has(id)) return null;
    if (this.customPrompts.has(id)) return this.customPrompts.get(id);
    return this.defaultPrompts.find(p => p.id === id) || null;
  }

  /**
   * Add or update a prompt
   */
  savePrompt(prompt) {
    if (!prompt.id) {
      prompt.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    this.deletedPromptIds.delete(prompt.id);
    this.customPrompts.set(prompt.id, prompt);
    this._persist();
    this.notify();
    return prompt;
  }

  /**
   * Delete a prompt
   */
  deletePrompt(id) {
    this.customPrompts.delete(id);
    this.deletedPromptIds.add(id);
    this._persist();
    this.notify();
  }

  /**
   * Reset library back to factory defaults
   */
  resetToDefaults() {
    this.customPrompts.clear();
    this.deletedPromptIds.clear();
    localStorage.removeItem(STORAGE_KEY_PROMPTS);
    localStorage.removeItem(STORAGE_KEY_DELETED);
    this.notify();
  }

  /**
   * Export complete active prompt library as JSON download
   */
  exportToJSON() {
    const all = this.getAllPrompts();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(all, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cisco_prompts_export_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Import prompts from JSON array
   */
  importFromJSON(jsonArray, mode = 'merge') {
    if (!Array.isArray(jsonArray)) {
      throw new Error('Invalid JSON: Must be an array of prompt objects.');
    }

    if (mode === 'replace') {
      this.customPrompts.clear();
      this.deletedPromptIds.clear();
    }

    for (const item of jsonArray) {
      if (!item.title || !item.template) continue;
      const id = item.id || ('imported_' + Math.random().toString(36).substr(2, 7));
      item.id = id;
      this.customPrompts.set(id, item);
      this.deletedPromptIds.delete(id);
    }

    this._persist();
    this.notify();
  }

  /**
   * Persist custom and deleted sets to LocalStorage
   */
  _persist() {
    try {
      const customArr = Array.from(this.customPrompts.values());
      localStorage.setItem(STORAGE_KEY_PROMPTS, JSON.stringify(customArr));
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(this.deletedPromptIds)));
    } catch (err) {
      console.error('Failed to persist to LocalStorage:', err);
    }
  }

  /**
   * Subscribe to changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    const all = this.getAllPrompts();
    this.listeners.forEach(cb => cb(all));
  }

  // Wizard preferences helpers
  getWizardState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_WIZARD));
    } catch {
      return null;
    }
  }

  setWizardState(state) {
    localStorage.setItem(STORAGE_KEY_WIZARD, JSON.stringify(state));
  }

  clearWizardState() {
    localStorage.removeItem(STORAGE_KEY_WIZARD);
  }

  // Theme preference helpers
  getTheme() {
    return localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  }

  setTheme(theme) {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

export const store = new PromptsStore();
