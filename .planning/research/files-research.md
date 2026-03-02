# File Processing Research: PoshPet Backend

**Domain:** Image processing, file storage, encryption, PDF generation for a luxury pet care app
**Researched:** 2026-03-02
**Overall Confidence:** HIGH (Sharp, AWS SDK, BullMQ, PDFKit are mature, well-documented libraries with direct npm verification)

---

## Table of Contents

1. [Image Processing](#1-image-processing)
2. [Storage Patterns (S3/R2)](#2-storage-patterns-s3r2)
3. [Background Job Processing](#3-background-job-processing)
4. [Encryption (Time Capsules)](#4-encryption-time-capsules)
5. [PDF Generation](#5-pdf-generation)
6. [NestJS File Upload Integration](#6-nestjs-file-upload-integration)
7. [Recommended Package Manifest](#7-recommended-package-manifest)
8. [Architecture: Full Upload-to-Delivery Pipeline](#8-architecture-full-upload-to-delivery-pipeline)
9. [Pitfalls and Warnings](#9-pitfalls-and-warnings)
10. [Sources and Confidence](#10-sources-and-confidence)

---

## 1. Image Processing

### Recommendation: Sharp (v0.34.5)

**Confidence: HIGH** -- Sharp is the de facto standard for Node.js image processing. It wraps libvips (a C library), making it 4-10x faster than pure-JS alternatives. Verified via npm: `sharp@0.34.5`.

#### Why Sharp, Not Jimp

| Criterion | Sharp (v0.34.5) | Jimp (v1.6.0) |
|-----------|-----------------|----------------|
| Engine | libvips (native C bindings) | Pure JavaScript |
| Speed (resize 2000px JPEG) | ~50ms | ~500-800ms |
| Memory usage | Streaming, low footprint | Loads full bitmap into JS heap |
| EXIF stripping | Built-in (`.withMetadata(false)` or simply omit `.withMetadata()`) | Requires separate library |
| Output formats | JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG | JPEG, PNG, BMP, TIFF, GIF |
| WebP/AVIF support | Native, high quality | No AVIF, limited WebP |
| Install complexity | Pre-built binaries, no system deps needed | Zero native deps |
| Active maintenance | Very active, regular releases | Active but less frequent |

**Decision: Use Sharp.** The 10x speed difference matters when processing 3 variants per upload. Sharp's native EXIF stripping eliminates an entire dependency. Jimp's only advantage (zero native deps) is irrelevant since Sharp ships pre-built binaries for all platforms including Docker (linux-x64, linux-arm64).

#### 3-Size Processing Pipeline

```typescript
import sharp from 'sharp';

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

interface ImageVariants {
  thumbnail: ProcessedImage;
  medium: ProcessedImage;
  original: ProcessedImage;
}

async function processImagePipeline(
  inputBuffer: Buffer,
): Promise<ImageVariants> {
  // Create a single Sharp instance from input -- reads file once
  // Sharp automatically strips EXIF/metadata unless .withMetadata() is called
  const pipeline = sharp(inputBuffer, {
    // Limit memory for large images
    limitInputPixels: 4096 * 4096, // max 16 megapixels
    // Rotate based on EXIF orientation before stripping metadata
    failOn: 'truncated',
  }).rotate(); // Auto-rotate based on EXIF orientation BEFORE stripping

  // Get original metadata for aspect ratio
  const metadata = await pipeline.metadata();

  // Process all 3 sizes in parallel from the same input
  const [thumbnail, medium, original] = await Promise.all([
    // Thumbnail: 150px, aggressive compression
    sharp(inputBuffer)
      .rotate()
      .resize(150, 150, {
        fit: 'cover',
        position: 'attention', // Smart crop -- focuses on interesting region
      })
      .jpeg({ quality: 70, progressive: true })
      .toBuffer({ resolveWithObject: true }),

    // Medium: 600px wide, maintain aspect ratio
    sharp(inputBuffer)
      .rotate()
      .resize(600, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer({ resolveWithObject: true }),

    // Original: max 4096px, light compression, strip metadata
    sharp(inputBuffer)
      .rotate()
      .resize(4096, 4096, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer({ resolveWithObject: true }),
  ]);

  return {
    thumbnail: {
      buffer: thumbnail.data,
      width: thumbnail.info.width,
      height: thumbnail.info.height,
      format: thumbnail.info.format,
      size: thumbnail.info.size,
    },
    medium: {
      buffer: medium.data,
      width: medium.info.width,
      height: medium.info.height,
      format: medium.info.format,
      size: medium.info.size,
    },
    original: {
      buffer: original.data,
      width: original.info.width,
      height: original.info.height,
      format: original.info.format,
      size: original.info.size,
    },
  };
}
```

#### EXIF Stripping

Sharp strips all EXIF/metadata by default. You do NOT need to do anything special -- just do not call `.withMetadata()`. The `.rotate()` call before processing is critical: it reads the EXIF orientation tag and physically rotates the image before the metadata is discarded. Without this, portrait photos will appear sideways.

**No additional EXIF library needed.** Sharp handles this natively.

#### Memory Management for Large Images

Key Sharp configuration for production:

```typescript
import sharp from 'sharp';

// Configure Sharp concurrency -- limit parallel processing threads
// Default is number of CPU cores. For a solo backend, limit to 2-4
sharp.concurrency(2);

// Configure Sharp cache -- reduces memory for repeated operations
sharp.cache({ memory: 256, files: 20, items: 200 });

// Per-image safeguards (set in constructor options):
// limitInputPixels: 4096 * 4096 (reject images over 16MP)
// failOn: 'truncated' (reject corrupted uploads)
```

**Why `sharp.concurrency(2)`:** Each Sharp worker uses ~50-100MB for large images. On a small VPS/container with 1-2GB RAM, limiting to 2 concurrent operations prevents OOM. The BullMQ worker concurrency should match this.

---

## 2. Storage Patterns (S3/R2)

### Recommendation: AWS SDK v3 (@aws-sdk/client-s3 v3.x)

**Confidence: HIGH** -- AWS SDK v3 is the current-generation SDK. Cloudflare R2 is S3-compatible and uses the same SDK. Verified via npm: `@aws-sdk/client-s3@3.1000.0`.

#### Why AWS SDK v3

- **Modular:** Install only `@aws-sdk/client-s3` (~2MB) instead of the entire AWS SDK (~300MB)
- **Tree-shakeable:** Only the commands you use get bundled
- **R2 compatible:** Cloudflare R2 implements the S3 API; same SDK works for both
- **First-party presigned URLs:** `@aws-sdk/s3-request-presigner` is the official package

#### Required Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | ^3.x | S3/R2 operations (put, get, delete, list) |
| `@aws-sdk/s3-request-presigner` | ^3.x | Generate presigned upload/download URLs |
| `@aws-sdk/lib-storage` | ^3.x | Multipart uploads with automatic chunking |

#### S3 Client Configuration (R2 Compatible)

```typescript
import { S3Client } from '@aws-sdk/client-s3';

// Works identically for both AWS S3 and Cloudflare R2
const s3Client = new S3Client({
  region: 'auto', // R2 uses 'auto', S3 uses specific region
  endpoint: process.env.S3_ENDPOINT, // R2: https://<account_id>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  // R2-specific: force path-style (required for R2)
  forcePathStyle: true,
});
```

#### Presigned URL Patterns

```typescript
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Download presigned URL (1 hour expiry as per spec)
async function getDownloadUrl(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

// Upload presigned URL (for direct-to-R2 uploads from mobile)
async function getUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  maxSizeBytes: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // Content-Length conditions are enforced via bucket policies, not presigned URLs
  });
  return getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 min for upload
}
```

#### 3-Bucket Structure

| Bucket | Contents | Access Pattern | Lifecycle |
|--------|----------|---------------|-----------|
| `poshpet-media` | Photo gallery (3 sizes), vet attachments, avatar assets | Signed download URLs (1hr) | Delete orphans after 30 days |
| `poshpet-capsules` | Time Capsule encrypted content | Signed download only after delivery date | Retain 10 years minimum |
| `poshpet-static` | App assets, default avatars, species icons | Public read or long-lived signed URLs | Immutable, versioned |

#### Key Naming Convention

```
media/
  photos/{userId}/{petId}/{photoId}/
    thumbnail.jpg
    medium.jpg
    original.jpg
  vet/{userId}/{petId}/{visitId}/{attachmentId}.{ext}

capsules/
  {userId}/{capsuleId}/
    content.enc          # AES-256 encrypted payload
    manifest.json.enc    # Encrypted metadata

static/
  species/{speciesId}/avatar-{mood}.png
  decor/{decorId}.png
```

#### Upload Strategy: Server-Side vs Presigned

**Recommendation: Server-side upload for photos (requires processing), presigned for large vet PDFs.**

- **Photo Gallery:** Client uploads to server -> Sharp processes 3 sizes -> server uploads 3 files to R2. This is necessary because the server must process the image.
- **Vet PDFs:** Client gets presigned upload URL -> uploads directly to R2 -> server validates via webhook/polling. This saves server bandwidth for large PDFs.
- **Time Capsules:** Client uploads to server -> server encrypts -> server uploads to R2. Encryption must happen server-side.

#### Cloudflare R2 vs AWS S3

**Recommendation: Cloudflare R2** for a solo developer.

| Factor | Cloudflare R2 | AWS S3 |
|--------|---------------|--------|
| Egress costs | $0 (free egress) | $0.09/GB (adds up fast for media) |
| Storage cost | $0.015/GB/mo | $0.023/GB/mo |
| Free tier | 10GB storage, 10M reads, 1M writes/mo | 5GB for 12 months |
| S3 API compatibility | Full (same SDK) | Native |
| CDN | Cloudflare CDN built-in | Requires CloudFront setup |
| Complexity | Lower (no IAM maze) | Higher (IAM, policies, regions) |

R2's zero egress fees are a significant advantage for a photo-heavy app. A pet app with 10K users serving ~100 photos/day at ~200KB average = ~60GB/mo egress. On S3 that is $5.40/mo; on R2 it is $0.

---

## 3. Background Job Processing

### Recommendation: BullMQ (v5.70.1) + @nestjs/bullmq (v11.0.4)

**Confidence: HIGH** -- BullMQ is the official successor to Bull, and `@nestjs/bullmq` is NestJS's first-party integration. Verified via npm.

#### Why BullMQ, Not Alternatives

| Criterion | BullMQ | Bull (legacy) | Agenda | pg-boss |
|-----------|--------|---------------|--------|---------|
| Maintained | Active (v5.x) | Maintenance mode | Slow | Active |
| NestJS integration | Official `@nestjs/bullmq` | Official `@nestjs/bull` (deprecated) | None | None |
| Backend | Redis (already in stack) | Redis | MongoDB | PostgreSQL |
| Features | Priority, rate limiting, job groups, delayed, repeatable | Basic queue | Cron-like | Cron-like |
| Observability | Bull Board UI | Bull Board UI | Custom | Custom |

**Decision: BullMQ.** It is already the recommended queue for NestJS. Redis is already in the stack. No new infrastructure needed.

#### Job Queue Architecture for PoshPet

```typescript
// Define queues by concern
const QUEUES = {
  IMAGE_PROCESSING: 'image-processing',  // Photo gallery pipeline
  FILE_OPERATIONS: 'file-operations',     // PDF gen, capsule encryption
  NOTIFICATIONS: 'notifications',         // Push notifications
  SCHEDULED: 'scheduled',                 // Cron-like jobs
} as const;
```

#### NestJS BullMQ Module Setup

```typescript
// app.module.ts
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: null, // Required by BullMQ
        },
        defaultJobOptions: {
          removeOnComplete: { age: 86400, count: 1000 }, // Keep 24h or 1000 jobs
          removeOnFail: { age: 604800, count: 5000 },    // Keep 7 days or 5000 failures
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'image-processing' },
      { name: 'file-operations' },
    ),
  ],
})
export class AppModule {}
```

#### Image Processing Worker

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

interface ImageProcessingJobData {
  uploadId: string;
  userId: string;
  petId: string;
  originalKey: string; // Temp storage key for raw upload
  photoId: string;
}

@Processor('image-processing', {
  concurrency: 2, // Match sharp.concurrency()
  limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute
})
export class ImageProcessingWorker extends WorkerHost {
  constructor(
    private readonly storageService: StorageService,
    private readonly sharp: SharpService,
    private readonly photoRepo: PhotoRepository,
  ) {
    super();
  }

  async process(job: Job<ImageProcessingJobData>): Promise<void> {
    const { uploadId, userId, petId, originalKey, photoId } = job.data;

    // 1. Download raw upload from temp storage
    await job.updateProgress(10);
    const rawBuffer = await this.storageService.getObject('poshpet-media', originalKey);

    // 2. Process 3 variants
    await job.updateProgress(30);
    const variants = await this.sharp.processImagePipeline(rawBuffer);

    // 3. Upload all variants to final locations
    await job.updateProgress(60);
    const basePath = `photos/${userId}/${petId}/${photoId}`;
    await Promise.all([
      this.storageService.putObject('poshpet-media', `${basePath}/thumbnail.jpg`, variants.thumbnail.buffer, 'image/jpeg'),
      this.storageService.putObject('poshpet-media', `${basePath}/medium.jpg`, variants.medium.buffer, 'image/jpeg'),
      this.storageService.putObject('poshpet-media', `${basePath}/original.jpg`, variants.original.buffer, 'image/jpeg'),
    ]);

    // 4. Update database record with final URLs and dimensions
    await job.updateProgress(90);
    await this.photoRepo.markProcessed(photoId, {
      thumbnailKey: `${basePath}/thumbnail.jpg`,
      mediumKey: `${basePath}/medium.jpg`,
      originalKey: `${basePath}/original.jpg`,
      width: variants.original.width,
      height: variants.original.height,
      processedAt: new Date(),
    });

    // 5. Delete raw upload from temp location
    await this.storageService.deleteObject('poshpet-media', originalKey);
    await job.updateProgress(100);
  }
}
```

#### Processing Strategy: Async (Background Queue)

**Do NOT process images synchronously during upload.** Here is why:

| Approach | Response Time | User Experience | Complexity |
|----------|--------------|-----------------|------------|
| Synchronous (during request) | 2-8 seconds | User waits, mobile timeout risk | Low |
| Background queue (BullMQ) | ~200ms upload, process async | Instant response, "processing" state | Medium |

The upload endpoint should:
1. Validate file type and size
2. Upload raw file to a temp location in R2
3. Enqueue a BullMQ job
4. Return 202 Accepted with a `photoId` and `status: 'processing'`
5. Client polls or receives push notification when processing completes

This pattern is critical for mobile clients where network is unreliable. A 5-second synchronous upload is a terrible UX, and it will time out on 3G/4G.

---

## 4. Encryption (Time Capsules)

### Recommendation: Node.js built-in `crypto` module with AES-256-GCM

**Confidence: HIGH** -- Node.js `crypto` module is stable, audited, and requires zero dependencies. AES-256-GCM provides authenticated encryption (confidentiality + integrity).

#### Why AES-256-GCM, Not AES-256-CBC

| Mode | Confidentiality | Integrity | Padding Oracle | Recommendation |
|------|----------------|-----------|----------------|---------------|
| AES-256-CBC | Yes | No (needs separate HMAC) | Vulnerable | Do not use alone |
| AES-256-GCM | Yes | Yes (built-in auth tag) | Not applicable | **Use this** |

GCM mode provides authenticated encryption -- it tells you if the ciphertext was tampered with. CBC requires you to add HMAC yourself, and getting that wrong is a common vulnerability.

#### Encryption Implementation

```typescript
import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;    // 128-bit IV for GCM
const TAG_LENGTH = 16;   // 128-bit auth tag
const SALT_LENGTH = 32;  // 256-bit salt for key derivation
const KEY_LENGTH = 32;   // 256-bit key

interface EncryptedPayload {
  /** Base64-encoded: salt (32) + iv (16) + authTag (16) + ciphertext */
  data: string;
  algorithm: string;
  version: number;
}

/**
 * Derive an encryption key from the master secret + unique salt.
 * Using scrypt (memory-hard KDF) to derive per-capsule keys.
 */
function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return scryptSync(masterSecret, salt, KEY_LENGTH, {
    N: 16384,  // CPU/memory cost
    r: 8,      // Block size
    p: 1,      // Parallelization
  });
}

/**
 * Encrypt a buffer for Time Capsule storage.
 * Each capsule gets a unique salt -> unique derived key.
 */
function encryptCapsule(
  plaintext: Buffer,
  masterSecret: string,
): EncryptedPayload {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(masterSecret, salt);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: salt + iv + authTag + ciphertext
  const packed = Buffer.concat([salt, iv, authTag, encrypted]);

  return {
    data: packed.toString('base64'),
    algorithm: ALGORITHM,
    version: 1,
  };
}

/**
 * Decrypt a Time Capsule payload.
 */
function decryptCapsule(
  payload: EncryptedPayload,
  masterSecret: string,
): Buffer {
  const packed = Buffer.from(payload.data, 'base64');

  // Unpack: salt + iv + authTag + ciphertext
  const salt = packed.subarray(0, SALT_LENGTH);
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(masterSecret, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
```

#### Key Management for Solo Developer

**Recommendation: Environment variable master secret + per-capsule salt derivation.**

Do NOT use AWS KMS or similar for Phase 1. Here is the rationale:

| Approach | Cost | Complexity | Security | Solo Dev Fit |
|----------|------|------------|----------|-------------|
| Env var master secret + scrypt | $0 | Low | Good (unique key per capsule) | Best fit |
| AWS KMS | ~$1/mo + $0.03/10K requests | Medium | Excellent | Overkill for Phase 1 |
| HashiCorp Vault | $0 (self-hosted) | High | Excellent | Way too much infra |

The master secret lives in environment variables (never in code, never in git). Each capsule derives a unique key via scrypt(masterSecret, randomSalt). Even if one capsule's derived key is compromised, other capsules remain safe.

**Migration path:** When PoshPet scales to 10K+ users, wrap the master secret retrieval in an abstraction. Switch the implementation from env var to KMS without changing any calling code.

#### Encrypt-Before-Upload Strategy

**Always encrypt before uploading to R2.** The encrypted blob goes into the `poshpet-capsules` bucket. This means:
- R2 never sees plaintext content
- No dependency on R2's server-side encryption (which you do not control)
- Capsule content is opaque to anyone with bucket access
- You can switch storage providers without re-encrypting

---

## 5. PDF Generation

### Recommendation: PDFKit (v0.17.2)

**Confidence: HIGH** -- PDFKit is a mature, pure-JS PDF generation library with native image embedding support. Verified via npm.

#### Why PDFKit, Not Alternatives

| Criterion | PDFKit (v0.17.2) | Puppeteer (v24.x) | jsPDF |
|-----------|-------------------|--------------------|----|
| Approach | Programmatic PDF construction | HTML-to-PDF via headless Chrome | Programmatic (browser-focused) |
| Server footprint | ~5MB (pure JS) | ~300MB+ (Chromium binary) | ~1MB |
| Image embedding | Native (`doc.image()`) | Via HTML `<img>` | Limited |
| Text layout | Rich (fonts, columns, lists) | Full HTML/CSS | Basic |
| Memory usage | Low (~20-50MB per doc) | High (~200MB+ per Chromium instance) | Low |
| Docker complexity | None | Needs Chromium + system deps | None |
| Output quality | Professional | Pixel-perfect (matches web) | Basic |

**Decision: PDFKit.** Puppeteer is overkill for this use case and adds enormous operational complexity (Chromium in Docker, memory management, startup time). PDFKit handles text + images + layout natively, which is exactly what the Pet Legacy Timeline PDF needs.

#### Pet Legacy Timeline PDF Pattern

```typescript
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface TimelineEntry {
  date: Date;
  type: 'milestone' | 'photo' | 'health' | 'memory' | 'vet_visit';
  title: string;
  description?: string;
  imageBuffer?: Buffer; // Pre-fetched from R2
}

interface PetInfo {
  name: string;
  species: string;
  breed?: string;
  birthDate?: Date;
  passedDate?: Date;
  avatarBuffer?: Buffer;
}

async function generateLegacyTimelinePdf(
  pet: PetInfo,
  entries: TimelineEntry[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `${pet.name}'s Legacy Timeline`,
        Author: 'PoshPet',
        Subject: 'Pet Legacy Timeline',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Cover Page ---
    doc.fontSize(32).text(pet.name, { align: 'center' });
    doc.moveDown();
    if (pet.avatarBuffer) {
      doc.image(pet.avatarBuffer, {
        fit: [200, 200],
        align: 'center',
      });
      doc.moveDown();
    }
    doc.fontSize(14).text(
      `${pet.species}${pet.breed ? ` -- ${pet.breed}` : ''}`,
      { align: 'center' },
    );
    if (pet.birthDate) {
      const dateRange = pet.passedDate
        ? `${formatDate(pet.birthDate)} -- ${formatDate(pet.passedDate)}`
        : `Born ${formatDate(pet.birthDate)}`;
      doc.fontSize(12).text(dateRange, { align: 'center' });
    }
    doc.moveDown(2);
    doc.fontSize(10).text('Generated by PoshPet', { align: 'center' });

    // --- Timeline Entries ---
    doc.addPage();
    doc.fontSize(24).text('Timeline', { underline: true });
    doc.moveDown();

    for (const entry of entries) {
      // Check if we need a new page (leave 150pt margin for images)
      if (doc.y > 650) {
        doc.addPage();
      }

      // Date and type badge
      doc.fontSize(10)
        .fillColor('#888888')
        .text(formatDate(entry.date), { continued: true })
        .text(`  [${entry.type.replace('_', ' ').toUpperCase()}]`);

      // Title
      doc.fontSize(14).fillColor('#000000').text(entry.title);

      // Description
      if (entry.description) {
        doc.fontSize(10).fillColor('#444444').text(entry.description);
      }

      // Photo
      if (entry.imageBuffer) {
        doc.image(entry.imageBuffer, {
          fit: [400, 300],
          align: 'center',
        });
      }

      doc.moveDown();
    }

    doc.end();
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

#### Performance Considerations for Large Timelines

- **Pre-fetch images in batches:** Before generating the PDF, fetch all needed images from R2 in batches of 10. Do not fetch inside the PDF generation loop.
- **Use medium-size images (600px):** Do not embed original (4096px) images in the PDF. The medium variant is more than sufficient and keeps file size manageable.
- **Stream to R2:** For very large timelines (100+ entries), pipe the PDFDocument output directly to an R2 upload stream instead of buffering in memory.
- **Process as background job:** PDF generation should be a BullMQ job, not synchronous. A timeline with 50 photos could take 5-15 seconds to generate.

```typescript
// For large PDFs, stream directly to R2 instead of buffering
import { Upload } from '@aws-sdk/lib-storage';

async function generateAndUploadPdf(/* ... */): Promise<string> {
  const doc = new PDFDocument(/* ... */);

  // Stream PDFKit output directly to S3/R2
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: 'poshpet-media',
      Key: `exports/${userId}/${petId}/legacy-timeline.pdf`,
      Body: doc, // PDFDocument is a Readable stream
      ContentType: 'application/pdf',
    },
    // Multipart upload for large files
    partSize: 5 * 1024 * 1024, // 5MB parts
    leavePartsOnError: false,
  });

  // Build the PDF...
  // (same as above, but don't collect chunks)
  doc.end();

  await upload.done();
  return `exports/${userId}/${petId}/legacy-timeline.pdf`;
}
```

---

## 6. NestJS File Upload Integration

### Multer is Already Bundled

**NestJS `@nestjs/platform-express` v11.1.14 ships with Multer 2.0.2.** No separate Multer installation needed. Verified via npm.

#### File Upload Interceptor Pattern

```typescript
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('v1/pets/:petId/photos')
export class PhotoUploadController {
  constructor(
    @InjectQueue('image-processing') private imageQueue: Queue,
    private readonly storageService: StorageService,
    private readonly photoService: PhotoService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(), // Store in memory buffer (not disk)
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
        files: 1,
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|webp|heic)$/i }),
        ],
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: Express.Multer.File,
    @Param('petId') petId: string,
    @CurrentUser() user: AuthUser,
  ) {
    // 1. Check daily upload limit
    await this.photoService.enforceUploadLimit(user.id, user.isPremium);

    // 2. Create DB record in "processing" state
    const photo = await this.photoService.createPending(user.id, petId, {
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    // 3. Upload raw file to temp location
    const tempKey = `temp/${user.id}/${photo.id}/raw`;
    await this.storageService.putObject(
      'poshpet-media',
      tempKey,
      file.buffer,
      file.mimetype,
    );

    // 4. Enqueue processing job
    await this.imageQueue.add(
      'process-photo',
      {
        uploadId: photo.id,
        userId: user.id,
        petId,
        originalKey: tempKey,
        photoId: photo.id,
      },
      {
        priority: 1, // Photos are high priority
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
      },
    );

    // 5. Return immediately with processing status
    return {
      id: photo.id,
      status: 'processing',
      message: 'Photo is being processed. It will be available shortly.',
    };
  }
}
```

#### File Validation: Beyond MIME Types

**Critical: Do NOT trust `file.mimetype` alone.** Clients can spoof MIME types. Validate the actual file content.

```typescript
import { fileTypeFromBuffer } from 'file-type';

async function validateFileContent(buffer: Buffer): Promise<{
  valid: boolean;
  detectedType: string | undefined;
}> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { valid: false, detectedType: undefined };
  }

  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
  ];

  return {
    valid: allowedMimes.includes(detected.mime),
    detectedType: detected.mime,
  };
}
```

Use `file-type` (v21.3.0, verified via npm) to detect actual file content by reading magic bytes. This prevents users from uploading malicious files with spoofed extensions.

#### Vet Attachment Upload (Images + PDFs)

```typescript
@Post('v1/pets/:petId/vet-visits/:visitId/attachments')
@UseInterceptors(
  FileInterceptor('attachment', {
    storage: memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for PDFs
  }),
)
async uploadVetAttachment(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
        new FileTypeValidator({
          fileType: /(jpeg|jpg|png|webp|heic|pdf)$/i,
        }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  // For images: process through Sharp pipeline (strip EXIF, resize)
  // For PDFs: upload directly to R2 (no processing needed)
  const isImage = file.mimetype.startsWith('image/');

  if (isImage) {
    // Queue for image processing
    await this.imageQueue.add('process-vet-attachment', { /* ... */ });
  } else {
    // Upload PDF directly
    await this.storageService.putObject(/* ... */);
  }
}
```

#### Memory Storage vs Disk Storage

**Use `memoryStorage()` for images up to 20MB.** The buffer goes directly to Sharp (which needs a buffer anyway) and then to R2. No temp files to clean up.

**Use disk storage only if** you expect files over 50MB regularly (which PoshPet does not). For the 50MB vet PDF limit, memory storage is still fine on a server with 1GB+ RAM, especially with rate limiting (10 req/min uploads).

---

## 7. Recommended Package Manifest

### New Dependencies to Add

```bash
# Image processing
npm install sharp

# S3/R2 storage
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/lib-storage

# Background job queue
npm install @nestjs/bullmq bullmq

# PDF generation
npm install pdfkit

# File type detection (security)
npm install file-type

# Dev types
npm install -D @types/multer
```

### Version Matrix

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `sharp` | ^0.34.5 | Image resize, EXIF strip, format conversion | HIGH (npm verified) |
| `@aws-sdk/client-s3` | ^3.x | S3/R2 operations | HIGH (npm verified) |
| `@aws-sdk/s3-request-presigner` | ^3.x | Presigned URL generation | HIGH (npm verified) |
| `@aws-sdk/lib-storage` | ^3.x | Multipart uploads (PDF export streaming) | HIGH (npm verified) |
| `@nestjs/bullmq` | ^11.0.4 | NestJS queue integration | HIGH (npm verified) |
| `bullmq` | ^5.70.1 | Job queue engine (Redis-backed) | HIGH (npm verified) |
| `pdfkit` | ^0.17.2 | PDF generation for legacy timeline | HIGH (npm verified) |
| `file-type` | ^21.3.0 | Magic byte file type detection | HIGH (npm verified) |

### Already Available (No Install Needed)

| Package | Via | Purpose |
|---------|-----|---------|
| `multer` 2.0.2 | `@nestjs/platform-express` | File upload middleware |
| `crypto` | Node.js built-in | AES-256-GCM encryption |
| `ioredis` | Already in package.json | Redis client (BullMQ backend) |

---

## 8. Architecture: Full Upload-to-Delivery Pipeline

### Flow Diagram

```
CLIENT                    SERVER                           R2 STORAGE
  |                         |                                 |
  |-- POST /photos -------->|                                 |
  |   (multipart file)      |                                 |
  |                         |-- Validate (size, type, limit)  |
  |                         |-- Upload raw to temp/ --------->|
  |                         |-- Enqueue BullMQ job            |
  |<-- 202 {id, status} ---|                                 |
  |                         |                                 |
  |                    [BullMQ Worker]                        |
  |                         |-- Download raw from temp/ <-----|
  |                         |-- Sharp: 3 sizes + EXIF strip   |
  |                         |-- Upload 3 variants ----------->|
  |                         |-- Update DB (processed)         |
  |                         |-- Delete temp/ raw ------------->|
  |                         |                                 |
  |-- GET /photos/:id ----->|                                 |
  |                         |-- Check status: processed       |
  |                         |-- Generate presigned URLs       |
  |<-- {urls, status} -----|                                 |
  |                         |                                 |
  |-- GET presigned URL ----|-------------------------------->|
  |<-- Image data ----------|--------------------------------|
```

### Module Structure

```
src/modules/
  storage/
    storage.module.ts           # S3Client provider, exports StorageService
    storage.service.ts          # putObject, getObject, deleteObject, getSignedUrl
    storage.config.ts           # Bucket names, endpoint config
  media/
    media.module.ts             # Imports StorageModule, BullModule
    controllers/
      photo-upload.controller.ts
      vet-attachment.controller.ts
    services/
      photo.service.ts          # Business logic, upload limits
      image-processing.service.ts  # Sharp pipeline wrapper
    processors/
      image-processing.processor.ts  # BullMQ worker
    entities/
      photo.entity.ts
      attachment.entity.ts
  capsule/
    capsule.module.ts
    services/
      capsule-encryption.service.ts  # AES-256-GCM encrypt/decrypt
      capsule.service.ts             # Business logic
    processors/
      capsule-delivery.processor.ts  # Cron: check delivery dates, decrypt + deliver
  export/
    export.module.ts
    services/
      pdf-generator.service.ts       # PDFKit timeline generation
    processors/
      pdf-export.processor.ts        # BullMQ worker for async PDF gen
```

### NestJS Storage Service

```typescript
import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.config.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.get('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.get('S3_SECRET_ACCESS_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer | Readable,
    contentType: string,
  ): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObject(bucket: string, key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  async getSignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getSignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn = 900,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
```

---

## 9. Pitfalls and Warnings

### CRITICAL: Sharp in Docker

**Problem:** Sharp uses native binaries (libvips). If you build on macOS and deploy to Linux Docker, the native binaries will not work.

**Solution:** Always install Sharp inside the Docker build, never copy `node_modules` from host:

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
# Sharp will download the correct linux-x64/arm64 binary

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
```

**Alternative:** Use `--platform linux/amd64` in your Dockerfile `FROM` to ensure consistent builds.

### CRITICAL: EXIF Orientation Before Stripping

**Problem:** If you strip EXIF metadata without first applying the orientation rotation, portrait photos taken on phones will appear sideways or upside-down.

**Solution:** Always call `.rotate()` (with no arguments) before any resize operation. Sharp reads the EXIF orientation tag and physically rotates the pixels.

### CRITICAL: Memory Storage + Large Files

**Problem:** Using `memoryStorage()` with Multer means the entire file is held in Node.js memory. With concurrent uploads, this can cause OOM.

**Mitigation:**
- Rate limit uploads (10 req/min per spec)
- Max file size 20MB for photos, 50MB for vet attachments
- With 10 concurrent uploads at 20MB each = 200MB peak memory -- manageable on 1GB+ servers
- For added safety, set `--max-old-space-size=1024` on Node.js

### HIGH: File Type Spoofing

**Problem:** Clients can upload `.exe` files renamed to `.jpg`. Multer's `FileTypeValidator` only checks the extension/MIME header, not actual content.

**Solution:** Use `file-type` library to detect actual file type from magic bytes (first few bytes of file content). Validate before proceeding.

### HIGH: BullMQ Redis Disconnection

**Problem:** If Redis goes down, BullMQ jobs are lost in transit (not yet persisted) and new jobs cannot be enqueued.

**Mitigation:**
- Set `maxRetriesPerRequest: null` on the Redis connection (required by BullMQ)
- Implement retry logic on the upload endpoint: if queue.add() fails, return 503 (not 500)
- Job data is persisted in Redis once enqueued, so jobs survive worker restarts
- Monitor Redis with health checks

### HIGH: Presigned URL Caching

**Problem:** If you generate presigned URLs on every API request, each URL is unique (different signature timestamp), defeating any CDN or client caching.

**Solution:** Cache presigned URLs in Redis with TTL slightly less than the URL expiry:
```
Key: presigned:{bucket}:{key}
Value: signed URL
TTL: 3300 seconds (55 minutes, URL expires at 60 minutes)
```

This way, the same URL is served for ~55 minutes, enabling client-side caching.

### MODERATE: PDFKit Memory for Large Timelines

**Problem:** Generating a PDF with 200+ embedded images can consume 500MB+ of memory if all images are loaded simultaneously.

**Solution:**
- Fetch images in batches of 10-20
- Use medium (600px) images, not originals
- Stream the PDFKit output to R2 via `@aws-sdk/lib-storage` instead of buffering
- Process as a BullMQ job with its own memory limit

### MODERATE: Encryption Key Rotation

**Problem:** If the master encryption secret is compromised, all capsules are compromised.

**Mitigation:**
- Store `encryptionVersion` with each capsule record in the database
- When rotating keys, new capsules use version N+1, old capsules remain decryptable with version N
- Build the `deriveKey()` function to accept a version parameter from the start

### MODERATE: R2 Eventual Consistency

**Problem:** Cloudflare R2 (like S3) is eventually consistent for overwrite PUTs and DELETEs. If you overwrite a file and immediately read it, you might get the old version.

**Mitigation:** PoshPet's key scheme uses unique IDs (never overwrites), so this is mostly a non-issue. But be aware of it for the temp file deletion flow -- add a small delay or just do not worry about it (orphan cleanup cron handles it).

### MINOR: HEIC Support

**Problem:** iPhones shoot in HEIC format by default. Sharp can read HEIC but requires the `sharp` binary to be compiled with HEIC support (which it is in pre-built binaries as of v0.33+).

**Mitigation:** Test HEIC uploads in your CI pipeline. If pre-built binaries do not include HEIC for your platform, convert to JPEG on the client side (most mobile image pickers do this automatically).

### MINOR: file-type is ESM-Only

**Problem:** `file-type` v21+ is ESM-only. If your NestJS project uses CommonJS (which is the default), you cannot `import` it normally.

**Solution:** Use dynamic import:
```typescript
const { fileTypeFromBuffer } = await import('file-type');
```
Or configure your `tsconfig.json` with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`. Alternatively, use `file-type@16.5.4` (last CJS version) if you want to avoid ESM issues -- it is still perfectly functional for magic byte detection.

---

## 10. Sources and Confidence

### Package Versions (All Verified via `npm view`)

| Package | Verified Version | Confidence |
|---------|-----------------|------------|
| sharp | 0.34.5 | HIGH |
| @aws-sdk/client-s3 | 3.1000.0 | HIGH |
| @aws-sdk/s3-request-presigner | 3.1000.0 | HIGH |
| @aws-sdk/lib-storage | 3.1000.0 | HIGH |
| @nestjs/bullmq | 11.0.4 | HIGH |
| bullmq | 5.70.1 | HIGH |
| pdfkit | 0.17.2 | HIGH |
| file-type | 21.3.0 | HIGH |
| multer (via @nestjs/platform-express) | 2.0.2 | HIGH |
| @nestjs/platform-express | 11.1.14 | HIGH |

### Architecture Patterns (Training Data)

| Pattern | Confidence | Notes |
|---------|------------|-------|
| Sharp 3-size pipeline | HIGH | Well-established pattern, Sharp API is stable |
| BullMQ async processing | HIGH | Official NestJS recommendation |
| AES-256-GCM encryption | HIGH | Node.js crypto module, NIST standard |
| PDFKit for document generation | HIGH | Mature library, stable API |
| S3 presigned URLs | HIGH | Standard S3 pattern, works identically with R2 |
| Multer memoryStorage for uploads | HIGH | Default NestJS pattern |
| R2 vs S3 cost comparison | MEDIUM | Pricing verified from training data, may have changed |

### Recommendations Based on Training Data Only

| Recommendation | Confidence | Validation Needed |
|---------------|------------|-------------------|
| `sharp.concurrency(2)` for small servers | MEDIUM | Profile in your actual deployment environment |
| R2 zero egress pricing | MEDIUM | Verify current Cloudflare pricing before committing |
| `file-type` ESM-only status | MEDIUM | Test in your actual tsconfig setup |
| HEIC support in Sharp pre-built binaries | MEDIUM | Test with actual HEIC file on target platform |

---

## Summary: Recommended File Processing Stack

| Concern | Technology | Why |
|---------|-----------|-----|
| Image processing | Sharp v0.34 | 10x faster than Jimp, native EXIF strip, libvips |
| EXIF stripping | Sharp (built-in) | `.rotate()` then process -- no extra library |
| File upload | Multer 2.0 (bundled) | Already in NestJS, memoryStorage for buffers |
| File validation | file-type v21 | Magic byte detection, prevents spoofing |
| Object storage | @aws-sdk/client-s3 v3 | S3-compatible, works with R2 and S3 |
| Background jobs | BullMQ v5 + @nestjs/bullmq v11 | Official NestJS integration, Redis-backed |
| Encryption | Node.js crypto (AES-256-GCM) | Zero dependencies, audited, authenticated encryption |
| PDF generation | PDFKit v0.17 | Lightweight, native image embedding, no Chromium |
| Storage provider | Cloudflare R2 | Zero egress fees, S3-compatible, built-in CDN |
