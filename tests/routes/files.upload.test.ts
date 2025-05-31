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

// Helper to manage environment variables for tests
const originalEnv = { ...process.env };

const setupEnv = (envConfig: Record<string, string | undefined>) => {
  for (const key in envConfig) {
    if (envConfig[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = envConfig[key];
    }
  }
};

const restoreEnv = () => {
  process.env = { ...originalEnv };
};

test.describe('POST /api/files/upload', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (S3Client as jest.Mock).mockClear();
    (PutObjectCommand as jest.Mock).mockClear();
    mockS3Send.mockClear();
    (jest.requireMock('@/app/(auth)/auth') as any).auth.mockResolvedValue({ user: { id: 'test-user-id' } });
  });

  afterEach(() => {
    restoreEnv(); // Restore original environment variables after each test
  });

  test('should upload a file to AWS S3 (default) and return the S3 URL', async () => {
    setupEnv({
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      S3_BUCKET_NAME: 'test-bucket',
      S3_ENDPOINT_URL: undefined,
      S3_FORCE_PATH_STYLE: undefined,
    });

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

    // 1. Assert S3Client was called with correct parameters for AWS S3
    const s3ClientInstanceCall = (S3Client as jest.Mock).mock.calls[0][0];
    expect(s3ClientInstanceCall.region).toBe('us-east-1');
    expect(s3ClientInstanceCall.credentials.accessKeyId).toBe('test-access-key');
    expect(s3ClientInstanceCall.credentials.secretAccessKey).toBe('test-secret-key');
    expect(s3ClientInstanceCall.endpoint).toBeUndefined();
    expect(s3ClientInstanceCall.forcePathStyle).toBeUndefined();


    // 2. Assert PutObjectCommand was instantiated correctly and send was called
    expect(mockS3Send).toHaveBeenCalled();
    const putCommandInstance = (PutObjectCommand as jest.Mock).mock.calls[0][0];
    expect(putCommandInstance.Bucket).toBe('test-bucket');
    expect(putCommandInstance.Key).toBe('test-image.png');
    expect(putCommandInstance.ContentType).toBe('image/png');
    expect(putCommandInstance.ACL).toBe('public-read');


    // 3. Assert the response is successful and contains the standard AWS S3 URL
    expect(response.status).toBe(200);
    expect(responseBody.url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/test-image.png');
  });

  test('should upload a file to custom S3 endpoint with path style and return the custom URL', async () => {
    setupEnv({
      AWS_REGION: 'us-west-2', // Different region for this test
      AWS_ACCESS_KEY_ID: 'custom-access-key',
      AWS_SECRET_ACCESS_KEY: 'custom-secret-key',
      S3_BUCKET_NAME: 'custom-bucket',
      S3_ENDPOINT_URL: 'http://localhost:9000',
      S3_FORCE_PATH_STYLE: 'true',
    });

    const mockFile = new Blob(['custom dummy content'], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', mockFile, 'custom-image.jpg');

    const request = new NextRequest('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    // 1. Assert S3Client was called with custom endpoint and forcePathStyle
    const s3ClientInstanceCall = (S3Client as jest.Mock).mock.calls[0][0];
    expect(s3ClientInstanceCall.region).toBe('us-west-2');
    expect(s3ClientInstanceCall.credentials.accessKeyId).toBe('custom-access-key');
    expect(s3ClientInstanceCall.credentials.secretAccessKey).toBe('custom-secret-key');
    expect(s3ClientInstanceCall.endpoint).toBe('http://localhost:9000');
    expect(s3ClientInstanceCall.forcePathStyle).toBe(true);

    // 2. Assert PutObjectCommand was instantiated correctly
    expect(mockS3Send).toHaveBeenCalled();
    const putCommandInstance = (PutObjectCommand as jest.Mock).mock.calls[0][0];
    expect(putCommandInstance.Bucket).toBe('custom-bucket');
    expect(putCommandInstance.Key).toBe('custom-image.jpg');
    expect(putCommandInstance.ContentType).toBe('image/jpeg');
    expect(putCommandInstance.ACL).toBe('public-read');

    // 3. Assert the response is successful and contains the custom path-style URL
    expect(response.status).toBe(200);
    expect(responseBody.url).toBe('http://localhost:9000/custom-bucket/custom-image.jpg');
  });

  test('should upload a file to custom S3 endpoint without path style (virtual hosted) and return the custom URL', async () => {
    setupEnv({
      AWS_REGION: 'eu-central-1',
      AWS_ACCESS_KEY_ID: 'another-access-key',
      AWS_SECRET_ACCESS_KEY: 'another-secret-key',
      S3_BUCKET_NAME: 'another-bucket',
      S3_ENDPOINT_URL: 'https://s3.custom-provider.com',
      S3_FORCE_PATH_STYLE: 'false', // Explicitly false
    });

    const mockFile = new Blob(['another dummy content'], { type: 'image/gif' });
    const formData = new FormData();
    formData.append('file', mockFile, 'another-image.gif');

    const request = new NextRequest('http://localhost/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const responseBody = await response.json();

    // 1. Assert S3Client was called with custom endpoint and forcePathStyle: false
    const s3ClientInstanceCall = (S3Client as jest.Mock).mock.calls[0][0];
    expect(s3ClientInstanceCall.region).toBe('eu-central-1');
    expect(s3ClientInstanceCall.endpoint).toBe('https://s3.custom-provider.com');
    expect(s3ClientInstanceCall.forcePathStyle).toBe(false);


    // 2. Assert PutObjectCommand
    const putCommandInstance = (PutObjectCommand as jest.Mock).mock.calls[0][0];
    expect(putCommandInstance.Bucket).toBe('another-bucket');
    expect(putCommandInstance.Key).toBe('another-image.gif');


    // 3. Assert the response URL (URL construction logic in route might need to be robust for virtual-hosted with custom endpoint)
    // The current route logic for URL construction when S3_ENDPOINT_URL is set and forcePathStyle is false defaults to:
    // `${process.env.S3_ENDPOINT_URL}/${process.env.S3_BUCKET_NAME}/${filename}`
    // This is more typical of path-style. A true virtual-hosted style URL would be like:
    // `https://another-bucket.s3.custom-provider.com/another-image.gif`
    // For this test, we assert against the current implementation's output.
    // If the route's URL construction for this case changes, this assertion needs to change.
    expect(response.status).toBe(200);
    expect(responseBody.url).toBe('https://s3.custom-provider.com/another-bucket/another-image.gif');
  });


  test('should return 401 if user is not authenticated', async () => {
    setupEnv({ S3_BUCKET_NAME: 'any-bucket' }); // Minimal env for this test
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
    setupEnv({ S3_BUCKET_NAME: 'any-bucket' }); // Minimal env for this test
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
