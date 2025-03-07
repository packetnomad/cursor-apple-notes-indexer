// storage.js - Handle local storage of notes and indexes

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Datastore = require('nedb');

// Set up the storage directory
const getStorageDir = () => {
  const storageDir = path.join(app.getPath('userData'), 'apple-notes-indexer');
  
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  
  return storageDir;
};

/**
 * Database class to handle note storage
 */
class NotesDatabase {
  constructor() {
    const storageDir = getStorageDir();
    
    this.db = new Datastore({
      filename: path.join(storageDir, 'notes.db'),
      autoload: true
    });
    
    // Create indexes for faster queries
    this.db.ensureIndex({ fieldName: 'id', unique: true });
    this.db.ensureIndex({ fieldName: 'folder' });
    this.db.ensureIndex({ fieldName: 'modificationDate' });
  }
  
  /**
   * Save or update a note in the database
   * @param {Object} note - Note to save
   * @returns {Promise} Resolves with the saved note
   */
  saveNote(note) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { id: note.id },
        note,
        { upsert: true },
        (err, numReplaced, upsert) => {
          if (err) {
            reject(err);
          } else {
            resolve({ ...note, _updated: numReplaced > 0, _new: !!upsert });
          }
        }
      );
    });
  }
  
  /**
   * Save multiple notes at once
   * @param {Array} notes - Array of notes to save
   * @returns {Promise} Resolves when all notes are saved
   */
  saveNotes(notes) {
    return Promise.all(notes.map(note => this.saveNote(note)));
  }
  
  /**
   * Get a note by ID
   * @param {string} id - Note ID
   * @returns {Promise} Resolves with the note or null
   */
  getNote(id) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ id }, (err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc);
        }
      });
    });
  }
  
  /**
   * Get all notes
   * @returns {Promise} Resolves with array of all notes
   */
  getAllNotes() {
    return new Promise((resolve, reject) => {
      this.db.find({}, (err, docs) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }
  
  /**
   * Count all notes in the database
   * @returns {Promise} Resolves with the count
   */
  countNotes() {
    return new Promise((resolve, reject) => {
      this.db.count({}, (err, count) => {
        if (err) {
          reject(err);
        } else {
          resolve(count);
        }
      });
    });
  }
  
  /**
   * Get notes by folder
   * @param {string} folder - Folder name
   * @returns {Promise} Resolves with array of notes
   */
  getNotesByFolder(folder) {
    return new Promise((resolve, reject) => {
      this.db.find({ folder }, (err, docs) => {
        if (err) {
          reject(err);
        } else {
          resolve(docs);
        }
      });
    });
  }
  
  /**
   * Delete a note by ID
   * @param {string} id - Note ID
   * @returns {Promise} Resolves when complete
   */
  deleteNote(id) {
    return new Promise((resolve, reject) => {
      this.db.remove({ id }, {}, (err, numRemoved) => {
        if (err) {
          reject(err);
        } else {
          resolve(numRemoved);
        }
      });
    });
  }
  
  /**
   * Get all unique folders
   * @returns {Promise} Resolves with array of folder names
   */
  getFolders() {
    return new Promise((resolve, reject) => {
      this.db.find({}).projection({ folder: 1, _id: 0 }).exec((err, docs) => {
        if (err) {
          reject(err);
        } else {
          const folders = [...new Set(docs.map(doc => doc.folder))];
          resolve(folders);
        }
      });
    });
  }
}

/**
 * Class to handle index metadata
 */
class IndexMetadata {
  constructor() {
    const storageDir = getStorageDir();
    
    this.db = new Datastore({
      filename: path.join(storageDir, 'metadata.db'),
      autoload: true
    });
  }
  
  /**
   * Save index metadata
   * @param {Object} metadata - Index metadata
   * @returns {Promise} Resolves when complete
   */
  saveMetadata(metadata) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { type: 'index_metadata' },
        { ...metadata, type: 'index_metadata', updatedAt: new Date().toISOString() },
        { upsert: true },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
  
  /**
   * Get index metadata
   * @returns {Promise} Resolves with metadata or default values
   */
  getMetadata() {
    return new Promise((resolve, reject) => {
      this.db.findOne({ type: 'index_metadata' }, (err, doc) => {
        if (err) {
          reject(err);
        } else {
          resolve(doc || {
            type: 'index_metadata',
            lastIndexed: null,
            noteCount: 0,
            indexed: false,
            updatedAt: new Date().toISOString()
          });
        }
      });
    });
  }
}

module.exports = {
  NotesDatabase,
  IndexMetadata,
  getStorageDir
};