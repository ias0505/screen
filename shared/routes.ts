import { z } from 'zod';
import { insertScreenSchema, insertMediaItemSchema, insertScheduleSchema, screens, mediaItems, schedules } from './schema';

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
