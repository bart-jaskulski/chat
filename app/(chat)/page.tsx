import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import { getUserPersonaById } from '@/lib/db/queries'; // Import the new query
import { Persona } from '@/lib/types'; // Import Persona type

const PERSONA_ID_PREFIX = 'persona_';

export default async function Page() {
  const session = await auth();

  if (!session?.user?.id) { // Ensure user.id exists for persona fetching
    // Redirect to guest or login. For simplicity, guest if no session, error if session but no id.
    if (!session) redirect('/api/auth/guest');
    console.error("Session exists but user ID is missing.");
    // Potentially redirect to an error page or login
    return <p>Error: User session is invalid.</p>;
  }

  const userId = session.user.id;
  const chatId = generateUUID(); // Renamed id to chatId for clarity

  const cookieStore = await cookies();
  const modelOrPersonaIdFromCookie = cookieStore.get('chat-model')?.value;

  let initialChatModel = DEFAULT_CHAT_MODEL;
  let initialPersonaSettings: Persona | null = null;

  if (modelOrPersonaIdFromCookie) {
    if (modelOrPersonaIdFromCookie.startsWith(PERSONA_ID_PREFIX)) {
      const personaId = modelOrPersonaIdFromCookie.substring(PERSONA_ID_PREFIX.length);
      try {
        const persona = await getUserPersonaById(userId, personaId);
        if (persona) {
          initialPersonaSettings = { // Map DBPersona to Persona if necessary, assuming they are compatible for now
            id: persona.id,
            userId: persona.userId,
            name: persona.name,
            systemPrompt: persona.systemPrompt,
            modelId: persona.modelId, // This is the base model ID
            temperature: persona.temperature ?? undefined, // Handle null from DB
            topP: persona.topP ?? undefined, // Handle null from DB
            createdAt: persona.createdAt,
          };
          initialChatModel = persona.modelId; // Use persona's base model
        } else {
          console.warn(`Persona with id ${personaId} not found for user ${userId}. Falling back to default model.`);
          // Optionally, clear the invalid cookie here
        }
      } catch (error) {
        console.error(`Error fetching persona ${personaId}:`, error);
        // Fallback to default model on error
      }
    } else {
      initialChatModel = modelOrPersonaIdFromCookie;
    }
  }

  return (
    <>
      <Chat
        key={chatId}
        id={chatId}
        initialMessages={[]}
        initialChatModel={initialChatModel}
        initialPersonaSettings={initialPersonaSettings} // Pass down persona settings
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler id={chatId} />
    </>
  );
}
