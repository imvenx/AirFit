import posthog from 'posthog-js'

export function usePostHog() {
    posthog.init(import.meta.env.VITE_POSTHOG_ID, {
        api_host: 'https://eu.i.posthog.com',
        defaults: '2025-05-24',
        person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
    })

    return { posthog }
}