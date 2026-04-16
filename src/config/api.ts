export const API = {
  TREES: 'https://functions.poehali.dev/1b6d0efc-fd2f-47f8-bbb8-13e7b83d6536',
  HEDGES: 'https://functions.poehali.dev/fbccade8-1a6c-460a-bbe4-c25ceb03129c',
  AUTH: 'https://functions.poehali.dev/4f508270-f2b5-4829-a964-26aad4952e13',
  UPLOAD: 'https://functions.poehali.dev/1e1ccb94-3105-4500-95aa-0902c3e7a44f',
  PKK_PROXY: 'https://functions.poehali.dev/74f2f735-ecae-4a92-98fc-e51c90e65de2',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'tree_auth_token',
  TREES_CACHE: 'trees_cache',
  HEDGES_CACHE: 'hedges_cache',
} as const;
