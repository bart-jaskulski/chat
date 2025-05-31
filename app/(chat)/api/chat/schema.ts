import { z } from 'zod';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    role: z.enum(['user']),
    content: z.string().min(1).max(2000),
    parts: z.array(textPartSchema),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg']),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning']),
  selectedVisibilityType: z.enum(['public', 'private']),
  // Persona settings - all optional
  personaId: z.string().uuid().optional(),
  personaSystemPrompt: z.string().max(4000).optional(), // Max length assumption
  personaTemperature: z.number().min(0).max(2).optional(),
  personaTopP: z.number().min(0).max(1).optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
