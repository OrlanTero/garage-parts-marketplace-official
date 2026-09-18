import client from './client.js'

/**
 * Media API Client
 * Supports high-resolution file uploads (images, walkarounds, build sheets)
 * to Laravel Storage with AWS S3 forward-compatibility.
 */
export const mediaApi = {
  /**
   * Upload a single file.
   * @param {File} file
   * @param {Object} [meta={}] - { car_id, part_id, is_primary, caption, type }
   */
  async upload(file, meta = {}) {
    const formData = new FormData()
    formData.append('file', file)
    
    Object.entries(meta).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        formData.append(key, val)
      }
    })

    const response = await client.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Upload multiple files in batch.
   * @param {File[]} files
   * @param {Object} [meta={}]
   */
  async uploadMultiple(files, meta = {}) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files[]', file)
    })

    Object.entries(meta).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        formData.append(key, val)
      }
    })

    const response = await client.post('/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Fetch single media item details.
   */
  async get(id) {
    const response = await client.get(`/media/${id}`)
    return response.data
  },

  /**
   * Delete a media item and clean up file storage.
   */
  async delete(id) {
    const response = await client.delete(`/media/${id}`)
    return response.data
  },
}

export default mediaApi
