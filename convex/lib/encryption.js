// Simple encryption utility for Convex environment
// Uses basic XOR with a derived key for simplicity and Convex compatibility

/**
 * Generate a simple key from environment
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY || 'default-potion-key-change-in-production';
  // Create a repeatable key by hashing the environment key
  let hash = 0;
  for (let i = 0; i < envKey.length; i++) {
    const char = envKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Simple XOR encryption (suitable for Convex environment)
 * @param {string} text - The text to encrypt/decrypt
 * @param {string} key - The encryption key
 * @returns {string} - The encrypted/decrypted text in base64
 */
function xorEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const textCode = text.charCodeAt(i);
    const keyCode = key.charCodeAt(i % key.length);
    result += String.fromCharCode(textCode ^ keyCode);
  }
  return btoa(result); // Base64 encode
}

/**
 * Simple XOR decryption
 * @param {string} encryptedText - The encrypted text in base64
 * @param {string} key - The encryption key
 * @returns {string} - The decrypted text
 */
function xorDecrypt(encryptedText, key) {
  try {
    const decoded = atob(encryptedText); // Base64 decode
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const encryptedCode = decoded.charCodeAt(i);
      const keyCode = key.charCodeAt(i % key.length);
      result += String.fromCharCode(encryptedCode ^ keyCode);
    }
    return result;
  } catch (error) {
    throw new Error('Failed to decrypt: invalid format');
  }
}

/**
 * Encrypt a sensitive string (like access token)
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted text prefixed with 'enc:'
 */
export function encrypt(text) {
  if (!text) return text;
  
  try {
    const key = getEncryptionKey();
    const encrypted = xorEncrypt(text, key);
    return 'enc:' + encrypted; // Prefix to indicate encryption
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypt a sensitive string
 * @param {string} encryptedText - The encrypted text with 'enc:' prefix
 * @returns {string} - Decrypted text
 */
export function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  // Check if it's encrypted (has 'enc:' prefix)
  if (!encryptedText.startsWith('enc:')) {
    // Assume it's already decrypted (for backward compatibility during migration)
    return encryptedText;
  }
  
  try {
    const key = getEncryptionKey();
    const encryptedPart = encryptedText.substring(4); // Remove 'enc:' prefix
    return xorDecrypt(encryptedPart, key);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Check if a string is encrypted
 * @param {string} text - The text to check
 * @returns {boolean} - True if encrypted
 */
export function isEncrypted(text) {
  return text && text.startsWith('enc:');
}