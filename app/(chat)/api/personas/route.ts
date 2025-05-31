import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/db';
import { persona } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateUUID } from '@/lib/utils';

// GET /api/personas
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const userPersonas = await db
      .select()
      .from(persona)
      .where(eq(persona.userId, userId));

    return NextResponse.json(userPersonas);
  } catch (error) {
    console.error('Error fetching personas:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/personas
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { name, systemPrompt, modelId, temperature, topP } = body;

    if (!name || !systemPrompt || !modelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPersonaData = {
      id: generateUUID(),
      userId,
      name,
      systemPrompt,
      modelId,
      temperature,
      topP,
      createdAt: new Date(),
    };

    const [createdPersona] = await db.insert(persona).values(newPersonaData).returning();

    return NextResponse.json(createdPersona, { status: 201 });
  } catch (error) {
    console.error('Error creating persona:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
