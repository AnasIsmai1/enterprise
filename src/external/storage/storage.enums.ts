/**
 * Logical bucket identifiers. The real bucket names are deployment-specific and
 * resolved from config (R2_BUCKET_*) by StorageService — hardcoding them here
 * meant every deployment but one pointed at buckets it does not own.
 */
export enum Bucket {
  MEDIA = 'MEDIA', // Private: user uploads
  RESTRICTED = 'RESTRICTED', // Restricted: separate IAM credentials
  STATIC = 'STATIC', // Public CDN: static assets
}

export enum UploadType {
  PHOTO = 'PHOTO', // photos/{userId}/{ownerId}/{photoId}_{size}.jpg
  AVATAR = 'AVATAR', // avatars/{userId}/{ownerId}_avatar.jpg
  ATTACHMENT = 'ATTACHMENT', // attachments/{userId}/{parentId}/{attachmentId}.jpg
  DOCUMENT = 'DOCUMENT', // documents/{userId}/{documentId}_{type}
}
