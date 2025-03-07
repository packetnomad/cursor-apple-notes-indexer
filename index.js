const path = require('path');
const fs = require('fs');
const lunr = require('lunr');
const jxa = require('node-jxa');
const Datastore = require('nedb');
const { app } = require('electron');

// Database setup
const dbDir = path.join(app.getPath('userData'), 'apple-notes-indexer');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Datastore({
  filename: path.join(dbDir, 'notes.db'),
  autoload: true
});

// Initialize the search index
let searchIndex;
let notesCache = [];

// Function to retrieve notes from Apple Notes using JXA
async function fetchAppleNotes() {
  try {
    const notes = await jxa.run(() => {
      const app = Application('Notes');
      app.includeStandardAdditions = true;
      
      const allNotes = [];
      
      // Get all folders
      const folders = app.folders();
      
      // Iterate through folders and get notes
      folders.forEach(folder => {
        const folderName = folder.name();
        
        folder.notes().forEach(note => {
          allNotes.push({
            id: note.id(),
            name: note.name(),
            body: note.body(),
            creationDate: note.creationDate(),
            modificationDate: note.modificationDate(),
            folder: folderName
          });
        });
      });
      
      return allNotes;
    });
    
    return notes;
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

// Function to build the index
async function buildIndex(progressCallback = () => {}) {
  try {
    const notes = await fetchAppleNotes();
    
    // Store notes in the database, updating existing ones
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      
      // Update progress
      progressCallback({
        current: i + 1,
        total: notes.length,
        note: note.name
      });
      
      // Update in database
      await new Promise((resolve, reject) => {
        db.update(
          { id: note.id },
          note,
          { upsert: true },
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
    
    // Create the search index
    searchIndex = lunr(function() {
      this.field('name', { boost: 10 });
      this.field('body');
      this.field('folder');
      this.ref('id');
      
      notes.forEach(function(note) {
        this.add(note);
      }, this);
    });
    
    notesCache = notes;
    
    return {
      indexed: notes.length,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error building index:', error);
    throw error;
  }
}

// Function to search notes
function searchNotes(query) {
  if (!searchIndex) {
    throw new Error('Index not built yet. Please run the indexNotes command first.');
  }
  
  const results = searchIndex.search(query);
  
  // Get the full notes from our cache
  return results.map(result => {
    const note = notesCache.find(n => n.id === result.ref);
    return {
      ...note,
      score: result.score
    };
  });
}

// Function to get index stats
function getIndexStats() {
  return new Promise((resolve, reject) => {
    db.count({}, (err, count) => {
      if (err) {
        reject(err);
        return;
      }
      
      resolve({
        totalNotes: count,
        indexed: notesCache.length,
        isIndexed: !!searchIndex
      });
    });
  });
}

// MCP command functions
async function indexNotesCommand() {
  console.log('Starting Apple Notes indexing...');
  
  try {
    const result = await buildIndex(progress => {
      console.log(`Indexing: ${progress.current}/${progress.total} - ${progress.note}`);
    });
    
    console.log(`Indexing complete! Indexed ${result.indexed} notes.`);
    console.log(`Last updated: ${result.lastUpdated}`);
    
    return { success: true, ...result };
  } catch (error) {
    console.error('Failed to index notes:', error);
    return { success: false, error: error.message };
  }
}

async function searchNotesCommand(query) {
  try {
    if (!query) {
      return { success: false, error: 'Please provide a search query' };
    }
    
    const results = searchNotes(query);
    
    return {
      success: true,
      results,
      count: results.length
    };
  } catch (error) {
    console.error('Search failed:', error);
    return { success: false, error: error.message };
  }
}

async function viewIndexCommand() {
  try {
    const stats = await getIndexStats();
    
    return {
      success: true,
      ...stats
    };
  } catch (error) {
    console.error('Failed to get index stats:', error);
    return { success: false, error: error.message };
  }
}

// Export MCP command handlers
module.exports = {
  indexNotes: indexNotesCommand,
  searchNotes: searchNotesCommand,
  viewIndex: viewIndexCommand
};