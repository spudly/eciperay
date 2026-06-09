export const api = {
  recipes: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  import: {importUrl: jest.fn(), importImage: jest.fn(), importText: jest.fn()},
  auth: {syncUser: jest.fn()},
  tags: {list: jest.fn(), create: jest.fn(), delete: jest.fn()},
  notes: {list: jest.fn(), create: jest.fn()},
  ai: {
    getConversation: jest.fn(),
    chat: jest.fn(),
    cleanup: jest.fn(),
    nutrition: jest.fn(),
    substitutions: jest.fn(),
  },
  drafts: {listPending: jest.fn(), approve: jest.fn(), reject: jest.fn()},
};
