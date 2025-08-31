import posthog from 'posthog-js'

let initialized = false

export function usePostHog() {
  if (!initialized) {
    const token = import.meta.env.VITE_POSTHOG_ID
    if (token) {
      posthog.init(token, {
        api_host: 'https://eu.i.posthog.com',
        // Avoid cookies on GitHub Pages subpath; use localStorage instead
        persistence: 'localStorage',
        // Prevent loading recording and related assets (eu-assets.i.posthog.com)
        disable_session_recording: true,
        // Do not fetch remote config or decide; prevents eu-assets requests
        // (disables feature flags, autocapture config, etc.)
        advanced_disable_decide: true as any,
        // Reduce noise further by disabling autocapture
        autocapture: false,
        // Keep initial pageview; for SPAs, capture on route change manually if needed
        capture_pageview: true,
        // Keep profiles limited to identified users only
        person_profiles: 'identified_only',
        // Optional: set a static defaults date for feature flags or similar
        defaults: '2025-05-24',
      })
    } else {
      // eslint-disable-next-line no-console
      console.warn('PostHog disabled: VITE_POSTHOG_ID is not set')
    }
    initialized = true
  }

  return { posthog }
}
