/**
 * Cisco AI Prompt Navigator — Webex Protocol & Clipboard Handler
 * Manages 1:1 chat deep links for Circuit and My Agent bots.
 */

export const WEBEX_BOTS = {
  circuit: {
    name: 'Circuit AI Chat',
    email: 'enterprise-chat-ai@webex.bot',
    badgeClass: 'circuit',
    description: 'General enterprise generative AI chat & research'
  },
  my_agent: {
    name: 'My Agent',
    email: 'circuitpulse@webex.bot',
    badgeClass: 'agent',
    description: 'Autonomous skills, connectors & tool automations'
  }
};

/**
 * Copies text cleanly to clipboard with fallback.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-https or legacy environments
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Launches Webex 1:1 chat window with the target bot email.
 */
export function openWebexBot(botKey) {
  const bot = WEBEX_BOTS[botKey] || WEBEX_BOTS.circuit;
  const email = bot.email;
  
  // Protocol URL scheme for Cisco Webex Teams / App
  const protocolUrl = `webexteams://im?email=${encodeURIComponent(email)}`;
  
  // Try launching native Webex client protocol
  window.location.href = protocolUrl;
}

/**
 * Display a tactile Material 3 toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconSvg = type === 'success' 
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}
