import { isLocalhost } from '../utils/environment';
import { getEnv } from '../utils/env-helper';
import { API_CONFIG } from './api';

const getUseProductionData = () => getEnv().VITE_USE_PRODUCTION_DATA === 'true';

const getBaseURL = () => {
  if (isLocalhost()) {
    return getEnv().VITE_API_BASE_URL || '/api';
  }
  return getEnv().VITE_API_BASE_URL || API_CONFIG.BASE_URL;
};

const getTimeout = () => Number(getEnv().VITE_API_TIMEOUT) || API_CONFIG.TIMEOUT;

export const apiConfig = {
  isLocalhost: isLocalhost(),
  useProductionData: getUseProductionData(),
  baseURL: getBaseURL(),
  timeout: getTimeout(),
  mockDelay: Number(getEnv().VITE_MOCK_DELAY) || 500,
};
