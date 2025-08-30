import { usePostHog } from 'src/composables/usePosthog';
import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'MainMenu', component: () => import('pages/MainMenu.vue') },
      { path: 'tests', name: 'TestsMenu', component: () => import('pages/TestsMenu.vue') },
      { path: 'game', name: 'GamePage', component: () => import('pages/GamePage.vue') },
      { path: 'game/:gameId', name: 'GameWithId', component: () => import('pages/GamePage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

const { posthog } = usePostHog()

export default routes;
