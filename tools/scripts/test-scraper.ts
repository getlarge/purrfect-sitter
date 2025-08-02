#!/usr/bin/env node

/**
 * Test Script for Slides.com Scraper
 *
 * This script demonstrates the round-trip process:
 * 1. Generate a deck using DeckBuilder
 * 2. Upload it to slides.com (manual step)
 * 3. Scrape it back using DeckScraper
 * 4. Compare the results
 * * Usage:
 * Generate test deck
  node --experimental-strip-types tools/scripts/test-scraper.ts --generate
  # Upload to slides.com (manual step)
  # Scrape back and validate
  node --experimental-strip-types tools/scripts/test-scraper.ts --scrape <slides.com-url>
 */

import { chromium } from 'playwright';
import {
  DeckBuilder,
  DeckScraper,
  textBlock,
  codeBlock,
  exportDeck,
  type ScrapingResult,
} from '@purrfect-sitter/slides-com';

async function createTestDeck() {
  const builder = new DeckBuilder({
    title: 'Scraper Test Deck',
    description: 'Testing the slides.com scraper functionality',
    themeColor: 'white-blue',
    themeFont: 'montserrat',
    transition: 'slide',
  });

  // Add a simple test deck
  builder
    .addTitleSlide('Scraper Test', 'Round-trip validation demo')
    .addBlockSlide([
      textBlock('Test Slide 1', { format: 'h1', align: 'center' }),
      textBlock('This is a test slide with some content.', { format: 'p' }),
      codeBlock('console.log("Hello, World!");', { language: 'javascript' }),
    ])
    .addBlockSlide([
      textBlock('Test Slide 2', { format: 'h1', align: 'center' }),
      textBlock('Another slide with different content.', { format: 'p' }),
      textBlock('• List item 1\n• List item 2\n• List item 3', { format: 'p' }),
    ]);

  return builder.build();
}

async function testScraper(url: string): Promise<ScrapingResult> {
  const browser = await chromium.launch({ headless: false }); // Use headless: false to see what's happening
  const page = await browser.newPage();

  try {
    const scraper = new DeckScraper(page, {
      waitForAnimation: true,
      extractSpeakerNotes: true,
      ignoreErrors: false,
    });

    console.log('🔍 Testing navigation...');
    const navTest = await scraper.testNavigation();
    if (!navTest.success) {
      console.warn('⚠️ Navigation test failed:', navTest.errors);
    } else {
      console.log('✅ Navigation test passed');
    }

    console.log('🕷️ Scraping presentation...');
    const result = await scraper.scrapePresentation(url);

    console.log(`📊 Scraping Results:`);
    console.log(`   Title: ${result.deck.title}`);
    console.log(`   Total slides: ${result.metadata.totalSlides}`);
    console.log(`   Extraction time: ${result.metadata.extractionTime}ms`);
    console.log(`   Errors: ${result.metadata.errors.length}`);

    if (result.metadata.errors.length > 0) {
      console.log('⚠️ Errors encountered:');
      result.metadata.errors.forEach((error) => console.log(`   - ${error}`));
    }

    return result;
  } finally {
    await browser.close();
  }
}

async function compareDeckStructure(original: any, scraped: any) {
  console.log('\n🔍 Comparing deck structures...');

  const differences: string[] = [];

  if (original.title !== scraped.title) {
    differences.push(
      `Title mismatch: "${original.title}" vs "${scraped.title}"`
    );
  }

  if (original.slides.length !== scraped.slides.length) {
    differences.push(
      `Slide count mismatch: ${original.slides.length} vs ${scraped.slides.length}`
    );
  }

  // Compare each slide's block count
  for (
    let i = 0;
    i < Math.min(original.slides.length, scraped.slides.length);
    i++
  ) {
    const origSlide = Array.isArray(original.slides[i])
      ? original.slides[i][0]
      : original.slides[i];
    const scrapedSlide = Array.isArray(scraped.slides[i])
      ? scraped.slides[i][0]
      : scraped.slides[i];

    const origBlocks = origSlide.blocks?.length || 0;
    const scrapedBlocks = scrapedSlide.blocks?.length || 0;

    if (origBlocks !== scrapedBlocks) {
      differences.push(
        `Slide ${i} block count mismatch: ${origBlocks} vs ${scrapedBlocks}`
      );
    }
  }

  if (differences.length === 0) {
    console.log('✅ Structures match!');
  } else {
    console.log('⚠️ Structural differences found:');
    differences.forEach((diff) => console.log(`   - ${diff}`));
  }

  return differences.length === 0;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--generate')) {
    // Generate test deck
    console.log('🎨 Generating test deck...');
    const deck = await createTestDeck();
    const outputPath = await exportDeck(deck, {
      outputPath: 'scraper-test-deck.json',
      verbose: true,
    });

    console.log(`\n📝 Next steps:`);
    console.log(`1. Upload ${outputPath} to slides.com using the submitter`);
    console.log(`2. Save the presentation and note its URL`);
    console.log(
      `3. Run: node --experimental-strip-types tools/scripts/test-scraper.mts --scrape <URL>`
    );

    return;
  }

  if (args.includes('--scrape')) {
    const urlIndex = args.indexOf('--scrape') + 1;
    if (urlIndex >= args.length) {
      console.error('❌ Please provide a slides.com URL after --scrape');
      process.exit(1);
    }

    const url = args[urlIndex];
    console.log(`🕷️ Scraping presentation: ${url}`);

    try {
      const result = await testScraper(url);

      // Save scraped result
      const scrapedPath = await exportDeck(result.deck, {
        outputPath: 'scraped-deck.json',
        verbose: true,
      });

      console.log(`\n💾 Scraped deck saved to: ${scrapedPath}`);

      // Try to compare with original if it exists
      try {
        const originalDeck = JSON.parse(
          await import('fs').then((fs) =>
            fs.readFileSync('scraper-test-deck.json', 'utf-8')
          )
        );

        await compareDeckStructure(originalDeck, result.deck);
      } catch {
        console.log('ℹ️ Could not find original deck for comparison');
      }
    } catch (error) {
      console.error('❌ Scraping failed:', (error as Error).message);
      process.exit(1);
    }

    return;
  }

  // Default: show usage
  console.log('🧪 Slides.com Scraper Test Tool\n');
  console.log('Usage:');
  console.log('  --generate    Generate a test deck JSON');
  console.log('  --scrape URL  Scrape a slides.com presentation');
  console.log('\nExample workflow:');
  console.log(
    '  1. node --experimental-strip-types tools/scripts/test-scraper.mts --generate'
  );
  console.log('  2. Upload the generated deck to slides.com');
  console.log(
    '  3. node --experimental-strip-types tools/scripts/test-scraper.mts --scrape <URL>'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
