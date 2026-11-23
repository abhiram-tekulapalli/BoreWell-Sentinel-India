from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from backend.config import (
    SITE_PRIORITY_PATH,
    SITE_ACTION_PATH,
    PARAMETER_ACTION_PATH,
    TRACE_ALERT_PATH
)


SITE_COLUMNS = [
    "_spatial_group_id",
    "State",
    "District",
    "Latitude",
    "Longitude",
    "Latest_observation",
    "Total_records",
    "Distinct_years",
    "Years_since_last_sample",
    "Chemical_parameters_tested",
    "Chemical_risk_score",
    "Chemical_coverage_fraction",
    "Data_uncertainty_score",
    "Any_sparse_trace_alert",
    "Significant_increasing_trend_count",
    "Testing_priority_score",
    "Priority_rank",
    "Priority_tier",
    "Priority_explanation",
    "Primary_priority_driver"
]

ACTION_COLUMNS = [
    "_spatial_group_id",
    "Recommended_test_count",
    "Baseline_test_count",
    "Targeted_retest_count",
    "Overdue_retest_count",
    "Routine_retest_due_count",
    "Baseline_parameters",
    "Targeted_parameters",
    "Overdue_parameters",
    "Routine_retest_parameters",
    "Action_reason_summary",
    "Sparse_trace_alert_parameters"
]

PARAMETER_COLUMNS = [
    "_spatial_group_id",
    "Parameter",
    "Parameter_key",
    "Valid_measurements",
    "Distinct_measurement_years",
    "Latest_measurement",
    "Historical_exceedance_count",
    "Historical_severe_count",
    "Conditional_unresolved_count",
    "Years_since_parameter_sample",
    "Has_valid_measurement",
    "Testing_reason",
    "Testing_recommendation",
    "Exceedance_count",
    "Severe_exceedance_count",
    "Distinct_exceedance_years",
    "Latest_exceedance_date",
    "Years_since_last_exceedance",
    "Exceedance_recency",
    "Significant_increasing_trend"
]

TRACE_COLUMNS = [
    "_spatial_group_id",
    "State",
    "District",
    "Latitude",
    "Longitude",
    "Priority_rank",
    "Priority_tier",
    "Testing_priority_score",
    "Sparse_trace_alert_parameters",
    "Any_sparse_trace_alert",
    "Trace_alerts__Arsenic",
    "Trace_alerts__Copper",
    "Trace_alerts__Lead",
    "Trace_alerts__Zinc",
    "Trace_alerts__Nickel",
    "Trace_alerts__Cadmium",
    "Trace_alerts__Chromium",
    "Trace_alerts__Iron_Manganese"
]


def read_selected_csv(path, desired_columns, required_columns):
    if not path.exists():
        raise FileNotFoundError(f"Required application data is missing: {path}")

    available_columns = pd.read_csv(path, nrows=0).columns.tolist()

    missing = [
        column for column in required_columns
        if column not in available_columns
    ]

    if missing:
        raise ValueError(
            f"Missing required columns in {path.name}: {missing}"
        )

    selected = [
        column for column in desired_columns
        if column in available_columns
    ]

    frame = pd.read_csv(
        path,
        usecols=selected,
        low_memory=False
    )

    return frame


def validate_unique_locations(frame, name):
    if frame["_spatial_group_id"].duplicated().any():
        raise ValueError(
            f"{name} contains duplicate spatial group identifiers."
        )


@lru_cache(maxsize=1)
def load_app_data():
    site = read_selected_csv(
        SITE_PRIORITY_PATH,
        SITE_COLUMNS,
        [
            "_spatial_group_id",
            "State",
            "District",
            "Testing_priority_score",
            "Priority_rank",
            "Priority_tier"
        ]
    )

    actions = read_selected_csv(
        SITE_ACTION_PATH,
        ACTION_COLUMNS,
        [
            "_spatial_group_id",
            "Recommended_test_count",
            "Baseline_test_count",
            "Targeted_retest_count",
            "Overdue_retest_count",
            "Routine_retest_due_count"
        ]
    )

    parameters = read_selected_csv(
        PARAMETER_ACTION_PATH,
        PARAMETER_COLUMNS,
        [
            "_spatial_group_id",
            "Parameter",
            "Testing_recommendation"
        ]
    )

    traces = read_selected_csv(
        TRACE_ALERT_PATH,
        TRACE_COLUMNS,
        [
            "_spatial_group_id",
            "Sparse_trace_alert_parameters"
        ]
    )

    validate_unique_locations(site, "Site priority register")
    validate_unique_locations(actions, "Site action register")
    validate_unique_locations(traces, "Trace alert register")

    if len(site) != 24199:
        raise ValueError(
            f"Unexpected site count: {len(site)}; expected 24,199."
        )

    if len(actions) != len(site):
        raise ValueError("Site priority and action counts do not match.")

    parameter_counts = parameters.groupby("_spatial_group_id").size()

    if not parameter_counts.eq(8).all():
        raise ValueError(
            "Not every location has exactly eight parameter records."
        )

    site_ids = set(site["_spatial_group_id"])
    action_ids = set(actions["_spatial_group_id"])
    parameter_ids = set(parameters["_spatial_group_id"])

    if site_ids != action_ids or site_ids != parameter_ids:
        raise ValueError(
            "Spatial identifiers do not match across application registers."
        )

    return {
        "sites": site,
        "actions": actions,
        "parameters": parameters,
        "traces": traces
    }


def clean_value(value: Any):
    if value is None:
        return None

    if isinstance(value, pd.Timestamp):
        return value.isoformat()

    if isinstance(value, np.generic):
        value = value.item()

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    return value


def clean_record(record):
    return {
        str(key): clean_value(value)
        for key, value in record.items()
    }


def records_from_frame(frame):
    return [
        clean_record(row)
        for row in frame.to_dict(orient="records")
    ]
