# BoreWell Sentinel India

> **Groundwater Quality Analytics, Testing Prioritization & Research Prediction Platform for India**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

**BoreWell Sentinel India** is an end-to-end machine learning and analytics platform for groundwater quality monitoring across India. It transforms raw CGWB (Central Ground Water Board) chemical parameter data into actionable testing priorities, interactive maps, and research-grade predictions for 8 key groundwater contaminants.

### Key Capabilities

| Module | Description |
|--------|-------------|
| **Data Pipeline** | 11 notebooks: collection → cleaning → EDA → feature engineering → modeling → deployment |
| **ML Prediction** | Multi-contaminant regression (pH, EC, Chloride, Bicarbonate, Sulphate, Calcium, Magnesium, Sodium) |
| **Testing Prioritization** | Evidence-based ranking of 24,199 locations into P1/P2/P3 tiers |
| **Temporal Analysis** | Trend detection (Kendall's τ, Theil-Sen) for chemical parameters over time |
| **Trace Alerts** | Separate register for sparse trace-element observations (As, Cu, Pb, Zn, Ni, Cd, Cr, Fe/Mn) |
| **Interactive Map** | Leaflet + marker clustering for 24K+ locations with Andhra Pradesh coordinate corrections |
| **REST API** | 8 FastAPI endpoints for dashboard, search, site details, alerts, and map data |

---

## Architecture

```
BoreWell Sentinel India/
├── app/
│   ├── backend/                 # FastAPI application
│   │   ├── config.py            # Paths, constants, version
│   │   ├── main.py              # API routes (8 endpoints)
│   │   └── services/
│   │       └── data_service.py  # Cached data loader + validation
│   └── frontend/                # React + Vite SPA
│       ├── src/
│       │   ├── App.jsx          # Main app (overview, sites, alerts)
│       │   ├── MapExplorer.jsx  # Interactive Leaflet map
│       │   ├── styles.css       # Design system
│       │   └── main.jsx         # Entry point
│       └── package.json
├── data/
│   ├── raw/                     # Original CGWB CSV files (30 state files)
│   ├── extracted/               # Unzipped state CSVs
│   └── processed/               # Master processed dataset (214 MB)
├── models/
│   └── phase_6/
│       └── phase6_model_bundle.joblib  # Trained ML model (1.8 GB)
├── notebooks/                   # 11 analysis notebooks (00-10)
├── reports/                     # Phase outputs (EDA, modeling, evaluation, etc.)
└── requirements.txt
```

---

## Data Source

**Central Ground Water Board (CGWB)** — *Ground Water Quality Chemical Parameters Manual (1961–2025)*

- 30 state/UT-wise CSV files
- 8 chemical parameters: pH, EC, Chloride, Bicarbonate, Sulphate, Calcium, Magnesium, Sodium
- ~24,199 provisional spatial groups (clustered stations)
- Historical records spanning 1961–2025

> ⚠️ **Disclaimer**: All predictions and priority scores are **research estimates**, not laboratory measurements or certifications of groundwater safety.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- 8+ GB RAM (for model loading)

### Backend Setup

```bash
cd "BoreWell Sentinel India"

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Download model (see Model Setup below)
# Place phase6_model_bundle.joblib in models/phase_6/

# Start API server
cd app/backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API will be available at:
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **Health**: http://127.0.0.1:8000/health

### Frontend Setup

```bash
cd app/frontend
npm install
npm run dev
```

Frontend will be available at **http://127.0.0.1:5173**

### Model Setup

The trained model (`phase6_model_bundle.joblib`, 1.8 GB) is **not included** in this repository due to size.

**Option 1: Download from release** (recommended)
```bash
# Place in models/phase_6/
mkdir -p models/phase_6
# Download from GitHub Releases or your storage provider
```

**Option 2: Train yourself**
```bash
# Run notebooks 00-06 sequentially
jupyter notebook notebooks/06_multicontaminant_prediction.ipynb
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Project info & version |
| `/health` | GET | Service health & data readiness |
| `/api/v1/dashboard/summary` | GET | Overview stats (tiers, alerts, means) |
| `/api/v1/dashboard/states` | GET | Location counts by state |
| `/api/v1/sites` | GET | Search/filter locations (paginated) |
| `/api/v1/sites/{site_id}` | GET | Detailed site profile + parameter actions |
| `/api/v1/alerts/trace` | GET | Trace-element alert register |
| `/api/v1/metadata/targets` | GET | Parameter metadata (units, transforms) |
| `/api/v1/map/sites` | GET | GeoJSON-ready points for mapping |
| `/api/v1/map/coordinate-groups` | GET | Clustered coordinate groups with popups |

### Example Requests

```bash
# Dashboard summary
curl http://127.0.0.1:8000/api/v1/dashboard/summary

# Search P1 sites in Maharashtra
curl "http://127.0.0.1:8000/api/v1/sites?state=Maharashtra&tier=P1%20%E2%80%94%20Highest%2010%25&limit=10"

# Site details
curl "http://127.0.0.1:8000/api/v1/sites/INDIA%7CMH%7CNAGPUR%7C12345"

# Trace alerts in Gujarat
curl "http://127.0.0.1:8000/api/v1/alerts/trace?state=Gujarat"
```

---

## Notebook Pipeline

| Notebook | Phase | Purpose |
|----------|-------|---------|
| `00_environment_check.ipynb` | 0 | Verify dependencies, paths, data access |
| `01_dataset_collection.ipynb` | 1 | Download & extract CGWB state CSVs |
| `02_dataset_audit.ipynb` | 2 | Schema validation, missingness, duplicates |
| `03_data_cleaning_integration.ipynb` | 3 | Standardize, merge, create spatial groups |
| `04_exploratory_analysis.ipynb` | 4 | Distributions, correlations, geographic patterns |
| `05_feature_engineering_target_preparation.ipynb` | 5 | Features, targets, train/test splits |
| `06_multicontaminant_prediction.ipynb` | 6 | Train multi-output regressors (1.8 GB model) |
| `07_temporal_analysis.ipynb` | 7 | Trend detection (Kendall's τ, Theil-Sen) |
| `08_testing_prioritization.ipynb` | 8 | Priority scoring, tiering, action registers |
| `09_model_evaluation.ipynb` | 9 | Cross-validation, error analysis, calibration |
| `10_web_application_deployment.ipynb` | 10 | API testing, frontend integration, deployment prep |

Run sequentially: `jupyter notebook notebooks/00_environment_check.ipynb`

---

## Frontend Features

### Overview Dashboard
- Hero panel with key metrics
- Priority tier distribution (Recharts bar chart)
- Top states by location count
- Highest-ranked locations table

### Site Explorer
- Full-text search (state, district, site ID)
- Filter by state, priority tier
- Paginated results (12/page)
- Click → detailed side panel

### Trace Alerts
- Separate register for trace elements
- 8 trace parameters monitored
- Filterable, sortable table

### Groundwater Map
- Leaflet + OpenStreetMap tiles
- Marker clustering (24K+ points)
- Andhra Pradesh coordinate corrections (241 sites)
- Interactive popups with member sites
- State + tier filters
- Auto-fit bounds on filter change

---

## Priority Scoring Methodology

The **Testing Priority Score** combines four evidence dimensions:

```
Testing_priority_score = 
  w1 × Chemical_risk_score           # Historical exceedances
+ w2 × Data_uncertainty_score        # Sparse measurements, high variability
+ w3 × (1 - Chemical_coverage_fraction)  # Few parameters tested
+ w4 × Temporal_trend_penalty        # Significant increasing trends
```

**Tiers** (percentile-based):
- **P1 — Highest 10%** → Immediate baseline + targeted testing
- **P2 — Next 15%** → Targeted retesting + overdue parameters
- **P3 — Remaining** → Routine monitoring schedule

Each location receives **8 parameter-specific recommendations** (Baseline / Targeted Retest / Overdue / Routine Due).

---

## Andhra Pradesh Map Correction

241 sites in Andhra Pradesh had coordinate metadata placing them outside state boundaries. Phase 10 applied manual overrides using `reports/map_quality/phase10_andhra_pradesh_map_overrides.csv` — **only for map display**. Original CGWB metadata is preserved in all API responses and analysis.

---

## Configuration

Key settings in `app/backend/config.py`:

```python
APP_VERSION = "0.1.0"
DATASET_LOCATION_COUNT = 24199
PARAMETERS_PER_LOCATION = 8

# Data paths (relative to project root)
SITE_PRIORITY_PATH = reports/testing_prioritization/phase_8/phase8_site_priority_register.csv
SITE_ACTION_PATH   = reports/testing_prioritization/phase_8/phase8_site_action_register.csv
PARAMETER_ACTION_PATH = reports/testing_prioritization/phase_8/phase8_parameter_action_register.csv
TRACE_ALERT_PATH   = reports/testing_prioritization/phase_8/phase8_sparse_trace_alert_register.csv
MODEL_BUNDLE_PATH  = models/phase_6/phase6_model_bundle.joblib
```

Frontend: Set `VITE_API_BASE_URL` in `.env` for production (default: `http://127.0.0.1:8000`)

---

## Deployment

### Docker (Backend)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/backend ./app/backend
COPY models/phase_6/phase6_model_bundle.joblib ./models/phase_6/
COPY reports ./reports
EXPOSE 8000
CMD ["uvicorn", "app.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker (Frontend)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY app/frontend/package*.json ./
RUN npm ci
COPY app/frontend .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY app/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://127.0.0.1:8000` |
| `PYTHONPATH` | For backend imports | Project root |

---

## Project Structure Details

### Backend Services

**`data_service.py`** — Core data loader with:
- `@lru_cache(maxsize=1)` for single-load at startup
- Column selection + required column validation
- Cross-register integrity checks (IDs, counts, 8 params/site)
- `clean_record()` / `records_from_frame()` for JSON serialization

**`main.py`** — FastAPI routes with:
- Lifespan manager for data loading
- CORS for frontend origin
- Pagination, filtering, search on all list endpoints
- Proper HTTP status codes (404, 503)

### Frontend Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `App` | App.jsx | Routing, state, data fetching, layout |
| `Overview` | App.jsx | Dashboard, stats, charts, top sites |
| `SiteExplorer` | App.jsx | Search, filter, paginated table |
| `SiteDetail` | App.jsx | Side-panel site profile |
| `TraceAlerts` | App.jsx | Trace register table |
| `MapExplorer` | MapExplorer.jsx | Leaflet map, clustering, popups |
| `MapMarkers` | MapExplorer.jsx | Cluster + coordinate-group markers |
| `SiteProfile` | MapExplorer.jsx | Map-side site detail panel |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run notebooks sequentially for data changes
4. Run `pytest` for backend tests
5. Run `npm run build` for frontend verification
6. Submit a Pull Request

### Code Style
- Python: `black`, `ruff`, type hints
- JavaScript: `eslint`, `prettier`
- Commits: Conventional Commits

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **Central Ground Water Board (CGWB)** — Open data provider
- **OpenStreetMap contributors** — Map tiles
- **scikit-learn, pandas, FastAPI, React, Leaflet** — Core libraries

---

## Contact

**Abhiram Tekulapalli** — [@abhiram-tekulapalli](https://github.com/abhiram-tekulapalli)

Project: [https://github.com/abhiram-tekulapalli/BoreWell-Sentinel-India](https://github.com/abhiram-tekulapalli/BoreWell-Sentinel-India)