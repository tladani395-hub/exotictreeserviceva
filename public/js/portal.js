/**
 * Exotic Tree Service VA — Portal JavaScript Controller
 * Manages CRM, real-time lead updates, crew assignments, and CSV exports.
 */

let allLeads = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  fetchPortalStats();
  fetchLeads();
  initPortalEventListeners();
});

// 1. Fetch Stats from API
async function fetchPortalStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      document.getElementById('stat-total').textContent = data.stats.totalLeads;
      document.getElementById('stat-urgent').textContent = data.stats.urgentEmergencies;
      document.getElementById('stat-active').textContent = data.stats.activeJobs;
    }
  } catch (err) {
    console.warn('Could not fetch stats from API:', err);
  }
}

// 2. Fetch Leads from API
async function fetchLeads() {
  const tbody = document.getElementById('leads-tbody');
  try {
    const res = await fetch('/api/leads');
    const data = await res.json();

    if (data.success && Array.isArray(data.leads)) {
      allLeads = data.leads;
      renderLeads();
    } else {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;">No leads found.</td></tr>`;
    }
  } catch (err) {
    console.error('Error fetching leads:', err);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444; padding: 2rem;">API connection error. Ensure server is running.</td></tr>`;
  }
}

// 3. Render Leads with Filtering & Search
function renderLeads() {
  const tbody = document.getElementById('leads-tbody');
  const searchVal = (document.getElementById('portal-search').value || '').toLowerCase();

  let filtered = allLeads.filter((lead) => {
    // Status filter
    if (currentFilter === 'urgent') {
      const isUrgent =
        (lead.urgency && lead.urgency.toLowerCase().includes('immediate')) ||
        lead.status === 'Urgent Alert' ||
        (lead.service && lead.service.toLowerCase().includes('emergency'));
      if (!isUrgent) return false;
    } else if (currentFilter === 'new') {
      if (lead.status !== 'New') return false;
    } else if (currentFilter === 'dispatched') {
      if (lead.status !== 'Dispatched' && lead.status !== 'Scheduled') return false;
    } else if (currentFilter === 'completed') {
      if (lead.status !== 'Completed') return false;
    }

    // Search query filter
    if (searchVal) {
      const match =
        lead.name.toLowerCase().includes(searchVal) ||
        lead.phone.toLowerCase().includes(searchVal) ||
        lead.address.toLowerCase().includes(searchVal) ||
        lead.id.toLowerCase().includes(searchVal);
      if (!match) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No records match the current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((lead) => {
      const dateStr = new Date(lead.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let statusClass = 'status-new';
      if (lead.status === 'Urgent Alert') statusClass = 'status-urgent';
      else if (lead.status === 'Quoted') statusClass = 'status-quoted';
      else if (lead.status === 'Dispatched') statusClass = 'status-dispatched';
      else if (lead.status === 'Completed') statusClass = 'status-completed';

      return `
      <tr>
        <td>
          <strong style="color: var(--brand-gold);">${lead.id}</strong><br>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span><br>
          <span style="font-size: 0.72rem; color: var(--brand-green-light);">${lead.page || 'Website'}</span>
        </td>
        <td>
          <strong>${escapeHtml(lead.name)}</strong><br>
          <a href="tel:${escapeHtml(lead.phone)}" style="color: var(--brand-gold); font-weight: 700; text-decoration: underline;">
            📞 ${escapeHtml(lead.phone)}
          </a><br>
          <span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(lead.email || 'N/A')}</span>
        </td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(lead.service)}</div>
          <div style="font-size: 0.78rem; color: ${lead.urgency && lead.urgency.includes('Immediate') ? '#f87171; font-weight: 800;' : 'var(--text-muted);'}">
            ${escapeHtml(lead.urgency || 'Standard')}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
            Trunk: ${escapeHtml(lead.treeDiameter || 'N/A')}
          </div>
        </td>
        <td>
          <span style="font-size: 0.85rem;">${escapeHtml(lead.address)}</span>
        </td>
        <td>
          <span style="font-weight: 800; color: var(--brand-gold);">${escapeHtml(lead.estimatedCost || '$500 - $1,200')}</span>
        </td>
        <td>
          <select onchange="updateLeadStatus('${lead.id}', this.value)" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.78rem; width: auto; font-weight: 700;">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Urgent Alert" ${lead.status === 'Urgent Alert' ? 'selected' : ''}>🚨 Urgent Alert</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Quoted" ${lead.status === 'Quoted' ? 'selected' : ''}>Quoted</option>
            <option value="Dispatched" ${lead.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
            <option value="Completed" ${lead.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
        <td>
          <select onchange="updateLeadCrew('${lead.id}', this.value)" class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.78rem; width: auto;">
            <option value="Unassigned" ${lead.crew === 'Unassigned' ? 'selected' : ''}>Unassigned</option>
            <option value="Crew Alpha (Crane-1)" ${lead.crew && lead.crew.includes('Crew Alpha') ? 'selected' : ''}>Crew Alpha (Crane-1)</option>
            <option value="Crew Bravo (Trimming)" ${lead.crew && lead.crew.includes('Crew Bravo') ? 'selected' : ''}>Crew Bravo (Trimming)</option>
            <option value="Estimator Dave" ${lead.crew && lead.crew.includes('Dave') ? 'selected' : ''}>Estimator Dave</option>
            <option value="Stump Unit #2" ${lead.crew && lead.crew.includes('Stump') ? 'selected' : ''}>Stump Unit #2</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <a href="tel:${escapeHtml(lead.phone)}" class="btn btn-green btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" title="Call Customer">
              📞 Call
            </a>
            <button onclick="showLeadNotes('${lead.id}')" class="btn btn-outline btn-sm" style="padding: 0.3rem 0.6rem; font-size: 0.75rem;" title="View Notes">
              📝 Notes
            </button>
          </div>
        </td>
      </tr>
      `;
    })
    .join('');
}

// 4. Update Status Handler
async function updateLeadStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      const idx = allLeads.findIndex((l) => l.id === id);
      if (idx !== -1) allLeads[idx].status = newStatus;
      fetchPortalStats();
    }
  } catch (err) {
    console.error('Update status failed:', err);
  }
}

// 5. Update Crew Handler
async function updateLeadCrew(id, newCrew) {
  try {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crew: newCrew })
    });
    const idx = allLeads.findIndex((l) => l.id === id);
    if (idx !== -1) allLeads[idx].crew = newCrew;
  } catch (err) {
    console.error('Update crew failed:', err);
  }
}

// 6. View Notes Modal
function showLeadNotes(id) {
  const lead = allLeads.find((l) => l.id === id);
  if (!lead) return;

  alert(`[Ticket Notes for ${lead.id} - ${lead.name}]\n\nNotes:\n${lead.notes || 'No notes'}\n\nAddress:\n${lead.address}\n\nEst. Cost:\n${lead.estimatedCost}`);
}

// 7. Event Listeners for Filters, Search, CSV Export, and Intake Modal
function initPortalEventListeners() {
  // Filter tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderLeads();
    });
  });

  // Search input
  const searchInput = document.getElementById('portal-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderLeads());
  }

  // Refresh button
  const refreshBtn = document.getElementById('btn-refresh-leads');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      fetchPortalStats();
      fetchLeads();
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportLeadsCSV);
  }

  // Phone Intake Modal
  const openIntakeBtn = document.getElementById('btn-open-intake');
  const closeIntakeBtn = document.getElementById('btn-close-intake');
  const intakeModal = document.getElementById('intake-modal');
  const intakeForm = document.getElementById('intake-form');

  if (openIntakeBtn && intakeModal) {
    openIntakeBtn.addEventListener('click', () => (intakeModal.style.display = 'flex'));
  }
  if (closeIntakeBtn && intakeModal) {
    closeIntakeBtn.addEventListener('click', () => (intakeModal.style.display = 'none'));
  }

  if (intakeForm) {
    intakeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('intake-name').value,
        phone: document.getElementById('intake-phone').value,
        email: document.getElementById('intake-email').value,
        address: document.getElementById('intake-address').value,
        service: document.getElementById('intake-service').value,
        urgency: document.getElementById('intake-urgency').value,
        notes: document.getElementById('intake-notes').value,
        page: 'Office Phone Intake'
      };

      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          intakeForm.reset();
          intakeModal.style.display = 'none';
          fetchPortalStats();
          fetchLeads();
        }
      } catch (err) {
        console.error('Error logging intake lead:', err);
      }
    });
  }
}

// 8. CSV Export for Excel / QuickBooks
function exportLeadsCSV() {
  if (allLeads.length === 0) {
    alert('No leads available to export.');
    return;
  }

  const headers = ['Lead ID', 'Date', 'Name', 'Phone', 'Email', 'Address', 'Service', 'Urgency', 'Est Cost', 'Status', 'Crew', 'Notes'];
  const rows = allLeads.map((l) => [
    `"${l.id}"`,
    `"${l.date}"`,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.phone || '').replace(/"/g, '""')}"`,
    `"${(l.email || '').replace(/"/g, '""')}"`,
    `"${(l.address || '').replace(/"/g, '""')}"`,
    `"${(l.service || '').replace(/"/g, '""')}"`,
    `"${(l.urgency || '').replace(/"/g, '""')}"`,
    `"${(l.estimatedCost || '').replace(/"/g, '""')}"`,
    `"${(l.status || '').replace(/"/g, '""')}"`,
    `"${(l.crew || '').replace(/"/g, '""')}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ExoticTreeServiceVA_Leads_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
