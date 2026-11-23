import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import {
  MapContainer, TileLayer, useMap
} from "react-leaflet";

import {
  AlertTriangle, Crosshair, Layers3, LoaderCircle,
  MapPin, RefreshCw, X
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const tierClass = (tier) => {
  if (String(tier).startsWith("P1")) return "p1";
  if (String(tier).startsWith("P2")) return "p2";
  return "p3";
};

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);


function FitMapToPoints({ points, selectedState }) {
  const map = useMap();

  useEffect(() => {
    if (!points?.length) return;

    const locations = points
      .map((point) => [
        Number(point.Latitude),
        Number(point.Longitude)
      ])
      .filter(([lat, lng]) =>
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
      );

    if (!locations.length) return;

    if (locations.length === 1) {
      map.setView(locations[0], 9, { animate: false });
      return;
    }

    const bounds = L.latLngBounds(locations);

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: selectedState ? 8 : 5,
        animate: false
      });
    }
  }, [map, points, selectedState]);

  return null;
}



function MapMarkers({ points, onSelect }) {
  const map = useMap();
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const clusters = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 150,
      chunkDelay: 35,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: false,
      removeOutsideVisibleBounds: true,

      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? "small" : count < 100 ? "medium" : "large";

        return L.divIcon({
          html: `<div class="cluster-bubble ${size}"><span>${number(count)}</span></div>`,
          className: "cluster-icon-wrapper",
          iconSize: [42, 42],
          iconAnchor: [21, 21]
        });
      }
    });

    for (const group of points || []) {
      const lat = Number(group.Latitude);
      const lng = Number(group.Longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 || lat > 90 ||
        lng < -180 || lng > 180
      ) {
        continue;
      }

      const members = Array.isArray(group.members) ? group.members : [];
      const locationCount = Number(group.location_count || members.length || 1);

      const tier = String(group.Priority_tier || "")
        .split(" — ")[0]
        .toLowerCase();

      const markerIcon = L.divIcon({
        html: `
          <div class="coordinate-marker ${tier} ${group.has_state_conflict ? "conflict" : ""}">
            <span>${number(locationCount)}</span>
          </div>
        `,
        className: "coordinate-marker-wrapper",
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([lat, lng], {
        icon: markerIcon,
        title: `${number(locationCount)} site location(s)`
      });

      const stateLabel = Array.isArray(group.states) && group.states.length
        ? group.states.join(", ")
        : String(group.State || "Unknown state");

      const districtLabel = Array.isArray(group.districts) && group.districts.length
        ? group.districts.join(", ")
        : String(group.District || "Unknown district");

      const counts = group.priority_counts || {};

      const prioritySummary = `
        <div class="map-popup-priorities">
          <span>P1: ${number(counts.P1)}</span>
          <span>P2: ${number(counts.P2)}</span>
          <span>P3: ${number(counts.P3)}</span>
        </div>
      `;

      const memberButtons = members.map((member, index) => {
        const siteId = String(member._spatial_group_id || "");
        const siteParts = siteId.split("|");
        const station = siteParts[2] || `Site ${index + 1}`;

        const memberTier = String(member.Priority_tier || "")
          .split(" — ")[0];

        const rankText = member.Priority_rank == null
          ? "Unranked"
          : `Rank #${number(member.Priority_rank)}`;

        const sourceState = String(member.State || "");
        const mapState = String(member.Map_state || group.State || "");

        const stateDescription = sourceState.toLowerCase() !== mapState.toLowerCase()
          ? `Source: ${sourceState} → Map: ${mapState}`
          : `Map: ${mapState}`;

        return `
          <button
            type="button"
            class="map-popup-member"
            data-site-id="${escapeHTML(siteId)}"
          >
            <span>${escapeHTML(station)}</span>
            <small>
              ${escapeHTML(String(member.District || districtLabel))}
              · ${escapeHTML(memberTier)}
              · ${escapeHTML(rankText)}
              · ${escapeHTML(stateDescription)}
            </small>
          </button>
        `;
      }).join("");

      const conflictWarning = group.has_metadata_conflict
        ? `<div class="map-popup-conflict">Source state metadata differs from the map location for one or more sites. Original CGWB metadata is preserved.</div>`
        : group.has_state_conflict
          ? `<div class="map-popup-conflict">Multiple map states share this coordinate.</div>`
          : "";

      const popup = `
        <div class="map-popup coordinate-group-popup">
          <div class="map-popup-title">
            ${number(locationCount)} site${locationCount === 1 ? "" : "s"} at this coordinate
          </div>

          <div class="map-popup-subtitle">
            ${escapeHTML(districtLabel)}
          </div>

          <div class="map-popup-subtitle">
            ${escapeHTML(stateLabel)}
          </div>

          ${conflictWarning}

          ${prioritySummary}

          <div class="map-popup-member-heading">
            SELECT AN INDIVIDUAL SITE
          </div>

          <div class="map-popup-members">
            ${memberButtons || '<div class="map-popup-empty">No individual site records returned.</div>'}
          </div>
        </div>
      `;

      marker.bindPopup(popup, {
        maxWidth: 320,
        maxHeight: 300,
        closeButton: true
      });

      // Bind once per popup element. Selecting a member opens its
      // existing site profile through the original selection callback.
      marker.on("popupopen", (popupEvent) => {
        const popupElement = popupEvent.popup.getElement();

        if (
          !popupElement ||
          popupElement.dataset.siteSelectionBound === "true"
        ) {
          return;
        }

        popupElement.dataset.siteSelectionBound = "true";

        popupElement.addEventListener("click", (event) => {
          const button = event.target.closest("[data-site-id]");

          if (!button) return;

          const siteId = button.getAttribute("data-site-id");

          if (siteId) {
            selectRef.current?.(siteId);
            map.closePopup();
          }
        });
      });

      clusters.addLayer(marker);
    }

    map.addLayer(clusters);

    return () => {
      map.removeLayer(clusters);
    };
  }, [map, points]);

  return null;
}


function MapLegend() {
  return (
    <div className="map-legend">
      <div className="map-legend-title">TESTING PRIORITY</div>
      <div><span className="legend-dot p1" /> P1 — Highest 10%</div>
      <div><span className="legend-dot p2" /> P2 — Next 15%</div>
      <div><span className="legend-dot p3" /> P3 — Remaining</div>
    </div>
  );
}

function SiteProfile({ detail, loading, onClose }) {
  if (loading) {
    return (
      <div className="map-profile-loading">
        <LoaderCircle className="map-spin" size={19} />
        Loading location profile...
      </div>
    );
  }

  if (!detail) return null;

  const site = detail.site;
  const actions = detail.actions;

  return (
    <div className="map-profile">
      <div className="map-profile-heading">
        <div>
          <div className="map-section-eyebrow">SELECTED LOCATION</div>
          <h3>{site.District}, {site.State}</h3>
          <div className="map-profile-id">{site._spatial_group_id}</div>
        </div>
        <button className="icon-button" onClick={onClose} title="Close profile">
          <X size={17} />
        </button>
      </div>

      <div className="map-profile-metrics">
        <div>
          <span>Priority rank</span>
          <strong>#{number(site.Priority_rank)}</strong>
        </div>
        <div>
          <span>Priority score</span>
          <strong>{Number(site.Testing_priority_score || 0).toFixed(2)}</strong>
        </div>
        <div>
          <span>Historical records</span>
          <strong>{number(site.Total_records)}</strong>
        </div>
        <div>
          <span>Distinct years</span>
          <strong>{number(site.Distinct_years)}</strong>
        </div>
      </div>

      <div className="map-profile-subheading">TESTING RECOMMENDATIONS</div>

      <div className="map-action-grid">
        <div><span>Baseline</span><strong>{number(actions?.Baseline_test_count)}</strong></div>
        <div><span>Targeted retest</span><strong>{number(actions?.Targeted_retest_count)}</strong></div>
        <div><span>Overdue</span><strong>{number(actions?.Overdue_retest_count)}</strong></div>
        <div><span>Routine due</span><strong>{number(actions?.Routine_retest_due_count)}</strong></div>
      </div>

      <div className="map-profile-subheading">PARAMETER ACTIONS</div>

      <div className="map-parameter-list">
        {(detail.parameter_actions || []).map((item, index) => (
          <div className="map-parameter-row" key={`${item.Parameter}-${index}`}>
            <span>{item.Parameter}</span>
            <strong>{item.Testing_recommendation}</strong>
          </div>
        ))}
      </div>

      <div className="map-profile-warning">
        <AlertTriangle size={15} />
        Testing priority is not a water-safety classification. Laboratory testing is required.
      </div>
    </div>
  );
}

export default function MapExplorer() {
  const [mapData, setMapData] = useState(null);
  const [states, setStates] = useState([]);
  const [state, setState] = useState("");
  const [tier, setTier] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (state) params.set("state", state);
      if (tier !== "ALL") params.set("tier", tier);

      const suffix = params.toString()
        ? `?${params.toString()}`
        : "";

      const [mapResponse, statesResponse] = await Promise.all([
        fetch(`${API}/api/v1/map/coordinate-groups${suffix}`),
        fetch(`${API}/api/v1/dashboard/states?limit=40`)
      ]);

      if (!mapResponse.ok) {
        throw new Error(`Map endpoint returned ${mapResponse.status}`);
      }

      if (!statesResponse.ok) {
        throw new Error(`State endpoint returned ${statesResponse.status}`);
      }

      const mapJson = await mapResponse.json();
      const statesJson = await statesResponse.json();

      setMapData(mapJson);
      setStates((statesJson.states || []).map((item) => item.State).sort());

      setSelectedId(null);
      setDetail(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to load map data.");
    } finally {
      setLoading(false);
    }
  }, [state, tier]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const openSite = useCallback(async (siteId) => {
    setSelectedId(siteId);
    setDetail(null);
    setDetailLoading(true);

    try {
      const response = await fetch(
        `${API}/api/v1/sites/${encodeURIComponent(siteId)}`
      );

      if (!response.ok) {
        throw new Error("Could not retrieve this location profile.");
      }

      setDetail(await response.json());
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const summaryLabel = useMemo(() => {
    if (!mapData) return "Loading map data";

    return `${number(mapData.mapped_locations)} mapped locations`;
  }, [mapData]);

  return (
    <div className="page-content map-page">
      <div className="section-title">
        <div>
          <div className="eyebrow">GEOGRAPHIC INTELLIGENCE</div>
          <h2>India groundwater map</h2>
          <p>
            Explore provisional spatial groups and their testing-priority distribution.
          </p>
        </div>

        <button
          className="secondary-button map-refresh"
          onClick={loadMap}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "map-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="map-warning">
        <AlertTriangle size={16} />
        Coordinates represent provisional source locations. Administrative boundaries
        and station identities have not been independently verified for every point.
      </div>

      <div className="map-filters">
        <label>
          <span>STATE</span>
          <select
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">All states</option>
            {states.map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span>PRIORITY TIER</span>
          <select
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            <option value="ALL">All tiers</option>
            <option value="P1">P1 — Highest 10%</option>
            <option value="P2">P2 — Next 15%</option>
            <option value="P3">P3 — Remaining</option>
          </select>
        </label>

        <div className="map-filter-summary">
          <Layers3 size={16} />
          {summaryLabel}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <div className="map-status-row">
        <span>
          {number(mapData?.filtered_locations)} locations in current filter
        </span>
        <span>
          {number(mapData?.excluded_invalid_coordinates)} excluded for missing or invalid coordinates
        </span>
      </div>

      <div className="map-container">
        <MapContainer
          center={[22.0, 79.0]}
          zoom={5}
          minZoom={4}
          maxZoom={17}
          scrollWheelZoom={true}
          maxBounds={[[5, 66], [38, 100]]}
          maxBoundsViscosity={0.8}
          preferCanvas={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <FitMapToPoints
            points={mapData?.groups || []}
            selectedState={state}
          />


          {mapData?.groups && (
            <MapMarkers
              points={mapData.groups}
              onSelect={openSite}
            />
          )}
        </MapContainer>

        <MapLegend />

        {loading && (
          <div className="map-loading-overlay">
            <LoaderCircle size={23} className="map-spin" />
            Preparing geographic markers...
          </div>
        )}

        {!loading && !error && !mapData?.mapped_locations && (
          <div className="map-empty-overlay">
            No geocoded locations match these filters.
          </div>
        )}
      </div>

      <div className="map-source-note">
        <span><MapPin size={13} /> Source: BoreWell Sentinel India processed location register</span>
        <span>Map tiles: OpenStreetMap contributors</span>
      </div>

      {selectedId && (
        <SiteProfile
          detail={detail}
          loading={detailLoading}
          onClose={() => {
            setSelectedId(null);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}
