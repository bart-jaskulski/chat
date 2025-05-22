import { test, expect } from '@playwright/test';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { POST } from '@/app/(chat)/api/files/upload/route'; // Adjust path as necessary
import { NextRequest } from 'next/server';

// Mock the S3 client
let mockS3Send = (..._args: any[]) => {};
jest.mock('@aws-sdk/client-s3', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-s3');
  mockS3Send = jest.fn();
  return {
    ...originalModule,
    S3Client: jest.fn(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: jest.fn((args) => new originalModule.PutObjectCommand(args)), // Use actual PutObjectCommand for inspection
  };
});

// Mock auth function
jest.mock('@/app/(auth)/auth', () => ({
  auth: jest.fn(async () => ({ user: { id: 'test-user-id' } })),
}));

test.describe('POST /api/files/upload', () => {
  test('should upload a file to S3 and return the S3 URL', async () => {
    // Mock environment variables for S3
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
    process.env.S3_BUCKET_NAME = 'test-bucket';

    const mockFile = new Blob(['dummy content'], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', mockFile, 'test-image.png');

    // Create a mock NextRequest
    // Note: Constructing NextRequest with FormData directly can be tricky in non-Next.js envs.
    // This is a simplified representation. In a real test environment, you might need a helper
    // or a more direct way to invoke the route handler with a mock request object.
    const request = new NextRequest('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
      // Headers might be needed if your handler checks them
    });


    const response = await POST(request);
    const responseBody = await response.json();

    // 1. Assert S3Client was called with correct parameters
    expect(S3Client).toHaveBeenCalledWith({
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'test-access-key',
        secretAccessKey: 'test-secret-key',
      },
    });

    // 2. Assert PutObjectCommand was instantiated correctly and send was called
    expect(mockS3Send).toHaveBeenCalled();
    const putCommandInstance = (PutObjectCommand as jest.Mock).mock.calls[0][0];
    expect(putCommandInstance.Bucket).toBe('test-bucket');
    expect(putCommandInstance.Key).toBe('test-image.png');
    // expect(putCommandInstance.Body).toBeInstanceOf(Buffer); // Body will be transformed to Buffer
    expect(putCommandInstance.ContentType).toBe('image/png');
    expect(putCommandInstance.ACL).toBe('public-read');


    // 3. Assert the response is successful and contains the S3 URL
    expect(response.status).toBe(200);
    expect(responseBody.url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/test-image.png');

    // Clean up env variables if set
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET_NAME;
  });

  test('should return 401 if user is not authenticated', async () => {
    (jest.requireMock('@/app/(auth)/auth') as any).auth.mockResolvedValueOnce(null);

    const mockFile = new Blob(['dummy content'], { type: 'image/png' });
    const formData = new FormData();
    formData.append('file', mockFile, 'test-image.png');

    const request = new NextRequest('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('Unauthorized');
  });

  test('should return 400 if no file is uploaded', async () => {
    const formData = new FormData(); // Empty form data

    const request = new NextRequest('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.error).toBe('No file uploaded');
  });
});
