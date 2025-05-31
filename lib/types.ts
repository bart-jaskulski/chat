export type DataPart = { type: 'append-message'; message: string };

export interface Persona {
  id: string; // unique identifier
  userId: string; // foreign key to the user table
  name: string; // user-defined name for the persona
  systemPrompt: string; // custom system prompt
  modelId: string; // ID of the base model, e.g., 'chat-model', 'chat-model-reasoning'
  temperature?: number; // optional, model-specific parameter
  topP?: number; // optional, model-specific parameter
  createdAt: Date; // Or string if serialized, to be confirmed with DB schema
}
