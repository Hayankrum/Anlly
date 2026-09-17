import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, UploadResult } from '../StorageProvider'

export interface S3StorageConfig {
  endpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async upload(key: string, file: Buffer, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    )

    const url = await this.getUrl(key)

    return {
      key,
      url,
      size: file.length,
      contentType,
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }

  async getUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn: 3600 })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }
}
