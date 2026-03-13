import React from 'react';
import ZoomableImageModal from '../../components/ZoomableImageModal';

/**
 * ImageGalleryModal - Wrapper for image gallery in post details
 * Uses the shared ZoomableImageModal component for consistent 
 * zoom, download, and share functionality across the app.
 */
const ImageGalleryModal = ({ visible, images, initialIndex, onClose }) => {
  return (
    <ZoomableImageModal
      visible={visible}
      images={images}
      initialIndex={initialIndex}
      onClose={onClose}
      showDownload={true}
      showShare={true}
    />
  );
};

export default ImageGalleryModal;
