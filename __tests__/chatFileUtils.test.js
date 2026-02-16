import {
  formatFileSize,
  getFileExtension,
  getFilePreviewDescriptor,
  FILE_KIND,
} from '../app/utils/fileTypes';
import {
  MAX_FILE_UPLOAD_BYTES,
  validateFileUploadSize,
  validateUploadFile,
} from '../app/utils/fileUploadUtils';

describe('chat file utilities', () => {
  it('detects common document types for preview', () => {
    const pdf = getFilePreviewDescriptor({ name: 'lecture-notes.pdf', mimeType: 'application/pdf' });
    const docx = getFilePreviewDescriptor({ name: 'assignment.docx' });
    const pptx = getFilePreviewDescriptor({ name: 'slides.pptx' });

    expect(pdf.kind).toBe(FILE_KIND.PDF);
    expect(pdf.extensionLabel).toBe('PDF');

    expect(docx.kind).toBe(FILE_KIND.WORD);
    expect(docx.extensionLabel).toBe('DOCX');

    expect(pptx.kind).toBe(FILE_KIND.POWERPOINT);
    expect(pptx.extensionLabel).toBe('PPTX');
  });

  it('returns empty extension when missing', () => {
    expect(getFileExtension('README')).toBe('');
  });

  it('formats file size for UI', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5 MB');
  });

  it('validates max upload size', () => {
    expect(() => validateFileUploadSize(MAX_FILE_UPLOAD_BYTES)).not.toThrow();
    expect(() => validateFileUploadSize(MAX_FILE_UPLOAD_BYTES + 1)).toThrow('FILE_TOO_LARGE');
  });

  it('validates upload file shape and size', () => {
    expect(() => validateUploadFile({
      uri: 'file://tmp/a.pdf',
      name: 'a.pdf',
      size: 1024,
      type: 'application/pdf',
    })).not.toThrow();

    expect(() => validateUploadFile({
      uri: 'file://tmp/a.pdf',
      name: 'a.pdf',
      size: MAX_FILE_UPLOAD_BYTES + 100,
      type: 'application/pdf',
    })).toThrow('FILE_TOO_LARGE');
  });
});
