// UI.js - UI helpers for displaying notes in Cursor

/**
 * Format a note for display in Cursor's UI
 * @param {Object} note - Note object
 * @param {boolean} detailed - Whether to include detailed content
 * @returns {string} Formatted note HTML
 */
function formatNote(note, detailed = false) {
  // Format the date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Create note preview (first 150 chars)
  const preview = note.body ? note.body.substring(0, 150) + (note.body.length > 150 ? '...' : '') : '';
  
  // Basic note info
  let noteHtml = `
    <div class="note-item" style="margin-bottom: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
      <h3 style="margin: 0 0 5px 0;">${note.name}</h3>
      <div style="font-size: 0.8em; color: #666; margin-bottom: 5px;">
        <span>Folder: ${note.folder}</span> · 
        <span>Modified: ${formatDate(note.modificationDate)}</span>
      </div>
  `;
  
  // Add preview or full content based on detail level
  if (detailed) {
    noteHtml += `
      <div style="margin-top: 10px; white-space: pre-wrap;">${note.body}</div>
    `;
  } else {
    noteHtml += `
      <div style="margin-top: 5px; color: #333;">${preview}</div>
    `;
  }
  
  // Close the container
  noteHtml += `</div>`;
  
  return noteHtml;
}

/**
 * Create a search results page
 * @param {Array} results - Array of note results
 * @param {string} query - The search query
 * @returns {string} HTML content for display
 */
function createSearchResultsPage(results, query) {
  let html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 15px;">
      <h2>Search Results for "${query}"</h2>
      <p>Found ${results.length} notes.</p>
      <div style="margin-top: 15px;">
  `;
  
  if (results.length === 0) {
    html += `<p>No results found. Try a different search term.</p>`;
  } else {
    // Add each note to the results
    results.forEach(note => {
      html += formatNote(note);
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Create a detailed note view page
 * @param {Object} note - The note object
 * @returns {string} HTML content for display
 */
function createNoteDetailPage(note) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 15px;">
      <div style="margin-bottom: 15px;">
        <a href="#" onclick="window.history.back(); return false;" style="text-decoration: none; color: #0366d6;">
          &larr; Back to results
        </a>
      </div>
      ${formatNote(note, true)}
    </div>
  `;
}

/**
 * Create an index status page
 * @param {Object} stats - Index statistics
 * @returns {string} HTML content for display
 */
function createIndexStatusPage(stats) {
  const statusClass = stats.isIndexed ? 'text-success' : 'text-warning';
  const statusText = stats.isIndexed ? 'Indexed' : 'Not Indexed';
  
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; padding: 15px;">
      <h2>Apple Notes Index Status</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <strong>Status:</strong>
          <span class="${statusClass}">${statusText}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <strong>Total Notes:</strong>
          <span>${stats.totalNotes}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
          <strong>Indexed Notes:</strong>
          <span>${stats.indexed}</span>
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <button onclick="vscode.postMessage({command: 'indexNotes'})" style="padding: 8px 16px; background: #0366d6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ${stats.isIndexed ? 'Re-index Notes' : 'Index Notes'}
        </button>
      </div>
    </div>
  `;
}

module.exports = {
  formatNote,
  createSearchResultsPage,
  createNoteDetailPage,
  createIndexStatusPage
};