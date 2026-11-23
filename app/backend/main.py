from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.config import APP_VERSION
from backend.services.data_service import (
    load_app_data,
    records_from_frame,
    clean_record
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load application datasets once at startup.
    app.state.app_data = load_app_data()
    app.state.data_ready = True

    yield

    app.state.data_ready = False


app = FastAPI(
    title="BoreWell Sentinel India API",
    description=(
        "Groundwater quality analytics, testing prioritization "
        "and research prediction services."
    ),
    version=APP_VERSION,
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def get_data():
    data = getattr(app.state, "app_data", None)

    if data is None:
        raise HTTPException(
            status_code=503,
            detail="Application datasets are not ready."
        )

    return data


@app.get("/")
def root():
    return {
        "project": "BoreWell Sentinel India",
        "api": "BoreWell Sentinel API",
        "version": APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health():
    ready = bool(getattr(app.state, "data_ready", False))

    return {
        "status": "healthy" if ready else "starting",
        "data_ready": ready,
        "model_status": "not_loaded",
        "version": APP_VERSION
    }


@app.get("/api/v1/dashboard/summary")
def dashboard_summary():
    data = get_data()
    sites = data["sites"]
    actions = data["actions"]
    traces = data["traces"]

    tier_counts = (
        sites["Priority_tier"]
        .value_counts()
        .to_dict()
    )

    return {
        "total_locations": int(len(sites)),
        "priority_tiers": {
            "P1": int(tier_counts.get("P1 — Highest 10%", 0)),
            "P2": int(tier_counts.get("P2 — Next 15%", 0)),
            "P3": int(tier_counts.get("P3 — Remaining locations", 0))
        },
        "trace_alert_locations": int(len(traces)),
        "low_chemical_evidence_locations": int(
            sites["Chemical_parameters_tested"].le(2).sum()
        ),
        "mean_testing_priority_score": round(
            float(sites["Testing_priority_score"].mean()), 3
        ),
        "mean_recommended_tests": round(
            float(actions["Recommended_test_count"].mean()), 3
        ),
        "total_parameter_action_records": int(len(data["parameters"]))
    }


@app.get("/api/v1/dashboard/states")
def dashboard_states(
    limit: int = Query(default=15, ge=1, le=40)
):
    sites = get_data()["sites"]

    grouped = (
        sites.groupby("State", dropna=False)
        .agg(
            Locations=("_spatial_group_id", "size"),
            Mean_priority_score=("Testing_priority_score", "mean")
        )
        .reset_index()
        .sort_values("Locations", ascending=False)
        .head(limit)
    )

    return {
        "states": records_from_frame(grouped)
    }


@app.get("/api/v1/sites")
def search_sites(
    query: str | None = Query(default=None, max_length=120),
    state: str | None = Query(default=None, max_length=100),
    district: str | None = Query(default=None, max_length=100),
    tier: str | None = Query(default=None),
    low_evidence_only: bool = False,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    sites = get_data()["sites"]

    filtered = sites

    if query:
        query = query.strip()

        if query:
            mask = (
                filtered["_spatial_group_id"].astype(str).str.contains(
                    query, case=False, regex=False, na=False
                )
                | filtered["State"].astype(str).str.contains(
                    query, case=False, regex=False, na=False
                )
                | filtered["District"].astype(str).str.contains(
                    query, case=False, regex=False, na=False
                )
            )
            filtered = filtered.loc[mask]

    if state:
        filtered = filtered.loc[
            filtered["State"].str.casefold().eq(state.strip().casefold())
        ]

    if district:
        filtered = filtered.loc[
            filtered["District"].str.casefold().eq(district.strip().casefold())
        ]

    if tier:
        filtered = filtered.loc[
            filtered["Priority_tier"].eq(tier.strip())
        ]

    if low_evidence_only:
        filtered = filtered.loc[
            filtered["Chemical_parameters_tested"].le(2)
        ]

    filtered = filtered.sort_values("Priority_rank")

    total = len(filtered)
    page = filtered.iloc[offset:offset + limit]

    return {
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "sites": records_from_frame(page)
    }


@app.get("/api/v1/sites/{site_id}")
def site_details(site_id: str):
    data = get_data()

    matching = data["sites"].loc[
        data["sites"]["_spatial_group_id"].eq(site_id)
    ]

    if matching.empty:
        raise HTTPException(status_code=404, detail="Location not found.")

    actions = data["actions"].loc[
        data["actions"]["_spatial_group_id"].eq(site_id)
    ]

    parameter_actions = data["parameters"].loc[
        data["parameters"]["_spatial_group_id"].eq(site_id)
    ].sort_values("Parameter")

    return {
        "site": clean_record(matching.iloc[0].to_dict()),
        "actions": (
            clean_record(actions.iloc[0].to_dict())
            if not actions.empty else None
        ),
        "parameter_actions": records_from_frame(parameter_actions)
    }


@app.get("/api/v1/alerts/trace")
def trace_alerts(
    query: str | None = Query(default=None, max_length=120),
    state: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=150),
    offset: int = Query(default=0, ge=0)
):
    traces = get_data()["traces"]

    filtered = traces

    if query:
        mask = (
            filtered["_spatial_group_id"].astype(str).str.contains(
                query.strip(), case=False, regex=False, na=False
            )
            | filtered["District"].astype(str).str.contains(
                query.strip(), case=False, regex=False, na=False
            )
            | filtered["State"].astype(str).str.contains(
                query.strip(), case=False, regex=False, na=False
            )
        )
        filtered = filtered.loc[mask]

    if state:
        filtered = filtered.loc[
            filtered["State"].str.casefold().eq(state.strip().casefold())
        ]

    if "Priority_rank" in filtered.columns:
        filtered = filtered.sort_values("Priority_rank")

    total = len(filtered)

    return {
        "total": int(total),
        "limit": limit,
        "offset": offset,
        "alerts": records_from_frame(
            filtered.iloc[offset:offset + limit]
        )
    }


@app.get("/api/v1/metadata/targets")
def target_metadata():
    return {
        "targets": [
            {
                "name": "Potential of Hydrogen (pH)",
                "unit": "pH",
                "transformation": "identity"
            },
            {
                "name": "Electric Conductivity (μS/cm)",
                "unit": "μS/cm",
                "transformation": "log1p"
            },
            {
                "name": "Chloride (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p"
            },
            {
                "name": "Bicarbonate (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p"
            },
            {
                "name": "Sulphate (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p",
                "conditional_screening": True
            },
            {
                "name": "Calcium (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p"
            },
            {
                "name": "Magnesium (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p"
            },
            {
                "name": "Sodium (mg/L)",
                "unit": "mg/L",
                "transformation": "log1p"
            }
        ],
        "prediction_notice": (
            "Predictions are estimates, not laboratory measurements "
            "or certifications of groundwater safety."
        )
    }


@app.get("/api/v1/map/sites")
def map_sites(
    state: str | None = Query(default=None, max_length=100),
    tier: str | None = Query(default=None, pattern="^(P1|P2|P3)$")
):
    import pandas as pd

    sites = get_data()["sites"]
    filtered = sites.copy()

    if state:
        filtered = filtered.loc[
            filtered["State"].astype(str).str.casefold()
            == state.strip().casefold()
        ]

    if tier:
        filtered = filtered.loc[
            filtered["Priority_tier"]
            .fillna("")
            .astype(str)
            .str.startswith(tier.upper())
        ]

    total_filtered = len(filtered)

    latitude = pd.to_numeric(
        filtered["Latitude"], errors="coerce"
    )

    longitude = pd.to_numeric(
        filtered["Longitude"], errors="coerce"
    )

    valid_coordinates = (
        latitude.between(-90, 90)
        & longitude.between(-180, 180)
    )

    geo = filtered.loc[valid_coordinates].copy()

    geo["Latitude"] = latitude.loc[valid_coordinates]
    geo["Longitude"] = longitude.loc[valid_coordinates]

    map_columns = [
        "_spatial_group_id",
        "State",
        "District",
        "Latitude",
        "Longitude",
        "Priority_rank",
        "Priority_tier",
        "Testing_priority_score",
        "Primary_priority_driver",
        "Total_records",
        "Distinct_years"
    ]

    geo = geo[map_columns].sort_values(
        "Priority_rank",
        ascending=True
    )

    return {
        "filtered_locations": int(total_filtered),
        "mapped_locations": int(len(geo)),
        "excluded_invalid_coordinates": int(
            total_filtered - len(geo)
        ),
        "points": records_from_frame(geo)
    }



@app.get("/api/v1/map/coordinate-groups")
def map_coordinate_groups(
    state: str | None = Query(default=None, max_length=100),
    tier: str | None = Query(default=None, pattern="^(P1|P2|P3)$")
):
    """Group exact coordinates, applying map-only Andhra Pradesh overrides."""
    import pandas as pd
    from pathlib import Path
    from collections import Counter

    sites = get_data()["sites"]

    override_path = (
        Path(__file__).resolve().parents[1]
        / "reports/map_quality/phase10_andhra_pradesh_map_overrides.csv"
    )

    overrides = pd.read_csv(
        override_path,
        usecols=["_spatial_group_id", "Map_state"],
        dtype=str
    )

    override_map = dict(zip(
        overrides["_spatial_group_id"],
        overrides["Map_state"]
    ))

    filtered = sites.copy()

    # All non-Andhra-Pradesh records retain their original state.
    # Only the 241 audited Andhra Pradesh site IDs receive overrides.
    filtered["Map_state"] = (
        filtered["_spatial_group_id"].astype(str)
        .map(override_map)
        .fillna(filtered["State"].astype(str))
        .astype(str)
        .str.strip()
        .str.casefold()
    )

    if state:
        filtered = filtered.loc[
            filtered["Map_state"] == state.strip().casefold()
        ]

    if tier:
        filtered = filtered.loc[
            filtered["Priority_tier"]
            .fillna("")
            .astype(str)
            .str.startswith(tier.upper())
        ]

    total_filtered = len(filtered)

    latitude = pd.to_numeric(filtered["Latitude"], errors="coerce")
    longitude = pd.to_numeric(filtered["Longitude"], errors="coerce")

    valid = (
        latitude.between(-90, 90)
        & longitude.between(-180, 180)
    )

    geo = filtered.loc[valid, [
        "_spatial_group_id",
        "State",
        "Map_state",
        "District",
        "Priority_rank",
        "Priority_tier",
        "Latitude",
        "Longitude"
    ]].copy()

    geo["Latitude"] = latitude.loc[valid]
    geo["Longitude"] = longitude.loc[valid]

    geo["Priority_rank"] = pd.to_numeric(
        geo["Priority_rank"], errors="coerce"
    )

    geo["Station"] = (
        geo["_spatial_group_id"]
        .astype(str)
        .str.split("|")
        .str[2]
        .fillna("Unknown")
    )

    geo = geo.sort_values(
        "Priority_rank",
        ascending=True,
        na_position="last"
    ).reset_index(drop=True)

    compact_columns = [
        "_spatial_group_id",
        "Station",
        "State",
        "Map_state",
        "District",
        "Priority_rank",
        "Priority_tier"
    ]

    serialized_members = records_from_frame(
        geo[compact_columns]
    )

    coordinate_indices = geo.groupby(
        ["Latitude", "Longitude"],
        sort=False,
        dropna=False
    ).indices

    groups = []

    for (lat, lng), positions in coordinate_indices.items():
        members = [
            serialized_members[int(position)]
            for position in positions
        ]

        states = sorted({
            str(member["Map_state"]).strip().casefold()
            for member in members
            if member.get("Map_state")
        })

        source_states = sorted({
            str(member["State"]).strip().casefold()
            for member in members
            if member.get("State")
        })

        districts = sorted({
            str(member["District"]).strip()
            for member in members
            if member.get("District")
        })

        metadata_conflict = any(
            str(member.get("State") or "").strip().casefold()
            != str(member.get("Map_state") or "").strip().casefold()
            for member in members
        )

        counts = Counter(
            str(member.get("Priority_tier") or "").split(" — ", 1)[0]
            for member in members
        )

        representative = members[0]

        groups.append({
            "Latitude": float(lat),
            "Longitude": float(lng),
            "location_count": len(members),

            "State": states[0] if len(states) == 1 else "Multiple states",
            "District": (
                districts[0] if len(districts) == 1
                else "Multiple districts"
            ),

            "states": states,
            "source_states": source_states,
            "districts": districts,

            "state_count": len(states),
            "district_count": len(districts),
            "has_state_conflict": len(states) > 1,
            "has_metadata_conflict": metadata_conflict,

            "Priority_rank": representative.get("Priority_rank"),
            "Priority_tier": representative.get("Priority_tier"),

            "priority_counts": {
                "P1": int(counts.get("P1", 0)),
                "P2": int(counts.get("P2", 0)),
                "P3": int(counts.get("P3", 0))
            },

            "members": members
        })

    duplicate_groups = [
        group for group in groups
        if group["location_count"] > 1
    ]

    return {
        "filtered_locations": int(total_filtered),
        "mapped_locations": int(len(geo)),
        "excluded_invalid_coordinates": int(total_filtered - len(geo)),

        "coordinate_groups": int(len(groups)),
        "duplicate_coordinate_groups": int(len(duplicate_groups)),
        "locations_in_duplicate_groups": int(
            sum(group["location_count"] for group in duplicate_groups)
        ),
        "extra_locations_at_duplicate_coordinates": int(
            sum(group["location_count"] - 1 for group in duplicate_groups)
        ),

        "groups": groups
    }


