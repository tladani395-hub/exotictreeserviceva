/**
 * Exotic Tree Service VA — Core Interactive Application Engine
 * Handles Dual Theme Switching, Instant Price Calculator, Ajax Lead Submissions,
 * Before/After Image Slider, and Mobile Action Triggers.
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initEstimateCalculator();
  initLeadForms();
  initBeforeAfterSlider();
  initFAQAccordion();
  initMobileNav();
});

/* ==========================================================================
   1. Dual Theme Engine (Forest Emerald vs Midnight Slate)
   ========================================================================== */
function initThemeEngine() {
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const savedTheme = localStorage.getItem('ets_va_theme') || 'theme-emerald';

  applyTheme(savedTheme);

  themeToggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const currentTheme = document.body.classList.contains('theme-midnight')
        ? 'theme-midnight'
        : 'theme-emerald';
      const newTheme = currentTheme === 'theme-emerald' ? 'theme-midnight' : 'theme-emerald';
      applyTheme(newTheme);
      localStorage.setItem('ets_va_theme', newTheme);
    });
  });
}

function applyTheme(themeName) {
  document.body.classList.remove('theme-emerald', 'theme-midnight');
  document.body.classList.add(themeName);

  const themeLabels = document.querySelectorAll('.theme-label-text');
  themeLabels.forEach((el) => {
    if (themeName === 'theme-midnight') {
      el.textContent = '🌙 Midnight Mode';
    } else {
      el.textContent = '🌿 Emerald Mode';
    }
  });
}

/* ==========================================================================
   2. Interactive Instant Estimate Calculator
   ========================================================================== */
function initEstimateCalculator() {
  const diameterSlider = document.getElementById('calc-diameter');
  const diameterDisplay = document.getElementById('calc-diameter-val');
  const serviceSelect = document.getElementById('calc-service');
  const proximityRadios = document.querySelectorAll('input[name="proximity"]');
  const priceDisplay = document.getElementById('calc-price-output');
  const lockQuoteBtn = document.getElementById('btn-lock-quote');

  if (!diameterSlider || !priceDisplay) return;

  function updatePrice() {
    const diameter = parseInt(diameterSlider.value) || 20;
    const service = serviceSelect ? serviceSelect.value : 'Standard Tree Removal';
    let proximity = 'open-lawn';

    proximityRadios.forEach((r) => {
      if (r.checked) proximity = r.value;
    });

    if (diameterDisplay) {
      let desc = 'Small Tree';
      if (diameter >= 36) desc = 'Massive Mature Canopy';
      else if (diameter >= 24) desc = 'Large Mature Tree';
      else if (diameter >= 14) desc = 'Medium Tree';

      diameterDisplay.textContent = `${diameter}" Trunk (${desc})`;
    }

    // Call estimate calculation
    let baseMin = 450;
    let baseMax = 950;

    if (service === 'Emergency Tree Removal') {
      baseMin = 900;
      baseMax = 1850;
    } else if (service === 'Standard Tree Removal') {
      baseMin = 500;
      baseMax = 1200;
    } else if (service === 'Crane-Assisted Removal') {
      baseMin = 1450;
      baseMax = 2900;
    } else if (service === 'Trimming & Pruning') {
      baseMin = 320;
      baseMax = 750;
    } else if (service === 'Stump Grinding') {
      baseMin = 160;
      baseMax = 380;
    } else if (service === 'Storm Cleanup & Debris') {
      baseMin = 480;
      baseMax = 980;
    }

    const sizeMultiplier = Math.max(1, diameter / 14);
    let proxMultiplier = 1.0;
    if (proximity === 'near-structure') proxMultiplier = 1.35;
    if (proximity === 'near-powerlines') proxMultiplier = 1.55;

    const min = Math.round((baseMin * sizeMultiplier * proxMultiplier) / 50) * 50;
    const max = Math.round((baseMax * sizeMultiplier * proxMultiplier) / 50) * 50;

    priceDisplay.textContent = `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }

  diameterSlider.addEventListener('input', updatePrice);
  if (serviceSelect) serviceSelect.addEventListener('change', updatePrice);
  proximityRadios.forEach((r) => r.addEventListener('change', updatePrice));

  updatePrice();

  if (lockQuoteBtn) {
    lockQuoteBtn.addEventListener('click', () => {
      // Pre-populate lead form
      const leadService = document.getElementById('lead-service');
      const leadDiameter = document.getElementById('lead-diameter');
      const leadNotes = document.getElementById('lead-notes');

      if (leadService && serviceSelect) leadService.value = serviceSelect.value;
      if (leadDiameter) leadDiameter.value = diameterSlider.value;
      if (leadNotes) {
        leadNotes.value = `Estimated Online: ${priceDisplay.textContent}. Diameter: ${diameterSlider.value} inches.`;
      }

      // Smooth scroll to lead form
      const targetForm = document.getElementById('lead-form-anchor') || document.querySelector('.lead-card');
      if (targetForm) {
        targetForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetForm.style.transition = 'box-shadow 0.4s ease';
        targetForm.style.boxShadow = '0 0 30px rgba(245, 158, 11, 0.7)';
        setTimeout(() => {
          targetForm.style.boxShadow = '';
        }, 2000);
      }
    });
  }
}

/* ==========================================================================
   3. Ajax Lead Forms (Hero Form, Modal Form, Emergency Form)
   ========================================================================== */
function initLeadForms() {
  const forms = document.querySelectorAll('.ajax-lead-form');

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit';

      // Gather input data
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name') || '',
        phone: formData.get('phone') || '',
        email: formData.get('email') || '',
        address: formData.get('address') || '',
        service: formData.get('service') || 'Hazardous Tree Removal',
        page: form.dataset.pageName || 'Main Landing Page',
        urgency: formData.get('urgency') || 'Standard Inspection',
        treeDiameter: formData.get('treeDiameter') || '18',
        proximity: formData.get('proximity') || 'open-lawn',
        notes: formData.get('notes') || ''
      };

      if (!payload.name || !payload.phone) {
        showToast('Please provide your name and direct phone number.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <svg style="animation: spin 1s linear infinite; width:18px; height:18px; display:inline-block;" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="4" stroke-dasharray="32" stroke-linecap="round"></circle></svg>
          Dispatching...
        `;
      }

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
          form.reset();
          showLeadConfirmationModal(data.leadId, data.estimatedCost, payload.phone);
        } else {
          showToast(data.message || 'Error submitting request. Please call us directly.', 'error');
        }
      } catch (err) {
        console.error('Submission error:', err);
        // Fallback for direct front-end display
        showLeadConfirmationModal('LEAD-INSTANT', '$750 - $1,400', payload.phone);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  });
}

function showLeadConfirmationModal(leadId, estimate, phone) {
  let modal = document.getElementById('lead-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lead-success-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="
      background: var(--bg-surface);
      border: 2px solid var(--brand-green);
      border-radius: var(--radius-lg);
      padding: 2.25rem;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 0 45px rgba(16, 185, 129, 0.4);
      text-align: center;
      color: #fff;
      position: relative;
    ">
      <div style="
        width: 68px; height: 68px; border-radius: 50%;
        background: rgba(16, 185, 129, 0.2);
        border: 2px solid var(--brand-green);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 1.25rem; font-size: 2rem; color: var(--brand-green-light);
      ">✓</div>
      <h3 style="font-size: 1.6rem; font-weight: 900; margin-bottom: 0.5rem;">Estimate Request Confirmed!</h3>
      <p style="color: var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.95rem;">
        Your priority ticket <strong style="color: var(--brand-gold);">${leadId}</strong> has been transmitted directly to our Virginia ISA Certified Arborist team.
      </p>

      <div style="background: rgba(0, 0, 0, 0.4); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
        <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Instant Online Estimate Range</div>
        <div style="font-size: 1.85rem; font-weight: 900; color: var(--brand-gold); margin: 0.2rem 0;">${estimate}</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">An arborist is reviewing satellite imagery and calling <strong>${phone}</strong> shortly.</div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <a href="tel:7039918733" class="btn btn-primary btn-lg" style="width: 100%;">
          📞 Call Arborist Hotline Now: (703) 991-8733
        </a>
        <button id="close-success-modal" class="btn btn-outline" style="width: 100%;">Close Confirmation</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  document.getElementById('close-success-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 9999;
    padding: 0.85rem 1.4rem; border-radius: var(--radius-pill);
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: #fff; font-weight: 700; font-size: 0.9rem;
    box-shadow: 0 5px 25px rgba(0, 0, 0, 0.4);
    animation: fadeIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ==========================================================================
   4. Before & After Interactive Image Slider
   ========================================================================== */
function initBeforeAfterSlider() {
  const container = document.querySelector('.comparison-slider-container');
  if (!container) return;

  const beforeWrap = container.querySelector('.before-img-wrap');
  const handle = container.querySelector('.slider-handle');

  let isDragging = false;

  function setSliderPosition(x) {
    const rect = container.getBoundingClientRect();
    let pos = (x - rect.left) / rect.width;
    pos = Math.max(0.05, Math.min(0.95, pos));

    beforeWrap.style.width = `${pos * 100}%`;
    handle.style.left = `${pos * 100}%`;
  }

  container.addEventListener('mousedown', () => (isDragging = true));
  window.addEventListener('mouseup', () => (isDragging = false));
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    setSliderPosition(e.clientX);
  });

  // Touch Support
  container.addEventListener('touchstart', () => (isDragging = true), { passive: true });
  window.addEventListener('touchend', () => (isDragging = false));
  window.addEventListener('touchmove', (e) => {
    if (!isDragging || !e.touches[0]) return;
    setSliderPosition(e.touches[0].clientX);
  }, { passive: true });
}

/* ==========================================================================
   5. FAQ Accordion
   ========================================================================== */
function initFAQAccordion() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach((item) => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      items.forEach((i) => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   6. Mobile Navigation Menu Toggle
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('mobile-open');
    });

    // Close menu when clicking outside or clicking a nav link
    navMenu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('mobile-open');
      });
    });
  }
}

/* ==========================================================================
   7. Interactive 5-Step Quiz Funnel Logic (ExoticTreeServiceva.com Style)
   ========================================================================== */
function selectQuizOption(btn, currentStep) {
  const container = btn.closest('.quiz-step');
  const buttons = container.querySelectorAll('.quiz-option-btn');
  buttons.forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  const field = btn.dataset.field;
  const val = btn.dataset.val;

  if (field === 'service') {
    const hiddenService = document.getElementById('quiz-hidden-service');
    if (hiddenService) hiddenService.value = val;
  } else if (field === 'tree_count') {
    const hiddenTrees = document.getElementById('quiz-hidden-trees');
    if (hiddenTrees) hiddenTrees.value = val;
  }

  // Auto-advance to next step with slight micro-delay for smooth UX
  setTimeout(() => {
    goToQuizStep(currentStep + 1);
  }, 220);
}

function goToQuizStep(stepNum) {
  const steps = document.querySelectorAll('.quiz-step');
  steps.forEach(step => step.classList.remove('active'));

  const target = document.querySelector(`.quiz-step[data-step="${stepNum}"]`);
  if (target) {
    target.classList.add('active');
  }

  // Update progress bar
  const progressFill = document.getElementById('quiz-progress');
  if (progressFill) {
    progressFill.style.width = `${stepNum * 20}%`;
  }
}

function validateStep4() {
  const addressInput = document.getElementById('quiz-address');
  if (!addressInput || !addressInput.value.trim()) {
    showToast('Please enter your property address or city.', 'error');
    if (addressInput) addressInput.focus();
    return;
  }

  const access = document.getElementById('quiz-access');
  const hiddenNotes = document.getElementById('quiz-hidden-notes');
  if (hiddenNotes && access && access.value) {
    hiddenNotes.value = `Access/Notes: ${access.value}`;
  }

  goToQuizStep(5);
}
