import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { ENV } from "./_core/env.js";

const isS3Configured = !!(
  ENV.s3Bucket &&
  ENV.s3AccessKeyId &&
  ENV.s3SecretAccessKey
);

let s3Client: S3Client | null = null;

if (isS3Configured) {
  s3Client = new S3Client({
    region: ENV.s3Region,
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
    endpoint: ENV.s3Endpoint || undefined,
    forcePathStyle: !!ENV.s3Endpoint, // Required for some S3-compatible providers
  });
}

/**
 * Uploads a file to storage (S3 or Local)
 * @param key The destination path/filename
 * @param body The file content (Buffer)
 * @param contentType The MIME type
 * @returns Object with the public URL
 */
export async function storagePut(
  key: string,
  body: Buffer,
  contentType: string
): Promise<{ url: string }> {
  if (s3Client && ENV.s3Bucket) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: ENV.s3Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );

      // Construct public URL. This assumes the bucket/provider has a standard URL schema.
      // If using a custom endpoint, it might need adjustment.
      const url = ENV.s3Endpoint
        ? `${ENV.s3Endpoint}/${ENV.s3Bucket}/${key}`
        : `https://${ENV.s3Bucket}.s3.${ENV.s3Region}.amazonaws.com/${key}`;

      return { url };
    } catch (error) {
      console.error("[Storage] S3 Upload failed, falling back to local:", error);
    }
  }

  // Local Fallback
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, key);
  const fileDir = path.dirname(filePath);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true });
  }

  fs.writeFileSync(filePath, body);

  // Return a relative URL that the express server will serve
  return { url: `/uploads/${key}` };
}
