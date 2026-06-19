export const api = {
  recipes: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    put: jest.fn(),
    patchLifecycle: jest.fn(),
    delete: jest.fn(),
  },
  import: {
    importUrl: jest.fn(),
    importImage: jest.fn(),
    importText: jest.fn(),
    importAi: jest.fn(),
  },
  auth: {syncUser: jest.fn()},
  tags: {list: jest.fn(), create: jest.fn(), delete: jest.fn()},
  ai: {
    nutrition: jest.fn(),
    substitutions: jest.fn(),
    generateImage: jest.fn(),
    generateDescription: jest.fn(),
  },
  versions: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    put: jest.fn(),
    activate: jest.fn(),
    tweakWithAi: jest.fn(),
  },
  cookLogs: {list: jest.fn(), create: jest.fn()},
};
