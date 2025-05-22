import { NextResponse } from 'next/server';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

import { auth } from '@/app/(auth)/auth';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => ['image/jpeg', 'image/png'].includes(file.type), {
      message: 'File type should be JPEG or PNG',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const putCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: filename, // Or a more structured path like `uploads/${filename}`
        Body: Buffer.from(fileBuffer), // Ensure Body is Buffer
        ContentType: file.type, // Make sure to set ContentType
        ACL: 'public-read', // If files need to be publicly accessible directly via S3 URL.
                           // NOTE: For enhanced security in the long term, consider keeping objects private
                           // and generating pre-signed URLs on demand via a separate backend endpoint.
                           // This would involve using `@aws-sdk/s3-request-presigner`'s `getSignedUrl`
                           // with `GetObjectCommand`.
      });

      await s3Client.send(putCommand);

      // Construct the S3 object URL
      const s3ObjectUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

      return NextResponse.json({ url: s3ObjectUrl });
    } catch (error) {
      console.error('S3 Upload Error:', error); // Log the specific error
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
