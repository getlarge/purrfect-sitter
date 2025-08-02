import { writeFile } from 'node:fs/promises';
import { DeckDefinition } from './types.js';

export interface ExportOptions {
  /**
   * Output file path. If not provided, will use the deck title as filename.
   */
  outputPath?: string;
  
  /**
   * Pretty print the JSON output
   * @default true
   */
  pretty?: boolean;
  
  /**
   * Log export information to console
   * @default true
   */
  verbose?: boolean;
}

/**
 * Export a deck definition to a JSON file
 */
export async function exportDeck(
  deck: DeckDefinition,
  options: ExportOptions = {}
): Promise<string> {
  const {
    outputPath = `${deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-deck.json`,
    pretty = true,
    verbose = true,
  } = options;

  const jsonContent = pretty
    ? JSON.stringify(deck, null, 2)
    : JSON.stringify(deck);

  await writeFile(outputPath, jsonContent, 'utf-8');

  if (verbose) {
    console.log(`✅ Exported deck "${deck.title}" to ${outputPath}`);
    console.log(`📊 ${deck.slides.length} slides`);
    
    // Count total slides including verticals
    const totalSlides = deck.slides.reduce((count, slide) => {
      return Array.isArray(slide) ? count + slide.length : count + 1;
    }, 0);
    
    if (totalSlides !== deck.slides.length) {
      console.log(`📈 ${totalSlides} total slides (including vertical slides)`);
    }
  }

  return outputPath;
}

/**
 * Create the HTML form submission content for slides.com
 */
export function createSubmissionHtml(
  deck: DeckDefinition,
  formAction = 'https://slides.com/decks/define'
): string {
  const deckJson = JSON.stringify(deck, null, 2);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submit "${deck.title}" to slides.com</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        .info {
            background: #e3f2fd;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1.5rem;
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            margin-right: 1rem;
        }
        button:hover {
            background: #45a049;
        }
        textarea {
            width: 100%;
            height: 400px;
            font-family: monospace;
            font-size: 0.9rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 0.5rem;
            margin-bottom: 1rem;
        }
        .deck-info {
            background: #f0f0f0;
            padding: 1rem;
            border-radius: 4px;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Submit Deck to slides.com</h1>
        
        <div class="deck-info">
            <strong>Title:</strong> ${deck.title}<br>
            ${deck.description ? `<strong>Description:</strong> ${deck.description}<br>` : ''}
            <strong>Slides:</strong> ${deck.slides.length} (${deck.slides.reduce((count, slide) => Array.isArray(slide) ? count + slide.length : count + 1, 0)} total)
        </div>
        
        <div class="info">
            <p><strong>Instructions:</strong></p>
            <ol>
                <li>Make sure you're logged in to slides.com in this browser</li>
                <li>Review the deck definition below</li>
                <li>Click "Submit to slides.com" to create/update the deck</li>
            </ol>
        </div>

        <form method="POST" action="${formAction}" target="_blank">
            <label for="definition"><strong>Deck Definition:</strong></label>
            <textarea name="definition" id="definition">${deckJson}</textarea>
            
            <button type="submit">Submit to slides.com</button>
        </form>
    </div>
</body>
</html>`;
}

/**
 * Export deck and create submission HTML
 */
export async function exportDeckWithSubmitter(
  deck: DeckDefinition,
  options: ExportOptions & { submitterPath?: string } = {}
): Promise<{ deckPath: string; submitterPath: string }> {
  const deckPath = await exportDeck(deck, options);
  
  const submitterPath = options.submitterPath || 
    deckPath.replace(/\.json$/, '-submitter.html');
  
  const submitterHtml = createSubmissionHtml(deck);
  await writeFile(submitterPath, submitterHtml, 'utf-8');
  
  if (options.verbose !== false) {
    console.log(`🌐 Created HTML submitter at ${submitterPath}`);
    console.log(`💡 Open the submitter in your browser to submit to slides.com`);
  }
  
  return { deckPath, submitterPath };
}