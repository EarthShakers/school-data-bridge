export const remoteAdapter = {
  getSchoolConfig: async (tenantId: string, entityType: string) => {
    return "remoteAdapter";
  },
  getAvailableEntities: async (tenantId: string) => {
    return "remoteAdapter";
  },
  getAvailableTenants: async () => {
    return "remoteAdapter";
  },
};
