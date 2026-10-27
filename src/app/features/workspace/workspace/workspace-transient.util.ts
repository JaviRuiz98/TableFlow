import type { Role } from '../../../core/models/models';
import type { Product, ProductCategory, FloorPlan } from '../../../core/models/models';
import { NEW_ORDER_ALERT } from '../workspace-user-alert-modal/workspace-alerts.util';

/** Snapshot of overlay/form fields cleared on init and logout. */
export interface WorkspaceTransientUi {
  createPlanDialog: boolean;
  userAccessDialog: boolean;
  createUserDialog: boolean;
  copyPlanDialog: boolean;
  renamePlanDialog: boolean;
  deletePlanDialog: boolean;
  newOrderAlert: boolean;
  userAlertTitle: string;
  userAlertEyebrow: string;
  userAlertMessage: string;
  editCategoryDialog: boolean;
  editProductDialog: boolean;
  catalogDeleteDialog: boolean;
  catalogDeleteBlocked: boolean;
  catalogDeleteChecking: boolean;
  catalogDeleteError: string;
  categoryToEdit: ProductCategory | null;
  productToEdit: Product | null;
  categoryToDelete: ProductCategory | null;
  productToDelete: Product | null;
  editCategoryName: string;
  editProductName: string;
  toast: string;
  newPlanName: string;
  adminAccessPassword: string;
  userAccessError: string;
  createUserError: string;
  verifiedAdminPassword: string;
  newUserFullName: string;
  newUserUsername: string;
  newUserPassword: string;
  newUserRole: Role;
  planToCopy: FloorPlan | null;
  copyPlanName: string;
  planToRename: FloorPlan | null;
  renamePlanName: string;
  planToDelete: FloorPlan | null;
}

/** Closed overlays + empty forms — same fields Workspace previously cleared inline. */
export function emptyWorkspaceTransientUi(): WorkspaceTransientUi {
  return {
    createPlanDialog: false,
    userAccessDialog: false,
    createUserDialog: false,
    copyPlanDialog: false,
    renamePlanDialog: false,
    deletePlanDialog: false,
    newOrderAlert: false,
    userAlertTitle: NEW_ORDER_ALERT.title,
    userAlertEyebrow: NEW_ORDER_ALERT.eyebrow,
    userAlertMessage: NEW_ORDER_ALERT.message,
    editCategoryDialog: false,
    editProductDialog: false,
    catalogDeleteDialog: false,
    catalogDeleteBlocked: false,
    catalogDeleteChecking: false,
    catalogDeleteError: '',
    categoryToEdit: null,
    productToEdit: null,
    categoryToDelete: null,
    productToDelete: null,
    editCategoryName: '',
    editProductName: '',
    toast: '',
    newPlanName: '',
    adminAccessPassword: '',
    userAccessError: '',
    createUserError: '',
    verifiedAdminPassword: '',
    newUserFullName: '',
    newUserUsername: '',
    newUserPassword: '',
    newUserRole: 'USER',
    planToCopy: null,
    copyPlanName: '',
    planToRename: null,
    renamePlanName: '',
    planToDelete: null,
  };
}

export function defaultCopyPlanName(planName: string): string {
  return `${planName} copia`;
}
