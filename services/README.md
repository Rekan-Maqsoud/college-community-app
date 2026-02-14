# ImgBB Image Upload Service

This service handles image uploads to ImgBB for profile pictures and post images.

## Features

- Profile picture upload with square cropping (1:1 aspect ratio)
- Post image upload with landscape cropping (16:9 aspect ratio)
- Automatic image compression to reduce file size
- Image resizing (800x800 for profile pictures, 1200px width for posts)
- Base64 encoding for API upload

## API Configuration

The ImgBB API key is configured through environment variables in the root `.env` file:

```env
EXPO_PUBLIC_IMGBB_API_KEY=your-imgbb-key
```

## Usage

### Upload Profile Picture

```javascript
import { uploadProfilePicture } from "../services/imgbbService";

const handleUpload = async () => {
  try {
    const result = await uploadProfilePicture();
    if (result) {
      console.log("Image URL:", result.displayUrl);
      console.log("Thumbnail URL:", result.thumbnailUrl);
    }
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

### Upload Post Image

```javascript
import { uploadPostImage } from "../services/imgbbService";

const handlePostImageUpload = async () => {
  try {
    const result = await uploadPostImage();
    if (result) {
      console.log("Image URL:", result.displayUrl);
    }
  } catch (error) {
    console.error("Upload failed:", error);
  }
};
```

## Response Format

The upload functions return an object with the following properties:

```javascript
{
  url: 'https://i.ibb.co/xxxxx/image.jpg',
  displayUrl: 'https://i.ibb.co/xxxxx/image.jpg',
  deleteUrl: 'https://ibb.co/xxxxx/deletetoken',
  thumbnailUrl: 'https://i.ibb.co/xxxxx/thumb.jpg'
}
```

## Image Specifications

### Profile Pictures

- Aspect ratio: 1:1 (square)
- Max dimensions: 800x800px
- Compression: 70%
- Format: JPEG

### Post Images

- Aspect ratio: 16:9 (landscape)
- Max width: 1200px
- Compression: 75%
- Format: JPEG

## Permissions

The service automatically requests camera roll permissions when needed. If permissions are denied, an error will be thrown.

## Error Handling

Common errors:

- `Permission to access camera roll is required!` - User denied permission
- `Failed to get base64 data` - Image processing failed
- `Upload failed` - API upload error

Always wrap upload calls in try-catch blocks to handle errors gracefully.
