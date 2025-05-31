import { expect, test } from '../fixtures';
import { generateUUID } from '@/lib/utils';
import { chatModels } from '@/lib/ai/models';

const createdPersonaIdsAda: string[] = [];
// const createdPersonaIdsBabbage: string[] = []; // If needed for inter-user tests

test.describe.serial('/api/personas', () => {
  const defaultModelId = chatModels[0]?.id || 'chat-model'; // Fallback, ensure chatModels is not empty

  // Test POST /api/personas
  test('Ada can create a new persona', async ({ adaContext }) => {
    const personaData = {
      name: 'Test Persona Ada 1',
      systemPrompt: 'You are a helpful test assistant for Ada.',
      modelId: defaultModelId,
      temperature: 0.7,
      topP: 0.9,
    };

    const response = await adaContext.request.post('/api/personas', {
      data: personaData,
    });

    expect(response.status()).toBe(201); // Check for Created status
    const createdPersona = await response.json();

    expect(createdPersona).toHaveProperty('id');
    expect(createdPersona.name).toBe(personaData.name);
    expect(createdPersona.systemPrompt).toBe(personaData.systemPrompt);
    expect(createdPersona.modelId).toBe(personaData.modelId);
    expect(createdPersona.temperature).toBe(personaData.temperature);
    expect(createdPersona.topP).toBe(personaData.topP);
    expect(createdPersona.userId).toBeDefined(); // Should be Ada's user ID

    createdPersonaIdsAda.push(createdPersona.id);
  });

  test('Ada cannot create a persona with missing required fields', async ({ adaContext }) => {
    const response = await adaContext.request.post('/api/personas', {
      data: {
        // name is missing
        systemPrompt: 'This should fail.',
        modelId: defaultModelId,
      },
    });
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('Missing required fields');
  });


  // Test GET /api/personas
  test('Ada can fetch her personas', async ({ adaContext }) => {
    const response = await adaContext.request.get('/api/personas');
    expect(response.status()).toBe(200);
    const personas = await response.json();

    expect(Array.isArray(personas)).toBe(true);
    expect(personas.length).toBeGreaterThanOrEqual(1); // At least the one created above

    const foundPersona = personas.find((p: any) => p.id === createdPersonaIdsAda[0]);
    expect(foundPersona).toBeDefined();
    expect(foundPersona.name).toBe('Test Persona Ada 1');
  });

  // Test GET /api/personas/[personaId]
  test('Ada can fetch her specific persona by ID', async ({ adaContext }) => {
    const personaId = createdPersonaIdsAda[0];
    if (!personaId) throw new Error('No persona ID available for GET test');

    const response = await adaContext.request.get(`/api/personas/${personaId}`);
    expect(response.status()).toBe(200);
    const persona = await response.json();

    expect(persona.id).toBe(personaId);
    expect(persona.name).toBe('Test Persona Ada 1');
  });

  test('Ada cannot fetch a non-existent persona by ID', async ({ adaContext }) => {
    const nonExistentId = generateUUID();
    const response = await adaContext.request.get(`/api/personas/${nonExistentId}`);
    expect(response.status()).toBe(404); // Assuming API returns 404 for not found
    const error = await response.json();
    expect(error.error).toBe('Persona not found or access denied');
  });


  // Test PUT /api/personas/[personaId]
  test('Ada can update her persona', async ({ adaContext }) => {
    const personaId = createdPersonaIdsAda[0];
    if (!personaId) throw new Error('No persona ID available for PUT test');

    const updateData = {
      name: 'Updated Test Persona Ada 1',
      systemPrompt: 'You are an updated test assistant for Ada.',
      temperature: 0.5,
    };

    const response = await adaContext.request.put(`/api/personas/${personaId}`, {
      data: updateData,
    });
    expect(response.status()).toBe(200);
    const updatedPersona = await response.json();

    expect(updatedPersona.id).toBe(personaId);
    expect(updatedPersona.name).toBe(updateData.name);
    expect(updatedPersona.systemPrompt).toBe(updateData.systemPrompt);
    expect(updatedPersona.temperature).toBe(updateData.temperature);
    // modelId and topP should remain unchanged from the original creation
    expect(updatedPersona.modelId).toBe(defaultModelId);
    expect(updatedPersona.topP).toBe(0.9);
  });

  test('Ada cannot update a persona with only undefined fields', async ({ adaContext }) => {
    const personaId = createdPersonaIdsAda[0];
    if (!personaId) throw new Error('No persona ID available for PUT empty test');

    const response = await adaContext.request.put(`/api/personas/${personaId}`, {
      data: {}, // No fields to update
    });
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('No fields to update');
  });

  // Test Authorization - Babbage tries to access Ada's persona
  test("Babbage cannot fetch Ada's specific persona by ID", async ({ babbageContext }) => {
    const personaIdAda = createdPersonaIdsAda[0];
    if (!personaIdAda) throw new Error("Ada's persona ID not available for Babbage's GET test");

    const response = await babbageContext.request.get(`/api/personas/${personaIdAda}`);
    expect(response.status()).toBe(404); // Or 403, depending on API design (404 hides existence)
    const error = await response.json();
    expect(error.error).toBe('Persona not found or access denied');
  });

  test("Babbage cannot update Ada's persona", async ({ babbageContext }) => {
    const personaIdAda = createdPersonaIdsAda[0];
    if (!personaIdAda) throw new Error("Ada's persona ID not available for Babbage's PUT test");

    const updateData = { name: "Babbage's malicious update" };
    const response = await babbageContext.request.put(`/api/personas/${personaIdAda}`, {
      data: updateData,
    });
    expect(response.status()).toBe(404); // Or 403
    const error = await response.json();
    expect(error.error).toBe('Persona not found or access denied');
  });

  // Test DELETE /api/personas/[personaId]
   test("Babbage cannot delete Ada's persona", async ({ babbageContext }) => {
    const personaIdAda = createdPersonaIdsAda[0];
    if (!personaIdAda) throw new Error("Ada's persona ID not available for Babbage's DELETE test");

    const response = await babbageContext.request.delete(`/api/personas/${personaIdAda}`);
    expect(response.status()).toBe(404); // Or 403
    const error = await response.json();
    expect(error.error).toBe('Persona not found or access denied');
  });

  test('Ada can delete her persona', async ({ adaContext }) => {
    const personaId = createdPersonaIdsAda[0];
    if (!personaId) throw new Error('No persona ID available for DELETE test');

    const response = await adaContext.request.delete(`/api/personas/${personaId}`);
    expect(response.status()).toBe(200); // Or 204 if no content
    const result = await response.json();
    expect(result.message).toBe('Persona deleted successfully');

    // Verify it's actually deleted by trying to fetch it
    const fetchResponse = await adaContext.request.get(`/api/personas/${personaId}`);
    expect(fetchResponse.status()).toBe(404);

    // Remove from our tracking array
    const index = createdPersonaIdsAda.indexOf(personaId);
    if (index > -1) {
      createdPersonaIdsAda.splice(index, 1);
    }
  });

  // TODO: Add a test.afterAll or similar to clean up any personas if tests fail mid-way
  // For now, successful delete test handles cleanup for the happy path.
});

// Placeholder for Chat with Persona integration tests
test.describe.serial('/api/chat with Persona', () => {
  const defaultModelId = chatModels[0]?.id || 'chat-model';
  let adaPersonaIdForChatTest: string;

  test.beforeAll(async ({ adaContext }) => {
    // Create a persona specifically for these chat tests
    const personaData = {
      name: 'Chat Test Persona Ada',
      systemPrompt: 'You are a specialized chat test assistant.',
      modelId: defaultModelId,
      temperature: 0.2,
      topP: 0.8,
    };
    const response = await adaContext.request.post('/api/personas', { data: personaData });
    if (response.status() !== 201) {
      console.error("Failed to create persona for chat tests:", await response.text());
      throw new Error('Failed to create persona for chat tests');
    }
    const createdPersona = await response.json();
    adaPersonaIdForChatTest = createdPersona.id;
  });

  test('Ada can invoke chat generation using a persona', async ({ adaContext }) => {
    if (!adaPersonaIdForChatTest) throw new Error('Persona for chat test not created');

    const chatId = generateUUID();
    const userMessage = {
      id: generateUUID(),
      role: 'user' as const,
      content: 'Tell me a short story based on my persona.',
      parts: [{ type: 'text' as const, text: 'Tell me a short story based on my persona.' }],
      createdAt: new Date(),
    };

    const response = await adaContext.request.post('/api/chat', {
      data: {
        id: chatId,
        message: userMessage,
        selectedChatModel: defaultModelId, // This is the base model for the persona
        selectedVisibilityType: 'private',
        // Persona specific fields
        personaId: adaPersonaIdForChatTest,
        personaSystemPrompt: 'You are a specialized chat test assistant.', // Send again for verification
        personaTemperature: 0.2,
        personaTopP: 0.8,
      },
    });
    expect(response.status()).toBe(200);

    const text = await response.text();
    // Basic check: Ensure the stream is not empty and doesn't immediately indicate an error.
    // Verifying the *content* based on persona settings is hard without mocking.
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toContain('Error');
    expect(text).not.toContain('Oops, an error occurred!');

    // TODO: If possible, mock the AI SDK call to verify parameters.
    // For now, a successful response (200) and a non-empty stream is the primary check.
  });

  test.afterAll(async ({ adaContext }) => {
    // Clean up the persona created for chat tests
    if (adaPersonaIdForChatTest) {
      const response = await adaContext.request.delete(`/api/personas/${adaPersonaIdForChatTest}`);
      if (response.status() !== 200 && response.status() !== 204) {
         console.error(`Failed to clean up chat test persona ${adaPersonaIdForChatTest}: ${response.status()}`);
      }
    }
  });
});
