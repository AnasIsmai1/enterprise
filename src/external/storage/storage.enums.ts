export enum Bucket {
    MEDIA = 'poshpet-media',      // Private: photos, avatars, vet attachments, circle media
    CAPSULE = 'poshpet-capsules', // Restricted: encrypted time capsule content
    STATIC = 'poshpet-static',   // Public CDN: static assets
}

export enum UploadType {
    PHOTO = 'PHOTO',                    // photos/{userId}/{petId}/{photoId}_{size}.jpg
    AVATAR = 'AVATAR',                  // avatars/{userId}/{petId}_avatar.jpg
    VET_ATTACHMENT = 'VET_ATTACHMENT',  // vet-attachments/{userId}/{visitId}/{attachmentId}.jpg
    CIRCLE_MEDIA = 'CIRCLE_MEDIA',      // circle-media/{circleId}/{postId}/{mediaId}.jpg
    MEMORY_PAGE = 'MEMORY_PAGE',        // memory-pages/{userId}/{pageId}_{type}
}
