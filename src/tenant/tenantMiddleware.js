import { getTenantId } from './tenantContext';

/**
 * Ensures that a restaurantId is present in the current context.
 * Use this in service/repository layers to enforce tenant isolation.
 */
export const validateTenantContext = () => {
  const restaurantId = getTenantId();
  if (!restaurantId) {
    throw new Error('Tenant context is missing. restaurantId is required.');
  }
  return restaurantId;
};
