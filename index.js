const path = require('path');
const fs = require('fs');
const jxa = require('node-jxa');
const { app } = require('electron');

// Import custom modules
const ui = require('./ui');
const { createEnhancedSearchIndex, parseQuery } = require('./search');
const { NotesDatabase, IndexMetadata } = require('./storage');

// Initialize databases
const notesDb = new NotesDatabase();
const metadataDb = new IndexMetadata();

// Global state
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
    // Fetch all notes from Apple Notes
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
      
      // Save to database
      await notesDb.saveNote(note);
    }
    
    // Create the search index
    searchIndex = createEnhancedSearchIndex(notes);
    
    // Cache notes for quick access
    notesCache = notes;
    
    // Update metadata
    await metadataDb.saveMetadata({
      lastIndexed: new Date().toISOString(),
      noteCount: notes.length,
      indexed: true
    });
    
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
async function searchNotes(queryString) {
  if (!searchIndex) {
    // Try to load the index if it exists
    await loadIndexFromStorage();
    
    if (!searchIndex) {
      throw new Error('Index not built yet. Please run the indexNotes command first.');
    }
  }
  
  // Parse the query
  const parsedQuery = parseQuery(queryString);
  
  // Execute the search with advanced options
  const results = searchIndex.advancedSearch({
    query: parsedQuery.query,
    folder: parsedQuery.folder,
    dateRange: parsedQuery.dateRange,
    sortBy: parsedQuery.sortBy
  });
  
  return results;
}

// Load index from storage
async function loadIndexFromStorage() {
  try {
    // Get metadata
    const metadata = await metadataDb.getMetadata();
    
    // If we have an index, load the notes
    if (metadata.indexed) {
      const notes = await notesDb.getAllNotes();
      
      if (notes.length > 0) {
        // Create search index
        searchIndex = createEnhancedSearchIndex(notes);
        notesCache = notes;
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error loading index:', error);
    return false;
  }
}

// Function to get index stats
async function getIndexStats() {
  try {
    // Try to load index if not loaded
    if (!searchIndex) {
      await loadIndexFromStorage();
    }
    
    // Get metadata
    const metadata = await metadataDb.getMetadata();
    const noteCount = await notesDb.countNotes();
    
    return {
      totalNotes: noteCount,
      indexed: notesCache.length,
      isIndexed: !!searchIndex,
      lastIndexed: metadata.lastIndexed
    };
  } catch (error) {
    console.error('Error getting index stats:', error);
    throw error;
  }
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
    
    return { 
      success: true, 
      ...result,
      html: ui.createIndexStatusPage({
        totalNotes: result.indexed,
        indexed: result.indexed,
        isIndexed: true
      })
    };
  } catch (error) {
    console.error('Failed to index notes:', error);
    return { 
      success: false, 
      error: error.message,
      html: `<div style="color: red; padding: 10px;">Error: ${error.message}</div>`
    };
  }
}

async function searchNotesCommand(query) {
  try {
    if (!query) {
      return { 
        success: false, 
        error: 'Please provide a search query',
        html: '<div style="padding: 10px;">Please provide a search query</div>'
      };
    }
    
    const results = await searchNotes(query);
    
    return {
      success: true,
      results,
      count: results.length,
      html: ui.createSearchResultsPage(results, query)
    };
  } catch (error) {
    console.error('Search failed:', error);
    return { 
      success: false, 
      error: error.message,
      html: `<div style="color: red; padding: 10px;">Error: ${error.message}</div>`
    };
  }
}

async function viewIndexCommand() {
  try {
    const stats = await getIndexStats();
    
    return {
      success: true,
      ...stats,
      html: ui.createIndexStatusPage(stats)
    };
  } catch (error) {
    console.error('Failed to get index stats:', error);
    return { 
      success: false, 
      error: error.message,
      html: `<div style="color: red; padding: 10px;">Error: ${error.message}</div>`
    };
  }
}

// Initialize on load
(async () => {
  try {
    await loadIndexFromStorage();
    console.log('Apple Notes Indexer initialized');
  } catch (error) {
    console.error('Error initializing Apple Notes Indexer:', error);
  }
})();

// Export MCP command handlers
module.exports = {
  indexNotes: indexNotesCommand,
  searchNotes: searchNotesCommand,
  viewIndex: viewIndexCommand
};