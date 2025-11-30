/**
 * Image Compressor Module
 * Compresses images to approximately 100KB before upload
 * 
 * Features:
 * - Target size: ~100KB
 * - Maintains aspect ratio
 * - Progressive quality reduction
 * - Supports JPEG, PNG, WebP
 */

const ImageCompressor = (function() {
    'use strict';

    // --- Configuration ---
    const CONFIG = {
        TARGET_SIZE_KB: 100,
        TARGET_SIZE_BYTES: 100 * 1024, // 100KB in bytes
        MAX_WIDTH: 1920, // Max width to prevent huge images
        MAX_HEIGHT: 1920, // Max height to prevent huge images
        INITIAL_QUALITY: 0.9, // Start with 90% quality
        MIN_QUALITY: 0.3, // Don't go below 30% quality
        QUALITY_STEP: 0.05, // Reduce by 5% each iteration
        MAX_ITERATIONS: 20 // Maximum compression attempts
    };

    /**
     * Compress image to target size
     * @param {File} file - The image file to compress
     * @returns {Promise<File>} - Compressed image file
     */
    async function compressImage(file, targetKB) {
        // If targetKB provided, compute target bytes, else default
        const targetBytes = targetKB ? (targetKB * 1024) : CONFIG.TARGET_SIZE_BYTES;
        // If file is already under target, return as is
        if (file.size <= targetBytes) {
            return file;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                const img = new Image();
                
                img.onload = async () => {
                    try {
                        // Calculate new dimensions while maintaining aspect ratio
                        let { width, height } = calculateDimensions(img.width, img.height);
                        
                        // Create canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        
                        // Enable image smoothing for better quality
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        // Draw image on canvas
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Determine output format
                        const outputFormat = getOutputFormat(file.type);
                        
                                        // Progressive compression: pass target bytes via a modified function
                                        const compressedFile = await progressiveCompress(
                                            canvas,
                                            outputFormat,
                                            file.name,
                                            targetKB
                                        );
                        
                        resolve(compressedFile);
                    } catch (error) {
                        reject(new Error(`Compression failed: ${error.message}`));
                    }
                };
                
                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Calculate new dimensions while maintaining aspect ratio
     * @param {number} width - Original width
     * @param {number} height - Original height
     * @returns {Object} - { width, height }
     */
    function calculateDimensions(width, height) {
        let newWidth = width;
        let newHeight = height;
        
        // Scale down if image is too large
        if (width > CONFIG.MAX_WIDTH || height > CONFIG.MAX_HEIGHT) {
            const aspectRatio = width / height;
            
            if (width > height) {
                newWidth = CONFIG.MAX_WIDTH;
                newHeight = Math.round(CONFIG.MAX_WIDTH / aspectRatio);
            } else {
                newHeight = CONFIG.MAX_HEIGHT;
                newWidth = Math.round(CONFIG.MAX_HEIGHT * aspectRatio);
            }
        }
        
        return { width: newWidth, height: newHeight };
    }

    /**
     * Get output format based on input type
     * @param {string} inputType - Input MIME type
     * @returns {string} - Output MIME type
     */
    function getOutputFormat(inputType) {
        // PNG transparency should be preserved
        if (inputType === 'image/png') {
            return 'image/png';
        }
        
        // WebP and JPEG can be converted to JPEG for better compression
        return 'image/jpeg';
    }

    /**
     * Progressively compress image until target size is reached
     * @param {HTMLCanvasElement} canvas - Canvas with image
     * @param {string} format - Output format
     * @param {string} fileName - Original file name
     * @returns {Promise<File>} - Compressed file
     */
    async function progressiveCompress(canvas, format, fileName, targetKB) {
        let quality = CONFIG.INITIAL_QUALITY;
        let blob = null;
        let iterations = 0;
        const targetBytes = targetKB ? (targetKB * 1024) : CONFIG.TARGET_SIZE_BYTES;
        
        // Try different quality levels until we reach target size
        while (iterations < CONFIG.MAX_ITERATIONS) {
            blob = await canvasToBlob(canvas, format, quality);
            
            // Check if we've reached target size or minimum quality
            if (blob.size <= targetBytes || quality <= CONFIG.MIN_QUALITY) {
                break;
            }
            
            // Reduce quality for next iteration
            quality -= CONFIG.QUALITY_STEP;
            iterations++;
        }
        
        // If still too large, try reducing dimensions
        if (blob.size > (targetKB ? targetKB * 1024 : CONFIG.TARGET_SIZE_BYTES) && quality <= CONFIG.MIN_QUALITY) {
            const scaleFactor = 0.8; // Reduce by 20%
            const newWidth = Math.round(canvas.width * scaleFactor);
            const newHeight = Math.round(canvas.height * scaleFactor);
            
            const smallerCanvas = document.createElement('canvas');
            smallerCanvas.width = newWidth;
            smallerCanvas.height = newHeight;
            const ctx = smallerCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
            
            blob = await canvasToBlob(smallerCanvas, format, CONFIG.MIN_QUALITY);
        }
        
        // Create new file with compressed blob
        const extension = format === 'image/png' ? 'png' : 'jpg';
        const newFileName = fileName.replace(/\.[^.]+$/, `.${extension}`);
        
        return new File([blob], newFileName, { type: format });
    }

    /**
     * Convert canvas to blob
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {string} format - Output format
     * @param {number} quality - Quality (0-1)
     * @returns {Promise<Blob>} - Image blob
     */
    function canvasToBlob(canvas, format, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create blob'));
                    }
                },
                format,
                quality
            );
        });
    }

    /**
     * Compress multiple images
     * @param {File[]} files - Array of image files
     * @returns {Promise<File[]>} - Array of compressed files
     */
    async function compressMultiple(files) {
        const compressionPromises = files.map(file => compressImage(file));
        return Promise.all(compressionPromises);
    }

    /**
     * Get compression info for a file
     * @param {File} originalFile - Original file
     * @param {File} compressedFile - Compressed file
     * @returns {Object} - Compression statistics
     */
    function getCompressionInfo(originalFile, compressedFile) {
        const originalSizeKB = (originalFile.size / 1024).toFixed(2);
        const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
        const savedKB = (originalSizeKB - compressedSizeKB).toFixed(2);
        const savedPercent = ((savedKB / originalSizeKB) * 100).toFixed(1);
        
        return {
            originalSize: `${originalSizeKB} KB`,
            compressedSize: `${compressedSizeKB} KB`,
            saved: `${savedKB} KB (${savedPercent}%)`,
            ratio: `${((originalFile.size / compressedFile.size).toFixed(2))}:1`
        };
    }

    // Public API
    return {
        compressImage,
        compressMultiple,
        getCompressionInfo,
        config: CONFIG
    };
})();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageCompressor;
}
