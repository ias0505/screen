import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkContext {
  type: 'personal' | 'company';
  companyOwnerId?: string;
  companyName?: string;
}

interface WorkContextState {
  context: WorkContext;
  availableCompanies: Array<{ ownerId: string; ownerName: string; permission: string }>;
  setContext: (context: WorkContext) => void;
  setAvailableCompanies: (companies: Array<{ ownerId: string; ownerName: string; permission: string }>) => void;
  switchToPersonal: () => void;
  switchToCompany: (ownerId: string, ownerName: string) => void;
}

export const useWorkContext = create<WorkContextState>()(
  persist(
    (set) => ({
      context: { type: 'personal' },
      availableCompanies: [],
      setContext: (context) => set({ context }),
      setAvailableCompanies: (companies) => set({ availableCompanies: companies }),
      switchToPersonal: () => set({ context: { type: 'personal' } }),
      switchToCompany: (ownerId, ownerName) => set({ 
        context: { 
          type: 'company', 
          companyOwnerId: ownerId, 
          companyName: ownerName 
        } 
      }),
    }),
    {
      name: 'work-context',
    }
  )
);
