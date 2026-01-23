/**
 * Centralized API Configuration
 * 
 * This module provides a single source of truth for all API endpoints
 * and server configuration used throughout the application.
 * 
 * There are TWO separate servers:
 * 1. API Server (api.ufscheduler.com) - handles course data and schedule generation
 * 2. Backend Server (backend.ufscheduler.com) - handles metrics, chat, and user data
 */

// API Server - handles course data and schedule generation
const API_SERVER = process.env.REACT_APP_API_SERVER_IP || 'api.ufscheduler.com';

// Backend Server - handles metrics, chat, and user data (from environment variable)
const BACKEND_SERVER = process.env.REACT_APP_BACKEND_SERVER_IP as string;

// Base URLs
export const API_BASE_URL = `https://${API_SERVER}`;
export const BACKEND_BASE_URL = `https://${BACKEND_SERVER}`;

/**
 * API Endpoints (api.ufscheduler.com)
 * Course-related endpoints for fetching and generating schedules
 */
export const API_ENDPOINTS = {
  GET_COURSES: '/api/get_courses',
  GENERATE_A_LIST: '/generate_a_list',
} as const;

/**
 * Backend Endpoints (backend.ufscheduler.com)
 * Metrics, chat, and user-related endpoints
 */
export const BACKEND_ENDPOINTS = {
  // Metrics endpoints
  SEARCH_METRICS: '/search',
  COURSE_METRICS: '/course',
  MAJOR_METRICS: '/major',
  
  // Chat/User endpoints
  SET_USERNAME: '/set-username',
  GET_USERNAME: '/username', // Append /{googleId} when using
} as const;

/**
 * Build a full API URL from an endpoint path
 * @param endpoint - The API endpoint path
 * @returns The full URL including the API base URL
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * Build a full Backend URL from an endpoint path
 * @param endpoint - The backend endpoint path
 * @returns The full URL including the Backend base URL
 */
export const buildBackendUrl = (endpoint: string): string => {
  return `${BACKEND_BASE_URL}${endpoint}`;
};

/**
 * Get the WebSocket connection URL for Socket.io
 * @returns The WebSocket URL for the backend server
 */
export const getSocketUrl = (): string => {
  return BACKEND_BASE_URL;
};

/**
 * Pre-built API URLs (api.ufscheduler.com)
 * Use these for course data and schedule generation
 */
export const API_URLS = {
  GET_COURSES: buildApiUrl(API_ENDPOINTS.GET_COURSES),
  GENERATE_A_LIST: buildApiUrl(API_ENDPOINTS.GENERATE_A_LIST),
} as const;

/**
 * Pre-built Backend URLs (backend.ufscheduler.com)
 * Use these for metrics, chat, and user operations
 */
export const BACKEND_URLS = {
  SEARCH_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.SEARCH_METRICS),
  COURSE_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.COURSE_METRICS),
  MAJOR_METRICS: buildBackendUrl(BACKEND_ENDPOINTS.MAJOR_METRICS),
  SET_USERNAME: buildBackendUrl(BACKEND_ENDPOINTS.SET_USERNAME),
  GET_USERNAME: buildBackendUrl(BACKEND_ENDPOINTS.GET_USERNAME),
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
  getSocketUrl,
};
