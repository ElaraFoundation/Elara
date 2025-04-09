const { create } = require('ipfs-http-client');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Load environment variables
require('dotenv').config();

/**
 * IPFS Handler Utility
 * Handles interactions with IPFS for storing and retrieving data
 */
class IPFSHandler {
  constructor() {
    this.ipfs = this._createIPFSClient();
    this.tempDir = path.join(os.tmpdir(), 'bioproof-ipfs-temp');
    this._ensureTempDir();
  }

  /**
   * Create an IPFS client
   * @private
   * @returns {Object} IPFS client instance
   */
  _createIPFSClient() {
    // Default to Infura IPFS node if no specific config provided
    return create({
      host: process.env.IPFS_HOST || 'ipfs.infura.io',
      port: process.env.IPFS_PORT || 5001,
      protocol: process.env.IPFS_PROTOCOL || 'https',
      headers: {
        authorization: `Basic ${Buffer.from(
          process.env.IPFS_PROJECT_ID + ':' + process.env.IPFS_PROJECT_SECRET
        ).toString('base64')}`
      }
    });
  }

  /**
   * Ensure temporary directory exists
   * @private
   */
  async _ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
  }

  /**
   * Add JSON content to IPFS
   * @param {Object} content - JSON content to store
   * @returns {Promise<string>} CID of the stored content
   */
  async addJSON(content) {
    try {
      const contentStr = JSON.stringify(content);
      const result = await this.ipfs.add(contentStr);
      return result.cid.toString();
    } catch (error) {
      console.error('Error adding JSON to IPFS:', error);
      throw new Error('Failed to add JSON to IPFS');
    }
  }

  /**
   * Add a file to IPFS
   * @param {Buffer|string} content - File content as Buffer or path to file
   * @param {string} filename - Optional filename
   * @returns {Promise<string>} CID of the stored content
   */
  async addFile(content, filename = null) {
    try {
      let fileContent;
      
      if (typeof content === 'string' && content.startsWith('/')) {
        // If content is a file path
        fileContent = await fs.readFile(content);
      } else if (Buffer.isBuffer(content)) {
        // If content is already a buffer
        fileContent = content;
      } else {
        // If content is a string (not a path)
        fileContent = Buffer.from(content);
      }
      
      // Generate a random filename if not provided
      const tempFilename = filename || `file-${crypto.randomBytes(8).toString('hex')}`;
      const tempFilePath = path.join(this.tempDir, tempFilename);
      
      // Write to temporary file
      await fs.writeFile(tempFilePath, fileContent);
      
      // Add to IPFS
      const file = await this.ipfs.add({
        path: tempFilename,
        content: fileContent
      });
      
      // Clean up temp file
      await fs.unlink(tempFilePath);
      
      return file.cid.toString();
    } catch (error) {
      console.error('Error adding file to IPFS:', error);
      throw new Error('Failed to add file to IPFS');
    }
  }

  /**
   * Get JSON content from IPFS
   * @param {string} cid - Content identifier
   * @returns {Promise<Object>} Retrieved JSON content
   */
  async getJSON(cid) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      
      const contentStr = Buffer.concat(chunks).toString();
      return JSON.parse(contentStr);
    } catch (error) {
      console.error('Error getting JSON from IPFS:', error);
      throw new Error('Failed to retrieve JSON from IPFS');
    }
  }

  /**
   * Get file content from IPFS
   * @param {string} cid - Content identifier
   * @param {boolean} asBuffer - Whether to return as Buffer (true) or string (false)
   * @returns {Promise<Buffer|string>} File content
   */
  async getFile(cid, asBuffer = true) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      
      const content = Buffer.concat(chunks);
      return asBuffer ? content : content.toString();
    } catch (error) {
      console.error('Error getting file from IPFS:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  /**
   * Pin content in IPFS to ensure persistence
   * @param {string} cid - Content identifier to pin
   * @returns {Promise<boolean>} Success status
   */
  async pinContent(cid) {
    try {
      await this.ipfs.pin.add(cid);
      return true;
    } catch (error) {
      console.error('Error pinning content in IPFS:', error);
      return false;
    }
  }

  /**
   * Unpin content from IPFS
   * @param {string} cid - Content identifier to unpin
   * @returns {Promise<boolean>} Success status
   */
  async unpinContent(cid) {
    try {
      await this.ipfs.pin.rm(cid);
      return true;
    } catch (error) {
      console.error('Error unpinning content from IPFS:', error);
      return false;
    }
  }

  /**
   * Create IPFS directory with multiple files
   * @param {Array<{name: string, content: Buffer|string}>} files - Array of file objects
   * @returns {Promise<string>} CID of the directory
   */
  async createDirectory(files) {
    try {
      const ipfsFiles = [];
      
      for (const file of files) {
        let content;
        if (Buffer.isBuffer(file.content)) {
          content = file.content;
        } else {
          content = Buffer.from(file.content);
        }
        
        ipfsFiles.push({
          path: file.name,
          content: content
        });
      }
      
      // Add all files as a directory
      const result = await this.ipfs.add(ipfsFiles, { wrapWithDirectory: true });
      
      // Get the CID of the directory (last result item)
      let dirCid = null;
      for await (const file of result) {
        if (!file.path) {
          dirCid = file.cid.toString();
        }
      }
      
      return dirCid;
    } catch (error) {
      console.error('Error creating IPFS directory:', error);
      throw new Error('Failed to create IPFS directory');
    }
  }

  /**
   * Get list of files in IPFS directory
   * @param {string} dirCid - Directory content identifier
   * @returns {Promise<Array<{name: string, cid: string, size: number}>>} List of files
   */
  async listDirectory(dirCid) {
    try {
      const files = [];
      
      for await (const file of this.ipfs.ls(dirCid)) {
        files.push({
          name: file.name,
          cid: file.cid.toString(),
          size: file.size
        });
      }
      
      return files;
    } catch (error) {
      console.error('Error listing IPFS directory:', error);
      throw new Error('Failed to list IPFS directory');
    }
  }
}

module.exports = new IPFSHandler();