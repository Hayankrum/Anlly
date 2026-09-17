export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
}

export interface StorageProvider {
  upload(key: string, file: Buffer, contentType: string): Promise<UploadResult>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
  exists(key: string): Promise<boolean>
  getSignedUrl(key: string, expiresIn?: number): Promise<string>
}
