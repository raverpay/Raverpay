/**
 * Entity Secret Types
 */

export interface EntitySecretConfig {
  /**
   * The 32-byte entity secret (hex-encoded)
   */
  entitySecret: string;

  /**
   * Path to recovery file (optional, for backup)
   */
  recoveryFilePath?: string;
}

export interface EntitySecretCiphertextResult {
  /**
   * The encrypted entity secret ciphertext (base64-encoded)
   */
  ciphertext: string;

  /**
   * Timestamp when the ciphertext was generated
   */
  generatedAt: Date;
}

export interface EntityPublicKeyInfo {
  /**
   * Circle's public key for encrypting entity secrets
   */
  publicKey: string;

  /**
   * When the key was created
   */
  createDate: string;

  /**
   * When the key was last updated
   */
  updateDate: string;
}
