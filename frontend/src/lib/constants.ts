/**
 * Dataset configuration — single source of truth for the data vintage.
 *
 * When the dataset is updated to include a new financial year, only these
 * two values need to change and the rest of the application follows.
 */

/** Latest financial year covered by the dataset, as a calendar year (e.g. 2016 = FY16). */
export const DATASET_LATEST_YEAR = 2025;

/** Latest financial year as a label string (e.g. "FY16"). */
export const DATASET_LATEST_FY = `FY${DATASET_LATEST_YEAR.toString().slice(-2)}`;
