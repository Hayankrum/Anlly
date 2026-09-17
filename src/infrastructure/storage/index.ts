import type { StorageProvider } from './StorageProvider'
import { S3StorageProvider, type S3StorageConfig } from './providers/S3StorageProvider'
import { LocalStorageProvider, type LocalStorageConfig } from './providers/LocalStorageProvider'

export type { StorageProvider, UploadResult } from './StorageProvider'
export { S3StorageProvider, type S3StorageConfig } from './providers/S3StorageProvider'
export { LocalStorageProvider, type LocalStorageConfig } from './providers/LocalStorageProvider'

export interface StorageConfig {
  provider: 'local' | 's3'
  local?: LocalStorageConfig
  s3?: S3StorageConfig
}

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'local':
      if (!config.local) throw new Error('Local storage config required')
      return new LocalStorageProvider(config.local)

    case 's3':
      if (!config.s3) throw new Error('S3 storage config required')
      return new S3StorageProvider(config.s3)

    default:
      throw new Error(`Unknown storage provider: ${config.provider}`)
  }
}

export function getStorageProvider(): StorageProvider {
  const config: StorageConfig = {
    provider: (process.env.STORAGE_PROVIDER as 'local' | 's3') || 'local',
    local: {
      uploadDir: process.env.STORAGE_UPLOAD_DIR || './public/uploads',
      baseUrl: process.env.STORAGE_BASE_URL || '/uploads',
    },
    s3: {
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION || 'sa-east-1',
      bucket: process.env.STORAGE_BUCKET || '',
      accessKeyId: process.env.STORAGE_ACCESS_KEY || '',
      secretAccessKey: process.env.STORAGE_SECRET_KEY || '',
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
    },
  }

  return createStorageProvider(config)
}
