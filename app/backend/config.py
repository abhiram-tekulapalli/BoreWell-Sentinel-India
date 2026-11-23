from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

REPORTS_DIR = PROJECT_ROOT / "reports"

PHASE7_DIR = REPORTS_DIR / "temporal_analysis" / "phase_7"
PHASE8_DIR = REPORTS_DIR / "testing_prioritization" / "phase_8"
PHASE9_DIR = REPORTS_DIR / "model_evaluation" / "phase_9"

MODEL_DIR = PROJECT_ROOT / "models" / "phase_6"

SITE_PRIORITY_PATH = (
    PHASE8_DIR / "phase8_site_priority_register.csv"
)

SITE_ACTION_PATH = (
    PHASE8_DIR / "phase8_site_action_register.csv"
)

PARAMETER_ACTION_PATH = (
    PHASE8_DIR / "phase8_parameter_action_register.csv"
)

TRACE_ALERT_PATH = (
    PHASE8_DIR / "phase8_sparse_trace_alert_register.csv"
)

TEMPORAL_TRENDS_PATH = (
    PHASE7_DIR / "phase7_location_trends_may_only.csv"
)

MODEL_BUNDLE_PATH = (
    MODEL_DIR / "phase6_model_bundle.joblib"
)

APP_VERSION = "0.1.0"
DATASET_LOCATION_COUNT = 24199
PARAMETERS_PER_LOCATION = 8
