export default {
  moderation: {
    nsfwBlockedTitle: 'Image Blocked',
    nsfwBlockedMessage: 'This image violates community guidelines and cannot be uploaded.',
    nsfwScanUnavailableTitle: 'Image Check Unavailable',
    nsfwScanUnavailableMessage: 'We could not verify this image, so upload was blocked for safety.',
    nsfwVerifyingTitle: 'Verifying Image Safety',
    nsfwVerifyingMessage: 'Checking image {current}/{total} for NSFW content...',
    nsfwRejectedSelectionTitle: 'Images Not Accepted',
    nsfwRejectedSelectionMessage: 'No images were added. Blocked: {blocked}. Verification unavailable: {unavailable}.',
    nsfwPartialSelectionTitle: 'Some Images Were Skipped',
    nsfwPartialSelectionMessage: 'Added {accepted} image(s). Skipped {blocked} blocked and {unavailable} unverified image(s).',
  },
};
