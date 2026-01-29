async function loadAudits() {
  const data = await API.request("/admin/audits");
  const tbody = document.querySelector("#audit-table tbody");
  tbody.innerHTML = "";

  data.forEach(audit => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${audit.user_id}</td>
      <td>${audit.victory}</td>
      <td>${audit.defeat}</td>
      <td>${new Date(audit.updated_at).toLocaleString()}</td>
      <td>
        <button class="btn btn-danger" onclick="deleteAudit(${audit.user_id})">
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteAudit(userId) {
  if (!confirm("Are you sure you want to delete this audit?")) return;
  await API.request(`/admin/audit/${userId}`, { method: "DELETE" });
  loadAudits();
}

// Load audits on page load
loadAudits();

// Example: Load stats (dummy)
document.getElementById("total-users").textContent = 123;
document.getElementById("total-recovery").textContent = 456;
document.getElementById("total-audits").textContent = 78;
