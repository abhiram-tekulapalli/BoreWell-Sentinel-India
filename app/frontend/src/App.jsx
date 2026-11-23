import React, { useCallback, useEffect, useState } from "react";

import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Database,
  Droplets, FlaskConical, Gauge, Layers3, MapPin,
  RefreshCw, Search, ShieldAlert, SlidersHorizontal,
  Waves, X
} from "lucide-react";

import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";

import MapExplorer from "./MapExplorer";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const request = async (path) => {
  const response = await fetch(`${API}${path}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error ${response.status}`);
  }

  return response.json();
};

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });

const shortNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));

const tierColor = (tier) => {
  if (String(tier).startsWith("P1")) return "red";
  if (String(tier).startsWith("P2")) return "amber";
  return "green";
};

function TierBadge({ tier }) {
  return (
    <span className={`tier-badge ${tierColor(tier)}`}>
      {String(tier || "Unranked").split(" — ")[0]}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, detail, tone = "blue" }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <Database size={26} />
      <span>{message}</span>
    </div>
  );
}

function Overview({ summary, states, sites, onOpenSite, onNavigate }) {
  const tierData = [
    { name: "P1", locations: summary?.priority_tiers?.P1 || 0, fill: "#d65c5c" },
    { name: "P2", locations: summary?.priority_tiers?.P2 || 0, fill: "#d69b42" },
    { name: "P3", locations: summary?.priority_tiers?.P3 || 0, fill: "#3c9b80" }
  ];

  return (
    <div className="page-content">
      <div className="hero-panel">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="live-dot" /> GROUNDWATER INTELLIGENCE PLATFORM
          </div>
          <h1>Understand the water.<br /><span>Prioritize what matters.</span></h1>
          <p>
            Explore groundwater chemistry, historical monitoring,
            and location-level testing recommendations across India.
          </p>
          <button className="hero-button" onClick={() => onNavigate("sites")}>
            Explore locations <ArrowRight size={16} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="water-symbol"><Droplets size={76} strokeWidth={1.1} /></div>
          <div className="hero-coordinate">INDIA / GROUNDWATER</div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          icon={MapPin}
          label="PROVISIONAL LOCATIONS"
          value={number(summary?.total_locations)}
          detail="Spatial groups evaluated"
          tone="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="P1 TESTING PRIORITY"
          value={number(summary?.priority_tiers?.P1)}
          detail="Highest priority tier"
          tone="red"
        />
        <StatCard
          icon={FlaskConical}
          label="TRACE ALERT LOCATIONS"
          value={number(summary?.trace_alert_locations)}
          detail="Separate review register"
          tone="amber"
        />
        <StatCard
          icon={Activity}
          label="PARAMETER ACTIONS"
          value={shortNumber(summary?.total_parameter_action_records)}
          detail="Eight actions per location"
          tone="green"
        />
      </div>

      <div className="chart-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">LOCATION DISTRIBUTION</div>
              <h3>Testing priority tiers</h3>
            </div>
            <Layers3 size={19} className="muted-icon" />
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tierData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#edf0f3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={shortNumber} />
                <Tooltip formatter={(v) => number(v)} />
                <Bar dataKey="locations" radius={[7, 7, 0, 0]} barSize={48}>
                  {tierData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">
            Percentile-based testing-priority groups; not water-safety classifications.
          </div>
        </div>

        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">SAMPLING COVERAGE</div>
              <h3>Locations by state</h3>
            </div>
            <Waves size={19} className="muted-icon" />
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(states || []).slice(0, 8)}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 12, bottom: 2 }}
              >
                <CartesianGrid stroke="#edf0f3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="State"
                  type="category"
                  width={112}
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                />
                <Tooltip formatter={(v) => number(v)} />
                <Bar dataKey="Locations" fill="#447c91" radius={[0, 5, 5, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">Largest location counts in the priority register.</div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">REQUIRES ATTENTION</div>
            <h3>Highest-ranked locations</h3>
          </div>
          <button className="text-action" onClick={() => onNavigate("sites")}>
            View all locations <ArrowRight size={15} />
          </button>
        </div>
        <SiteTable sites={sites} onOpenSite={onOpenSite} compact />
      </div>
    </div>
  );
}

function SiteTable({ sites, onOpenSite, compact = false }) {
  if (!sites?.length) return <EmptyState message="No locations match this search." />;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>RANK</th>
            <th>LOCATION</th>
            <th>STATE</th>
            <th>PRIORITY SCORE</th>
            <th>TIER</th>
            <th>DRIVER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => (
            <tr key={site._spatial_group_id}>
              <td className="rank-cell">#{number(site.Priority_rank)}</td>
              <td>
                <div className="location-name">{site.District || "District unavailable"}</div>
                <div className="sub-cell">{site._spatial_group_id?.split("|")[2] || "Site"}</div>
              </td>
              <td>{site.State}</td>
              <td className="score-cell">{Number(site.Testing_priority_score || 0).toFixed(2)}</td>
              <td><TierBadge tier={site.Priority_tier} /></td>
              <td className="driver-cell">{String(site.Primary_priority_driver || "—").replaceAll("_", " ")}</td>
              <td>
                <button
                  className="icon-button small"
                  title="Open location"
                  onClick={() => onOpenSite(site._spatial_group_id)}
                >
                  <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SiteDetail({ detail, onClose }) {
  if (!detail) return null;

  const site = detail.site;
  const actions = detail.actions;

  return (
    <div className="detail-panel">
      <div className="detail-heading">
        <div>
          <div className="eyebrow">LOCATION PROFILE</div>
          <h3>{site.District}, {site.State}</h3>
          <div className="sub-cell detail-id">{site._spatial_group_id}</div>
        </div>
        <button className="icon-button" onClick={onClose}><X size={18} /></button>
      </div>

      <div className="detail-stats">
        <div><span>Priority rank</span><strong>#{number(site.Priority_rank)}</strong></div>
        <div><span>Priority score</span><strong>{Number(site.Testing_priority_score || 0).toFixed(2)}</strong></div>
        <div><span>Years observed</span><strong>{number(site.Distinct_years)}</strong></div>
      </div>

      <div className="detail-section">
        <h4>Recommended testing actions</h4>
        <div className="action-grid">
          <div><span>Baseline</span><strong>{number(actions?.Baseline_test_count)}</strong></div>
          <div><span>Targeted retest</span><strong>{number(actions?.Targeted_retest_count)}</strong></div>
          <div><span>Overdue</span><strong>{number(actions?.Overdue_retest_count)}</strong></div>
          <div><span>Routine due</span><strong>{number(actions?.Routine_retest_due_count)}</strong></div>
        </div>
      </div>

      <div className="detail-section">
        <h4>Parameter-specific recommendations</h4>
        <div className="recommendation-list">
          {(detail.parameter_actions || []).map((item, index) => (
            <div className="recommendation-row" key={`${item.Parameter}-${index}`}>
              <div>
                <div className="recommendation-name">{item.Parameter}</div>
                <div className="sub-cell">{item.Testing_reason || "Review available measurements"}</div>
              </div>
              <span className="recommendation-type">{item.Testing_recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="notice">
        <AlertTriangle size={16} />
        This is a testing-priority recommendation, not a laboratory-confirmed water-quality verdict.
      </div>
    </div>
  );
}

function SiteExplorer({ sites, total, loading, filters, setFilters, onSearch, onOpenSite, page, setPage, pageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page-content">
      <SectionTitle
        eyebrow="LOCATION INTELLIGENCE"
        title="Site explorer"
        description="Search provisional spatial groups and inspect their testing priorities."
      />

      <form className="filter-panel" onSubmit={(e) => { e.preventDefault(); onSearch(0); }}>
        <label className="search-field">
          <Search size={18} />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search state, district or site identifier..."
          />
        </label>
        <select
          value={filters.state}
          onChange={(e) => setFilters({ ...filters, state: e.target.value })}
        >
          <option value="">All states</option>
          {filters.states.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <select
          value={filters.tier}
          onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
        >
          <option value="">All tiers</option>
          <option value="P1 — Highest 10%">P1 — Highest 10%</option>
          <option value="P2 — Next 15%">P2 — Next 15%</option>
          <option value="P3 — Remaining locations">P3 — Remaining</option>
        </select>
        <button className="primary-button" type="submit">
          <Search size={16} /> Search
        </button>
      </form>

      <div className="results-line">
        <span>{number(total)} matching locations</span>
        <span>{loading ? "Loading..." : `Page ${page + 1} of ${pages}`}</span>
      </div>

      <div className="panel table-panel">
        <SiteTable sites={sites} onOpenSite={onOpenSite} />
        <div className="pagination">
          <button
            className="secondary-button"
            disabled={page === 0 || loading}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span>{page + 1} / {pages}</span>
          <button
            className="secondary-button"
            disabled={page + 1 >= pages || loading}
            onClick={() => setPage(page + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TraceAlerts({ alerts, total, loading }) {
  return (
    <div className="page-content">
      <SectionTitle
        eyebrow="SEPARATE REVIEW REGISTER"
        title="Trace-element alerts"
        description="Sparse trace-element observations are shown separately from the main testing-priority score."
      />

      <div className="notice notice-amber">
        <ShieldAlert size={18} />
        These are historical data flags requiring verification. They are not confirmed current contamination findings.
      </div>

      <div className="results-line">
        <span>{number(total)} locations in the trace-alert register</span>
        <span>{loading ? "Loading..." : `Showing ${alerts?.length || 0} records`}</span>
      </div>

      <div className="panel table-panel">
        {alerts?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>LOCATION</th>
                  <th>STATE</th>
                  <th>RANK</th>
                  <th>TIER</th>
                  <th>TRACE PARAMETERS</th>
                  <th>PRIORITY SCORE</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((item) => (
                  <tr key={item._spatial_group_id}>
                    <td>
                      <div className="location-name">{item.District}</div>
                      <div className="sub-cell">{item._spatial_group_id?.split("|")[2]}</div>
                    </td>
                    <td>{item.State}</td>
                    <td>#{number(item.Priority_rank)}</td>
                    <td><TierBadge tier={item.Priority_tier} /></td>
                    <td className="trace-parameters">{item.Sparse_trace_alert_parameters || "Review register"}</td>
                    <td className="score-cell">{Number(item.Testing_priority_score || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No trace alerts are available." />
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("overview");
  const [apiStatus, setApiStatus] = useState("checking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [states, setStates] = useState([]);
  const [overviewSites, setOverviewSites] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteTotal, setSiteTotal] = useState(0);
  const [traceAlerts, setTraceAlerts] = useState([]);
  const [traceTotal, setTraceTotal] = useState(0);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [filters, setFilters] = useState({
    query: "",
    state: "",
    tier: "",
    states: []
  });

  const [page, setPage] = useState(0);
  const pageSize = 12;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [health, summaryData, stateData, siteData, traceData] =
        await Promise.all([
          request("/health"),
          request("/api/v1/dashboard/summary"),
          request("/api/v1/dashboard/states?limit=30"),
          request("/api/v1/sites?limit=8"),
          request("/api/v1/alerts/trace?limit=50")
        ]);

      setApiStatus(health.data_ready ? "online" : "starting");
      setSummary(summaryData);
      setStates(stateData.states || []);
      setOverviewSites(siteData.sites || []);
      setSites(siteData.sites || []);
      setSiteTotal(siteData.total || 0);
      setTraceAlerts(traceData.alerts || []);
      setTraceTotal(traceData.total || 0);
      setFilters((current) => ({
        ...current,
        states: (stateData.states || []).map((item) => item.State)
      }));
    } catch (err) {
      setApiStatus("offline");
      setError("Could not connect to the FastAPI backend. Start the backend and refresh this page.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadSites = async (nextPage = 0) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(nextPage * pageSize)
      });

      if (filters.query.trim()) params.set("query", filters.query.trim());
      if (filters.state) params.set("state", filters.state);
      if (filters.tier) params.set("tier", filters.tier);

      const data = await request(`/api/v1/sites?${params.toString()}`);
      setSites(data.sites || []);
      setSiteTotal(data.total || 0);
      setPage(nextPage);
      setDetail(null);
    } catch (err) {
      setError("Unable to load location results.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openSite = async (siteId) => {
    setDetailLoading(true);
    setDetail(null);

    try {
      const result = await request(`/api/v1/sites/${encodeURIComponent(siteId)}`);
      setDetail(result);
      setView("sites");
    } catch (err) {
      setError("Unable to load location details.");
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const navigate = (nextView) => {
    setView(nextView);
    setDetail(null);

    if (nextView === "sites") {
      setFilters((current) => ({
        ...current,
        query: "",
        state: "",
        tier: ""
      }));
      loadSites(0);
    }
  };

  const navItems = [
    { id: "overview", label: "Overview", icon: Gauge },
    { id: "map", label: "Groundwater map", icon: Layers3 },
    { id: "sites", label: "Site explorer", icon: MapPin },
    { id: "alerts", label: "Trace alerts", icon: ShieldAlert }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Droplets size={22} /></div>
          <div>
            <div className="brand-name">BOREWELL</div>
            <div className="brand-subtitle">SENTINEL INDIA</div>
          </div>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "alerts" && <span className="nav-count">{number(summary?.trace_alert_locations)}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="data-card">
            <div className="data-card-icon"><Database size={17} /></div>
            <div className="data-card-title">Research dataset</div>
            <div className="data-card-value">24,199 locations</div>
            <div className="data-card-note">Provisional spatial groups</div>
          </div>
          <div className="sidebar-version">BOREWELL SENTINEL · v0.1.0</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">BOREWELL SENTINEL <span>/</span> {view.toUpperCase()}</div>
            <div className="topbar-title">
              {view === "overview" ? "Groundwater overview" : view === "map" ? "India groundwater map" : view === "sites" ? "Location intelligence" : "Trace-element review"}
            </div>
          </div>
          <div className="topbar-actions">
            <div className={`api-pill ${apiStatus}`}>
              <span className="status-dot" />
              API {apiStatus}
            </div>
            <button className="icon-button" onClick={loadInitial} title="Refresh data">
              <RefreshCw size={17} />
            </button>
          </div>
        </header>

        {error && <div className="error-banner"><AlertTriangle size={17} />{error}</div>}

        {loading && !summary ? (
          <div className="loading-state"><RefreshCw className="spin" size={22} />Loading groundwater data...</div>
        ) : (
          <>
            {view === "overview" && (
              <Overview
                summary={summary}
                states={states}
                sites={overviewSites}
                onOpenSite={openSite}
                onNavigate={navigate}
              />
            )}

            {view === "map" && (
              <MapExplorer />
            )}

            {view === "sites" && (
              <div className="page-content">
                <SiteExplorer
                  sites={sites}
                  total={siteTotal}
                  loading={loading}
                  filters={filters}
                  setFilters={setFilters}
                  onSearch={loadSites}
                  onOpenSite={openSite}
                  page={page}
                  setPage={loadSites}
                  pageSize={pageSize}
                />
                {detailLoading && (
                  <div className="loading-state compact"><RefreshCw className="spin" size={18} />Loading location...</div>
                )}
                {detail && (
                  <SiteDetail detail={detail} onClose={() => setDetail(null)} />
                )}
              </div>
            )}

            {view === "alerts" && (
              <TraceAlerts
                alerts={traceAlerts}
                total={traceTotal}
                loading={loading}
              />
            )}
          </>
        )}

        <footer className="app-footer">
          <span>BOREWELL SENTINEL INDIA</span>
          <span>Research prototype · Predictions are not laboratory results</span>
        </footer>
      </main>
    </div>
  );
}
