/**
 * Cloudinary Upload Module
 * Handles image uploads to Cloudinary with fallback to base64
 * 
 * Configuration:
 * - Cloud Name: dwq7bbem0
 * - API Key: 746729755381688 (for signed uploads and advanced features)
 * - Upload Preset: ucolab_project (unsigned preset for basic uploads)
 * - Folder: ucolab_project (singular - matches preset configuration)
 * 
 * Features:
 * - Unsigned uploads (no API key needed in requests)
 * - Signed uploads (with API key for enhanced security)
 * - Image transformations (resize, crop, optimize)
 * - Responsive image URLs generation
 * - Automatic compression before upload
 * - Base64 fallback if Cloudinary fails
 * 
 * IMPORTANT: The upload preset MUST be configured as "Unsigned" in Cloudinary
 * Go to: https://cloudinary.com/console/dwq7bbem0/settings/upload
 * Create preset named "ucolab_project" with Signing Mode set to "Unsigned"
 */

const CloudinaryUploader = (function() {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        CLOUD_NAME: 'dwq7bbem0',
        API_KEY: '746729755381688', // Your Cloudinary API Key
        UPLOAD_PRESET: 'ucolab_project',
        FOLDER: 'ucolab_project', // FIXED: Matches Cloudinary preset (no 's')
        MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB in bytes
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
        get UPLOAD_URL() {
            return `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`;
        }
    };

    /**
     * Upload image to Cloudinary
     * @param {File} file - The image file to upload
     * @param {number} index - The index of the image (for logging)
     * @returns {Promise<string>} - The secure URL of the uploaded image
     */
    async function uploadToCloudinary(file, index = 0) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CONFIG.UPLOAD_PRESET);
        // Don't send folder or public_id - let the preset handle everything

        try {
            const response = await fetch(CONFIG.UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            // Get response text first for debugging
            const responseText = await response.text();
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    errorData = { message: responseText };
                }
                
                console.error('❌ [Cloudinary] Upload failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                
                // Specific error messages
                if (response.status === 401) {
                    const error = new Error(
                        `Upload preset "${CONFIG.UPLOAD_PRESET}" not found or not configured as unsigned.\n\n` +
                        `Fix: Go to https://cloudinary.com/console/${CONFIG.CLOUD_NAME}/settings/upload\n` +
                        `1. Click "Add upload preset"\n` +
                        `2. Set preset name to: ${CONFIG.UPLOAD_PRESET}\n` +
                        `3. Set Signing Mode to: Unsigned ⚠️\n` +
                        `4. Set Folder to: ${CONFIG.FOLDER}\n` +
                        `5. Click Save`
                    );
                    error.code = 'PRESET_NOT_FOUND';
                    throw error;
                } else if (response.status === 400) {
                    const error = new Error(`Invalid upload request: ${errorData.error?.message || 'Check file format and size'}`);
                    error.code = 'INVALID_REQUEST';
                    throw error;
                } else {
                    const error = new Error(`Upload failed (${response.status}): ${errorData.error?.message || responseText}`);
                    error.code = 'UPLOAD_FAILED';
                    throw error;
                }
            }

            const data = JSON.parse(responseText);
            
            return data.secure_url;
            
        } catch (error) {
            console.error(`❌ [Cloudinary] Error uploading image ${index + 1}:`, error);
            
            // Log troubleshooting tips
            if (error.code === 'PRESET_NOT_FOUND') {
                console.error('💡 [Cloudinary] Troubleshooting:', {
                    step1: `Go to https://cloudinary.com/console/${CONFIG.CLOUD_NAME}/settings/upload`,
                    step2: 'Scroll to "Upload presets" section',
                    step3: 'Click "Add upload preset"',
                    step4: `Set preset name to: ${CONFIG.UPLOAD_PRESET}`,
                    step5: 'Set Signing Mode to: Unsigned ⚠️ (CRITICAL!)',
                    step6: `Set Folder to: ${CONFIG.FOLDER}`,
                    step7: 'Click Save and try again'
                });
            }
            
            throw error;
        }
    }

    /**
     * Convert file to base64 (fallback if Cloudinary fails)
     * @param {File} file - The file to convert
     * @returns {Promise<string>} - Base64 encoded string
     */
    function convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Validate file before upload
     * @param {File} file - The file to validate
     * @returns {Object} - { valid: boolean, error: string }
     */
    function validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file selected' };
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            return { 
                valid: false, 
                error: `File too large! Maximum size is ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
            };
        }

        if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
            return { 
                valid: false, 
                error: `Invalid file type! Allowed types: ${CONFIG.ALLOWED_TYPES.join(', ')}. Your file type: ${file.type}`
            };
        }

        return { valid: true };
    }

    /**
     * Upload image with automatic compression and fallback to base64
     * @param {File} file - The file to upload
     * @param {number} index - The index of the image
     * @returns {Promise<string>} - The image URL (Cloudinary or base64)
     */
    async function uploadImage(file, index = 0) {
        // Validate file first
        const validation = validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Compress image before upload if ImageCompressor is available
        let fileToUpload = file;
        if (typeof ImageCompressor !== 'undefined') {
            try {
                fileToUpload = await ImageCompressor.compressImage(file);
            } catch (compressionError) {
                // If compression fails, continue with original file
                fileToUpload = file;
            }
        }

        try {
            // Try Cloudinary first
            const cloudinaryUrl = await uploadToCloudinary(fileToUpload, index);
            return cloudinaryUrl;
        } catch (cloudinaryError) {
            
            // Fallback to base64
            try {
                const base64String = await convertToBase64(fileToUpload);
                return base64String;
            } catch (base64Error) {
                throw new Error(`Failed to process image: ${base64Error.message}`);
            }
        }
    }

    /**
     * Verify if Cloudinary preset is configured
     * @returns {Promise<Object>} - { configured: boolean, message: string }
     */
    async function verifyPreset() {
        // Create a tiny 1x1 transparent PNG for testing
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                const testFile = new File([blob], 'test.png', { type: 'image/png' });
                
                try {
                    await uploadToCloudinary(testFile, -1);
                    resolve({ 
                        configured: true, 
                        message: '✅ Cloudinary preset is configured correctly!' 
                    });
                } catch (error) {
                    resolve({ 
                        configured: false, 
                        message: error.message 
                    });
                }
            }, 'image/png');
        });
    }

    /**
     * Upload image with API key (signed upload for enhanced security and features)
     * @param {File} file - The file to upload
     * @param {Object} options - Upload options (transformation, tags, etc.)
     * @returns {Promise<Object>} - Complete upload response with secure_url and metadata
     */
    async function uploadImageSigned(file, options = {}) {
        const validation = validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', CONFIG.API_KEY);
        formData.append('upload_preset', CONFIG.UPLOAD_PRESET);
        
        // Add optional parameters
        if (options.folder) formData.append('folder', options.folder);
        if (options.tags) formData.append('tags', options.tags.join(','));
        if (options.context) formData.append('context', options.context);
        if (options.transformation) formData.append('transformation', JSON.stringify(options.transformation));

        try {
            const response = await fetch(CONFIG.UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Signed upload failed: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            return data;
        } catch (error) {
            console.error('❌ [Cloudinary] Signed upload error:', error);
            throw error;
        }
    }

    /**
     * Generate Cloudinary transformation URL
     * @param {string} publicId - The public ID of the image
     * @param {Object} transformations - Transformation options
     * @returns {string} - Transformed image URL
     */
    function getTransformedUrl(publicId, transformations = {}) {
        const {
            width,
            height,
            crop = 'fill',
            quality = 'auto',
            format = 'auto',
            gravity = 'auto'
        } = transformations;

        let transformString = [];
        
        if (width) transformString.push(`w_${width}`);
        if (height) transformString.push(`h_${height}`);
        transformString.push(`c_${crop}`);
        transformString.push(`q_${quality}`);
        transformString.push(`f_${format}`);
        if (gravity) transformString.push(`g_${gravity}`);

        const transformation = transformString.join(',');
        return `https://res.cloudinary.com/${CONFIG.CLOUD_NAME}/image/upload/${transformation}/${publicId}`;
    }

    /**
     * Get optimized thumbnail URL
     * @param {string} imageUrl - Original Cloudinary URL
     * @param {number} size - Thumbnail size (default: 150px)
     * @returns {string} - Optimized thumbnail URL
     */
    function getThumbnailUrl(imageUrl, size = 150) {
        if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
            return imageUrl;
        }

        // Extract public ID from URL
        const parts = imageUrl.split('/upload/');
        if (parts.length !== 2) return imageUrl;

        const publicId = parts[1];
        return getTransformedUrl(publicId, {
            width: size,
            height: size,
            crop: 'fill',
            quality: 'auto',
            format: 'auto'
        });
    }

    /**
     * Get responsive image URLs for different screen sizes
     * @param {string} publicId - The public ID of the image
     * @returns {Object} - URLs for different sizes
     */
    function getResponsiveUrls(publicId) {
        return {
            thumbnail: getTransformedUrl(publicId, { width: 150, height: 150 }),
            small: getTransformedUrl(publicId, { width: 400, height: 300 }),
            medium: getTransformedUrl(publicId, { width: 800, height: 600 }),
            large: getTransformedUrl(publicId, { width: 1200, height: 900 }),
            original: `https://res.cloudinary.com/${CONFIG.CLOUD_NAME}/image/upload/${publicId}`
        };
    }

    // Public API
    return {
        uploadImage,
        uploadToCloudinary,
        uploadImageSigned,
        getTransformedUrl,
        getThumbnailUrl,
        getResponsiveUrls,
        convertToBase64,
        validateFile,
        verifyPreset,
        config: CONFIG
    };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudinaryUploader;
}
