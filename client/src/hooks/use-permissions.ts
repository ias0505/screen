import { useWorkContext } from './use-work-context';

export type Permission = 'viewer' | 'editor' | 'manager' | 'owner';

export interface PermissionConfig {
  permission: Permission;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  visibleMenus: string[];
  hiddenMenus: string[];
}

const allMenus = [
  '/dashboard',
  '/',
  '/screens',
  '/groups',
  '/media',
  '/image-editor',
  '/schedule',
  '/subscriptions',
  '/team',
  '/settings',
  '/admin',
];

const menuPermissions: Record<Permission, string[]> = {
  viewer: ['/', '/screens', '/groups', '/media', '/image-editor', '/schedule'],
  editor: ['/', '/screens', '/groups', '/media', '/image-editor', '/schedule'],
  manager: ['/', '/screens', '/groups', '/media', '/image-editor', '/schedule', '/subscriptions', '/team', '/settings'],
  owner: allMenus,
};

const actionPermissions: Record<Permission, { canAdd: boolean; canEdit: boolean; canDelete: boolean }> = {
  viewer: { canAdd: false, canEdit: false, canDelete: false },
  editor: { canAdd: true, canEdit: true, canDelete: true },
  manager: { canAdd: true, canEdit: true, canDelete: true },
  owner: { canAdd: true, canEdit: true, canDelete: true },
};

export function usePermissions(): PermissionConfig {
  const { context, availableCompanies } = useWorkContext();
  
  if (context.type === 'personal') {
    return {
      permission: 'owner',
      canAdd: true,
      canEdit: true,
      canDelete: true,
      visibleMenus: allMenus,
      hiddenMenus: [],
    };
  }
  
  const company = availableCompanies.find(c => c.ownerId === context.companyOwnerId);
  const permission = (company?.permission as Permission) || 'viewer';
  
  const actions = actionPermissions[permission];
  const visible = menuPermissions[permission];
  const hidden = allMenus.filter(m => !visible.includes(m));
  
  return {
    permission,
    canAdd: actions.canAdd,
    canEdit: actions.canEdit,
    canDelete: actions.canDelete,
    visibleMenus: visible,
    hiddenMenus: hidden,
  };
}

export function isMenuVisible(menu: string, permission: Permission): boolean {
  return menuPermissions[permission].includes(menu);
}

export function canPerformAction(action: 'add' | 'edit' | 'delete', permission: Permission): boolean {
  const actions = actionPermissions[permission];
  switch (action) {
    case 'add': return actions.canAdd;
    case 'edit': return actions.canEdit;
    case 'delete': return actions.canDelete;
    default: return false;
  }
}
