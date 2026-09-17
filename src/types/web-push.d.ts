declare module 'web-push' {
  interface PushSubscription {
    endpoint: string
    expirationTime?: number | null
    keys: {
      p256dh: string
      auth: string
    }
  }

  interface SendNotificationOptions {
    TTL?: number
    urgency?: 'very-low' | 'low' | 'normal' | 'high'
    topic?: string
    proxy?: string
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void

  function sendNotification(
    subscription: PushSubscription,
    payload: string | Buffer,
    options?: SendNotificationOptions
  ): Promise<{ statusCode: number; headers: Record<string, string> }>

  function generateVAPIDKeys(): {
    publicKey: string
    privateKey: string
  }

  export { setVapidDetails, sendNotification, generateVAPIDKeys }
  const webpush: {
    setVapidDetails: typeof setVapidDetails
    sendNotification: typeof sendNotification
    generateVAPIDKeys: typeof generateVAPIDKeys
  }
  export default webpush
}
