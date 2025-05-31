import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db/db';
import { persona } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT /api/personas/[personaId]
export async function PUT(request: Request, { params }: { params: { personaId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { personaId } = params;

    const body = await request.json();
    const { name, systemPrompt, modelId, temperature, topP } = body;

    if (!name && !systemPrompt && !modelId && temperature === undefined && topP === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Verify persona exists and belongs to the user
    const [existingPersona] = await db
      .select()
      .from(persona)
      .where(and(eq(persona.id, personaId), eq(persona.userId, userId)));

    if (!existingPersona) {
      return NextResponse.json({ error: 'Persona not found or access denied' }, { status: 404 });
    }

    const updateData: Partial<typeof persona.$inferInsert> = {};
    if (name) updateData.name = name;
    if (systemPrompt) updateData.systemPrompt = systemPrompt;
    if (modelId) updateData.modelId = modelId;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (topP !== undefined) updateData.topP = topP;

    const [updatedPersona] = await db
      .update(persona)
      .set(updateData)
      .where(and(eq(persona.id, personaId), eq(persona.userId, userId)))
      .returning();

    return NextResponse.json(updatedPersona);
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/personas/[personaId]
export async function DELETE(request: Request, { params }: { params: { personaId: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { personaId } = params;

    // Verify persona exists and belongs to the user before deleting
    const [existingPersona] = await db
      .select({ id: persona.id }) // Select only necessary field for verification
      .from(persona)
      .where(and(eq(persona.id, personaId), eq(persona.userId, userId)));

    if (!existingPersona) {
      return NextResponse.json({ error: 'Persona not found or access denied' }, { status: 404 });
    }

    await db
      .delete(persona)
      .where(and(eq(persona.id, personaId), eq(persona.userId, userId)));

    return NextResponse.json({ message: 'Persona deleted successfully' }, { status: 200 }); // Or 204 No Content
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
