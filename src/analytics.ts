/** GA4 measurement ID (e.g. G-XXXXXXXX). Unset when analytics is not configured (e.g. local dev). */
export const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_TOKEN;

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}
