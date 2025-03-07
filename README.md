# Cursor Apple Notes Indexer

A Cursor MCP app that allows you to search your Apple Notes and create a local index that builds progressively.

## Features

- 🔍 **Search Apple Notes**: Quickly find your notes without leaving Cursor
- 📇 **Progressive Indexing**: The app builds and updates its index as you use it
- 🔄 **Live Updates**: Re-index to capture your latest notes
- 🔎 **Advanced Search**: Use filters and operators for precise searching
- 🗄️ **Local Storage**: All indexed data is stored locally on your machine

## Installation

1. Clone this repository
2. Open the folder in Cursor
3. Run `npm install` to install dependencies
4. Install the app in Cursor's MCP panel

## Usage

### Indexing Notes

Before searching, you need to build the index:

1. Open the Command Palette in Cursor (Cmd+Shift+P)
2. Type "Apple Notes Indexer: Index Notes"
3. Wait for the indexing process to complete

### Searching Notes

1. Open the Command Palette in Cursor (Cmd+Shift+P)
2. Type "Apple Notes Indexer: Search Notes"
3. Enter your search query
4. Browse through the results

### Advanced Search

You can use advanced search operators in your queries:

- `folder:"Personal"` - Search only in the "Personal" folder
- `date:"2023-01-01 to 2023-12-31"` - Search for notes within a date range
- `sort:dateNewest` - Sort results by date (newest first)

Combined example:
```
meeting notes folder:"Work" date:"2023-01-01 to 2023-12-31" sort:dateNewest
```

### View Index Status

1. Open the Command Palette in Cursor (Cmd+Shift+P)
2. Type "Apple Notes Indexer: View Index"
3. See statistics about your indexed notes

## Requirements

- macOS (since it uses Apple Notes)
- Cursor IDE
- Node.js 14+

## Privacy

All data remains on your local machine. The app does not send your notes or search queries to any external servers.

## Troubleshooting

If you encounter permission issues when accessing Apple Notes, make sure to:

1. Open System Preferences > Security & Privacy > Privacy > Automation
2. Allow Cursor to control the Notes app

## Development

### Building

```bash
npm install
npm run build
```

### Contributing

Pull requests are welcome! Please feel free to contribute to this project.

## License

MIT