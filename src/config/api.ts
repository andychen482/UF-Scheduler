/**
 * Centralized API Configuration
 *
 * There are TWO separate servers:
 * 1. API Server (api.ufscheduler.com) - handles course data and schedule generation
 * 2. Backend Server (api.ufscheduler.com) - handles metrics, chat, users, and AI assistant
 *    (previously backend.ufscheduler.com, now behind API Gateway)
 */

import type { AuthContextProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

// API Server - handles course data and schedule generation
export const API_BASE_URL = process.env.REACT_APP_API_SERVER_IP as string;
// Backend Server - handles metrics, chat, and user data (now via API Gateway)
export const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_SERVER_IP as string;

/**
 * Cognito OIDC configuration, read from environment variables.
 * Consumed by AuthProvider in index.tsx.
 */
export const cognitoConfig = {
  authority: process.env.REACT_APP_COGNITO_AUTHORITY as string,
  client_id: process.env.REACT_APP_COGNITO_CLIENT_ID as string,
  redirect_uri: process.env.REACT_APP_COGNITO_REDIRECT_URI as string,
  response_type: "code",
  scope: "email openid profile",
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export const COGNITO_DOMAIN = process.env.REACT_APP_COGNITO_DOMAIN as string;
export const COGNITO_LOGOUT_URI = process.env.REACT_APP_COGNITO_LOGOUT_URI as string;

/**
 * Build auth headers from the react-oidc-context auth object.
 * Returns an Authorization header with the Cognito id_token if available.
 */
export const getAuthHeaders = (auth: AuthContextProps): Record<string, string> => {
  const idToken = auth.user?.id_token;
  if (!idToken) return {};
  return { Authorization: `Bearer ${idToken}` };
};

/**
 * Redirect the browser to the Cognito hosted UI logout endpoint.
 */
export const signOutRedirect = () => {
  const clientId = cognitoConfig.client_id;
  const logoutUri = COGNITO_LOGOUT_URI;
  const storeKey = `oidc.user:${cognitoConfig.authority}:${clientId}`;
  window.localStorage.removeItem(storeKey);
  window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};

/**
 * API Endpoints (api.ufscheduler.com)
 * Course-related endpoints for fetching and generating schedules
 */
export const API_ENDPOINTS = {
  GET_COURSES: '/api/get_courses',
  GENERATE_A_LIST: '/generate_a_list',
} as const;

/**
 * Backend Endpoints (api.ufscheduler.com via API Gateway)
 * Metrics, chat, users, messages, and AI assistant
 */
export const BACKEND_ENDPOINTS = {
  // Metrics endpoints
  SEARCH_METRICS: '/metrics/search',
  COURSE_METRICS: '/metrics/course',
  MAJOR_METRICS: '/metrics/major',

  // User endpoints
  SET_USERNAME: '/users/username',
  GET_PROFILE: '/users/me',

  // Message endpoints
  MESSAGES: '/chat-room/messages',
  MESSAGES_STREAM: '/chat-room/messages/stream',

  // Active users (unauthenticated)
  ACTIVE_USERS_STREAM: '/active-users/stream',

  // AI Chat endpoint
  AI_CHAT: '/ai-chat',
} as const;

export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

export const buildBackendUrl = (endpoint: string): string => {
  return `${BACKEND_BASE_URL}${endpoint}`;
};

/**
 * Pre-built API URLs (api.ufscheduler.com)
 */
export const API_URLS = {
  GET_COURSES: buildApiUrl(API_ENDPOINTS.GET_COURSES),
  GENERATE_A_LIST: buildApiUrl(API_ENDPOINTS.GENERATE_A_LIST),
} as const;

/**
 * Pre-built Backend URLs (api.ufscheduler.com via API Gateway)
 */
export const BACKEND_URLS = {
  SEARCH_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.SEARCH_METRICS),
  COURSE_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.COURSE_METRICS),
  MAJOR_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.MAJOR_METRICS),
  SET_USERNAME: buildBackendUrl(BACKEND_ENDPOINTS.SET_USERNAME),
  GET_PROFILE: buildBackendUrl(BACKEND_ENDPOINTS.GET_PROFILE),
  MESSAGES: buildBackendUrl(BACKEND_ENDPOINTS.MESSAGES),
  MESSAGES_STREAM: buildBackendUrl(BACKEND_ENDPOINTS.MESSAGES_STREAM),
  ACTIVE_USERS_STREAM: buildBackendUrl(BACKEND_ENDPOINTS.ACTIVE_USERS_STREAM),
  AI_CHAT: buildBackendUrl(BACKEND_ENDPOINTS.AI_CHAT),
} as const;

export default {
  API_BASE_URL,
  BACKEND_BASE_URL,
  API_ENDPOINTS,
  BACKEND_ENDPOINTS,
  API_URLS,
  BACKEND_URLS,
  buildApiUrl,
  buildBackendUrl,
  cognitoConfig,
  getAuthHeaders,
  signOutRedirect,
};
