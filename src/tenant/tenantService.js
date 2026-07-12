import { getTenantId, validateTenantContext } from './tenantContext';

/**
 * Base service class that automatically injects tenantId into queries.
 */
export class BaseTenantService {
  get restaurantId() {
    return validateTenantContext();
  }

  // Example helper to automatically attach restaurantId to queries
  tenantQuery(query = {}) {
    return { ...query, restaurantId: this.restaurantId };
  }
}
