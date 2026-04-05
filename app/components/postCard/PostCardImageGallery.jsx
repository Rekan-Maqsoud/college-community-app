import React from 'react';
import ZoomableImageModal from '../ZoomableImageModal';

/**
 * PostCardImageGallery - Wrapper for image gallery in posts
 * Uses the shared ZoomableImageModal component for consistent 
 * zoom, download, and share functionality across the app.
 */
const PostCardImageGallery = ({ images, initialIndex, onClose }) => {
  return (
    <ZoomableImageModal
      visible={true}
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
      showDownload={true}
      showShare={true}
    />
  );
};

export default PostCardImageGallery;
