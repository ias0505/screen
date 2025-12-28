import { z } from 'zod';
import { 
  insertScreenSchema, insertMediaItemSchema, insertScheduleSchema, 
  insertScreenGroupSchema, insertMediaGroupSchema,
  screens, mediaItems, schedules, screenGroups, mediaGroups 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  screenGroups: {
    list: {
      method: 'GET' as const,
      path: '/api/screen-groups',
      responses: {
        200: z.array(z.custom<typeof screenGroups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/screen-groups',
      input: insertScreenGroupSchema,
      responses: {
        201: z.custom<typeof screenGroups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  mediaGroups: {
    list: {
      method: 'GET' as const,
      path: '/api/media-groups',
      responses: {
        200: z.array(z.custom<typeof mediaGroups.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/media-groups',
      input: insertMediaGroupSchema,
      responses: {
        201: z.custom<typeof mediaGroups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  screens: {
    list: {
      method: 'GET' as const,
      path: '/api/screens',
      responses: {
        200: z.array(z.custom<typeof screens.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/screens',
      input: insertScreenSchema,
      responses: {
        201: z.custom<typeof screens.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/screens/:id',
      responses: {
        200: z.custom<typeof screens.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/screens/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/screens/:id',
      input: z.object({
        groupId: z.number().nullable(),
      }),
      responses: {
        200: z.custom<typeof screens.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  media: {
    list: {
      method: 'GET' as const,
      path: '/api/media',
      responses: {
        200: z.array(z.custom<typeof mediaItems.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/media',
      input: insertMediaItemSchema,
      responses: {
        201: z.custom<typeof mediaItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/media/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  schedules: {
    list: {
      method: 'GET' as const,
      path: '/api/screens/:screenId/schedules',
      responses: {
        200: z.array(z.custom<typeof schedules.$inferSelect & { mediaItem: typeof mediaItems.$inferSelect }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schedules',
      input: insertScheduleSchema,
      responses: {
        201: z.custom<typeof schedules.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/schedules/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
