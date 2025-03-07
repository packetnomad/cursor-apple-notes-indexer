// search.js - Advanced search functionality

const lunr = require('lunr');

/**
 * Creates an enhanced Lunr search index with additional features
 * @param {Array} notes - Collection of notes to index
 * @returns {Object} Enhanced Lunr search index
 */
function createEnhancedSearchIndex(notes) {
  // Create a standard lunr index
  const idx = lunr(function() {
    // The primary search fields
    this.field('name', { boost: 10 });
    this.field('body');
    this.field('folder', { boost: 5 });
    
    // Unique identifier for each note
    this.ref('id');
    
    // Custom pipeline functions
    this.pipeline.add(
      // Function to handle Apple Notes specific patterns
      function(token) {
        // Handle checklist items formatting
        if (token && token.toString().includes('☐') || token.toString().includes('☑')) {
          return token.update(() => token.toString().replace(/[☐☑]/g, ''));
        }
        return token;
      }
    );
    
    // Add documents to the index
    notes.forEach(function(note) {
      this.add(note);
    }, this);
  });
  
  // Enhance the index with additional methods
  return {
    // Original search method
    search: function(query) {
      return idx.search(query);
    },
    
    // Search with additional filters
    advancedSearch: function(options) {
      const { query, folder, dateRange, sortBy } = options;
      
      // Perform the base search
      let results = idx.search(query);
      
      // Map results to full note objects
      results = results.map(result => {
        const note = notes.find(n => n.id === result.ref);
        return {
          ...note,
          score: result.score
        };
      });
      
      // Apply folder filter if specified
      if (folder) {
        results = results.filter(note => note.folder === folder);
      }
      
      // Apply date range filter if specified
      if (dateRange) {
        const { start, end } = dateRange;
        
        if (start && end) {
          const startDate = new Date(start);
          const endDate = new Date(end);
          
          results = results.filter(note => {
            const modDate = new Date(note.modificationDate);
            return modDate >= startDate && modDate <= endDate;
          });
        }
      }
      
      // Apply sorting if specified
      if (sortBy) {
        switch (sortBy) {
          case 'relevance':
            // Already sorted by score
            break;
            
          case 'dateNewest':
            results.sort((a, b) => new Date(b.modificationDate) - new Date(a.modificationDate));
            break;
            
          case 'dateOldest':
            results.sort((a, b) => new Date(a.modificationDate) - new Date(b.modificationDate));
            break;
            
          case 'alphabetical':
            results.sort((a, b) => a.name.localeCompare(b.name));
            break;
        }
      }
      
      return results;
    },
    
    // Get all unique folders in the index
    getFolders: function() {
      return [...new Set(notes.map(note => note.folder))];
    },
    
    // Get date range of all notes
    getDateRange: function() {
      if (notes.length === 0) return { min: null, max: null };
      
      const dates = notes.map(note => new Date(note.modificationDate));
      return {
        min: new Date(Math.min(...dates)),
        max: new Date(Math.max(...dates))
      };
    }
  };
}

/**
 * Parse a search query string and extract any special commands
 * @param {string} queryString - Raw query string from user
 * @returns {Object} Parsed query with special commands extracted
 */
function parseQuery(queryString) {
  const result = {
    query: queryString,
    folder: null,
    dateRange: null,
    sortBy: 'relevance'
  };
  
  // Extract folder: command
  const folderMatch = queryString.match(/folder:["']([^"']+)["']/i);
  if (folderMatch) {
    result.folder = folderMatch[1];
    result.query = result.query.replace(folderMatch[0], '').trim();
  }
  
  // Extract date: command (format: date:"2023-01-01 to 2023-12-31")
  const dateMatch = queryString.match(/date:["'](\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?["']/i);
  if (dateMatch) {
    const start = dateMatch[1];
    const end = dateMatch[2] || start;
    result.dateRange = { start, end };
    result.query = result.query.replace(dateMatch[0], '').trim();
  }
  
  // Extract sort: command
  const sortMatch = queryString.match(/sort:(relevance|dateNewest|dateOldest|alphabetical)/i);
  if (sortMatch) {
    result.sortBy = sortMatch[1].toLowerCase();
    result.query = result.query.replace(sortMatch[0], '').trim();
  }
  
  return result;
}

module.exports = {
  createEnhancedSearchIndex,
  parseQuery
};