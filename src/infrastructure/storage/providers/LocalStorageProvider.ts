import { promises as fs } from 'fs'
import { join } from 'path'
import type { StorageProvider, UploadResult } from '../StorageProvider'

export interface LocalStorageConfig {
  uploadDir: string
  baseUrl: string
}

export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string
  private baseUrl: string

  constructor(config: LocalStorageConfig) {
    this.uploadDir = config.uploadDir
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
  }

  private async ensureDir(key: string): Promise<void> {
    const dir = join(this.uploadDir, ...key.split('/').slice(0, -1))
    await fs.mkdir(dir, { recursive: true })
  }

  async upload(key: string, file: Buffer, contentType: string): Promise<UploadResult> {
    await this.ensureDir(key)
    const filePath = join(this.uploadDir, key)
    await fs.writeFile(filePath, file)

    return {
      key,
      url: `${this.baseUrl}/${key}`,
      size: file.length,
      contentType,
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key)
    await fs.unlink(filePath)
  }

  async getUrl(key: string): Promise<string> {
    return `${this.baseUrl}/${key}`
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = join(this.uploadDir, key)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getUrl(key)
  }
}
