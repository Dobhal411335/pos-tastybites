import { ROLES } from '../utils/constants';

export const PERMISSIONS = {
  [ROLES.ADMIN]: {
    canAccessAdmin: true,
    canAccessEmployee: true,
  },
  [ROLES.EMPLOYEE]: {
    canAccessAdmin: false,
    canAccessEmployee: true,
  },
};
