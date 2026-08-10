import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Redis from 'ioredis';
import { Bucket, UploadType } from './storage.enums';

@Injectable()
export class StorageService {
  private readonly mediaClient: S3Client;
  private readonly restrictedClient: S3Client;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly config: ConfigService
  ) {
    this.mediaClient = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('storage.r2Endpoint')!,
      credentials: {
        accessKeyId: this.config.get<string>('storage.r2AccessKey')!,
        secretAccessKey: this.config.get<string>('storage.r2SecretKey')!,
      },
    });

    this.restrictedClient = new S3Client({
      region: 'auto',
      endpoint: this.config.get<string>('storage.r2Endpoint')!,
      credentials: {
        accessKeyId: this.config.get<string>('storage.r2RestrictedAccessKey')!,
        secretAccessKey: this.config.get<string>(
          'storage.r2RestrictedSecretKey'
        )!,
      },
    });
  }

  /**
   * Enforces directory path construction for all upload types (FILE-05 through FILE-09).
   * Callers cannot specify arbitrary paths — all paths are determined by upload type.
   */
  buildPath(type: UploadType, ids: Record<string, string>): string {
    switch (type) {
      case UploadType.PHOTO:
        return `photos/${ids.userId}/${ids.ownerId}/${ids.photoId}_${ids.size}.jpg`;
      case UploadType.AVATAR:
        return `avatars/${ids.userId}/${ids.ownerId}_avatar.jpg`;
      case UploadType.ATTACHMENT:
        return `attachments/${ids.userId}/${ids.parentId}/${ids.attachmentId}.jpg`;
      case UploadType.DOCUMENT:
        return `documents/${ids.userId}/${ids.documentId}_${ids.type}`;
      default:
        throw new Error(`Unknown upload type: ${String(type)}`);
    }
  }

  /** Resolve a logical bucket to its deployment-specific name. */
  private bucketName(bucket: Bucket): string {
    const name = this.config.get<string>(`storage.buckets.${bucket}`);
    if (!name) {
      throw new Error(
        `No bucket configured for ${bucket} (set R2_BUCKET_${bucket})`
      );
    }
    return name;
  }

  /**
   * Uploads a file to the specified R2 bucket.
   * Returns the key for subsequent signed URL retrieval. (FILE-01)
   */
  async upload(
    bucket: Bucket,
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<string> {
    const client = this.getClient(bucket);
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucketName(bucket),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return key;
  }

  /**
   * Returns a signed URL with 1-hour expiry. (FILE-03)
   * Cached in Redis with 50-minute TTL to avoid redundant presign calls.
   * Cache is invalidated on delete.
   */
  async getSignedUrl(bucket: Bucket, key: string): Promise<string> {
    const cacheKey = `signed_url:${bucket}:${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const client = this.getClient(bucket);
    const command = new GetObjectCommand({
      Bucket: this.bucketName(bucket),
      Key: key,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 }); // 1 hour

    await this.redis.setex(cacheKey, 3000, url); // Cache for 50 min (3000 seconds)
    return url;
  }

  /**
   * Deletes a file from R2 and invalidates its cached signed URL.
   */
  async delete(bucket: Bucket, key: string): Promise<void> {
    const client = this.getClient(bucket);
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName(bucket), Key: key })
    );
    await this.redis.del(`signed_url:${bucket}:${key}`);
  }

  /**
   * Selects the appropriate S3Client based on bucket.
   * RESTRICTED uses separate IAM credentials (FILE-04).
   * MEDIA and STATIC share the mediaClient credentials.
   */
  private getClient(bucket: Bucket): S3Client {
    return bucket === Bucket.RESTRICTED
      ? this.restrictedClient
      : this.mediaClient;
  }
}
