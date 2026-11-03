import { ServiceConfig } from '../types/types';

type ServiceRef = string | ServiceConfig | undefined;

/**
 * Gets the target identifier of a service declared either as a plain string or as a ServiceConfig
 * @param {ServiceRef} service - The service reference
 * @returns {string | undefined} The target identifier, if any
 */
export const getServiceTargetId = (service: ServiceRef): string | undefined => {
  if (!service) {
    return undefined;
  }
  return typeof service === 'string' ? service : service.targetId;
};

/**
 * Gets the resolver of a service declared either as a plain string or as a ServiceConfig
 * @param {ServiceRef} service - The service reference
 * @returns {string | undefined} The resolver, if any
 */
export const getServiceResolver = (service: ServiceRef): string | undefined => {
  if (!service) {
    return undefined;
  }
  return typeof service === 'string' ? service : service.meta?.resolver;
};
