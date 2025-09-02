// src/components/features/AdminConsole.js
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminConsole.css";

const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

const TABS = [
  { key: "feedback", label: "Feedback" },
  { key: "bugs", label: "Bug Reports" },
];

const FEEDBACK_STATUSES = ["open", "in_progress", "resolved", "closed"];
const BUG_STATUSES = ["open", "triaged", "in_progress", "fixed", "closed"];

export default function AdminConsole() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("feedback");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Route-scoped background
  useEffect(() => {
    document.body.classList.add("admin-bg");
    return () => document.body.classList.remove("admin-bg");
  }, []);

  const endpoint = useMemo(
    () => (tab === "feedback" ? "/api/admin/feedback" : "/api/admin/bugs"),
    [tab]
  );
  const statusOptions = tab === "feedback" ? FEEDBACK_STATUSES : BUG_STATUSES;

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  const fetchList = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`${API_BASE}${endpoint}?${params.toString()}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
      }

      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number.isFinite(data.total) ? data.total : 0);
      setLimit(Number.isFinite(data.limit) ? data.limit : 20);
      setOffset(Number.isFinite(data.offset) ? data.offset : 0);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (rowId, newStatus) => {
    const putEndpoint =
      tab === "feedback"
        ? `/api/admin/feedback/${rowId}/status`
        : `/api/admin/bugs/${rowId}/status`;

    try {
      const res = await fetch(`${API_BASE}${putEndpoint}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
      }

      setItems((cur) =>
        cur.map((r) => (r.id === rowId ? { ...r, status: newStatus } : r))
      );
    } catch (e) {
      alert(e?.message || "Could not update status");
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, limit, offset]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    // clear any other stored auth bits if you have them
    navigate("/auth", { replace: true });
  };

  return (
    <div className="admin-wrap">
      <header className="admin-head glass sticky">
        <div className="head-left">
          <h1 className="admin-title">Admin Console</h1>
          <nav className="admin-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`tab-btn ${tab === t.key ? "active" : ""}`}
                onClick={() => {
                  setTab(t.key);
                  setStatus("");
                  setQ("");
                  setOffset(0);
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="head-actions">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          fetchList();
        }}
        className="admin-filters glass sticky"
      >
        <input
          className="admin-input"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="admin-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="admin-btn" type="submit">
          {loading ? "Loading..." : "Apply"}
        </button>
      </form>

      {err && <div className="admin-error">⚠ {err}</div>}

      <div className={`admin-card ${tab === "feedback" ? "is-feedback" : ""}`}>
        <div className="thead">
          {tab === "feedback" ? (
            <>
              <div>User</div>
              <div>Message</div>
              <div>Status</div>
              <div>Created</div>
            </>
          ) : (
            <>
              <div>User</div>
              <div>Title/Description</div>
              <div>Severity</div>
              <div>Status</div>
              <div>Created</div>
            </>
          )}
        </div>

        <div className="tbody">
          {items.length === 0 && !loading && (
            <div className="tr muted" style={{ padding: "16px" }}>
              No items found.
            </div>
          )}

          {items.map((row) =>
            tab === "feedback" ? (
              <div className="tr" key={row.id}>
                <div>{[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}</div>
                <div>{row.message}</div>
                <div>
                  <select
                    value={row.status}
                    onChange={(e) => updateStatus(row.id, e.target.value)}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
              </div>
            ) : (
              <div className="tr" key={row.id}>
                <div>{[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}</div>
                <div>
                  <strong>{row.title}</strong>
                  <p className="muted" style={{ marginTop: 4 }}>{row.description}</p>
                </div>
                <div>{row.severity}</div>
                <div>
                  <select
                    value={row.status}
                    onChange={(e) => updateStatus(row.id, e.target.value)}
                  >
                    {BUG_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="admin-pager">
        <button
          className="admin-btn ghost"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={page <= 1 || loading}
        >
          ◀ Prev
        </button>
        <span className="muted">
          Page {page} / {pages}
        </span>
        <button
          className="admin-btn ghost"
          onClick={() => setOffset(offset + limit)}
          disabled={page >= pages || loading}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}
