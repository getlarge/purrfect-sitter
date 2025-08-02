import type { Page, ElementHandle } from 'playwright';
import type { DeckDefinition, SlideContent, ContentBlock } from '../types.js';
import {
  ScrapingOptions,
  ScrapingResult,
  SlidesDetector,
  SlidesNavigator,
  ScrapingError,
} from './core.js';
import {
  ContentExtractor,
  ElementDetector,
  StyleExtractor,
  TextExtractor,
  CodeExtractor,
  ImageExtractor,
  IframeExtractor,
  TableExtractor,
} from './extractors.js';

const DEFAULT_OPTIONS: Required<ScrapingOptions> = {
  waitForAnimation: true,
  maxSlideWait: 3000,
  ignoreErrors: false,
  extractSpeakerNotes: true,
  preserveMediaUrls: true,
  validateNavigation: true,
};

export class DeckScraper {
  private navigator: SlidesNavigator;
  private extractors: ContentExtractor[];
  private detector: ElementDetector;
  private options: Required<ScrapingOptions>;

  constructor(private page: Page, options: ScrapingOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.navigator = new SlidesNavigator(page);
    this.detector = new ElementDetector();

    // Register extractors in priority order (most specific first)
    this.extractors = [
      new CodeExtractor(page),
      new ImageExtractor(page),
      new IframeExtractor(page),
      new TableExtractor(page),
      new TextExtractor(page), // Fallback extractor
    ];
  }

  async scrapePresentation(url: string): Promise<ScrapingResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      if (!(await SlidesDetector.isValidSlidesComUrl(url))) {
        throw new ScrapingError('Invalid slides.com URL', 'INVALID_URL');
      }

      await this.page.goto(url, { waitUntil: 'networkidle' });
      await SlidesDetector.waitForPresentation(this.page);

      const globalProps = await this.extractGlobalProperties();

      const navMap = await this.navigator.detectStructure();

      const slides: (SlideContent | SlideContent[])[] = [];
      let totalExtracted = 0;

      for (let h = 0; h < navMap.totalHorizontal; h++) {
        const verticalCount = navMap.verticalSlides.get(h) || 0;

        if (verticalCount > 0) {
          // Handle vertical slide stack
          const verticalSlides: SlideContent[] = [];
          for (let v = 0; v < verticalCount; v++) {
            try {
              await this.navigator.navigateToSlide(h, v);
              const slideContent = await this.extractSlideContent(h, v);
              verticalSlides.push(slideContent);
              totalExtracted++;
            } catch (error) {
              const errorMsg = `Failed to extract slide ${h},${v}: ${
                (error as Error).message
              }`;
              errors.push(errorMsg);
              if (!this.options.ignoreErrors) throw error;
            }
          }
          if (verticalSlides.length > 0) {
            slides.push(verticalSlides);
          }
        } else {
          // Handle single slide
          try {
            await this.navigator.navigateToSlide(h);
            const slideContent = await this.extractSlideContent(h);
            slides.push(slideContent);
            totalExtracted++;
          } catch (error) {
            const errorMsg = `Failed to extract slide ${h}: ${
              (error as Error).message
            }`;
            errors.push(errorMsg);
            if (!this.options.ignoreErrors) throw error;
          }
        }
      }

      // @ts-expect-error this is fine 🔥
      const deck: DeckDefinition = {
        ...globalProps,
        slides,
      };

      return {
        deck,
        metadata: {
          totalSlides: totalExtracted,
          verticalSlides: navMap.verticalSlides.size,
          errors,
          extractionTime: Date.now() - startTime,
          slidesUrl: url,
        },
      };
    } catch (error) {
      if (error instanceof ScrapingError) {
        throw error;
      }
      throw new ScrapingError(
        `Failed to scrape presentation: ${(error as Error).message}`,
        'SCRAPING_FAILED'
      );
    }
  }

  private async extractGlobalProperties(): Promise<Partial<DeckDefinition>> {
    return await this.page.evaluate(() => {
      const reveal = window.Reveal;
      if (!reveal) return {};

      const config = reveal.getConfig();

      // Extract title from page or presentation
      const title =
        document.title ||
        document.querySelector('h1')?.textContent ||
        'Scraped Presentation';

      // Extract description from meta tag or first slide
      const description =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ||
        document.querySelector('.reveal .slides section:first-child p')
          ?.textContent;

      return {
        title: title.trim(),
        description: description?.trim(),
        'theme-font': config.theme || undefined,
        transition: config.transition || 'slide',
        loop: config.loop || false,
        'slide-number': config.slideNumber || false,
        visibility: 'all' as const,
      };
    });
  }

  private async extractSlideContent(
    h: number,
    v?: number
  ): Promise<SlideContent> {
    await this.navigator.waitForSlideTransition(this.options.maxSlideWait);

    // Extract background and slide-level properties
    const slideProps = await StyleExtractor.extractSlideBackground(this.page);

    // Find all content elements
    const elements = await this.detector.findContentElements(this.page);
    const blocks: ContentBlock[] = [];

    for (const element of elements) {
      try {
        // Find appropriate extractor
        const extractor = await this.findExtractor(element);
        if (extractor) {
          const block = await extractor.extract(element);
          blocks.push(block);
        }
      } catch (error) {
        const errorMsg = `Failed to extract element in slide ${h}${
          v !== undefined ? `,${v}` : ''
        }: ${(error as Error).message}`;
        console.warn(errorMsg);
        if (!this.options.ignoreErrors) {
          throw new ScrapingError(errorMsg, 'ELEMENT_EXTRACTION_FAILED', h);
        }
      }
    }

    // Extract speaker notes if enabled
    let notes: string | undefined;
    if (this.options.extractSpeakerNotes) {
      notes = await this.extractSpeakerNotes();
    }

    return {
      ...slideProps,
      blocks,
      notes,
    };
  }

  private async findExtractor(
    element: ElementHandle
  ): Promise<ContentExtractor | null> {
    for (const extractor of this.extractors) {
      try {
        if (await extractor.canHandle(element)) {
          return extractor;
        }
      } catch {
        // Continue to next extractor if this one fails
        continue;
      }
    }
    return null;
  }

  private async extractSpeakerNotes(): Promise<string | undefined> {
    return await this.page.evaluate(() => {
      const notesElements = document.querySelectorAll(
        '.speaker-notes, aside.notes, .notes'
      );
      if (notesElements.length === 0) return undefined;

      const notes = Array.from(notesElements)
        .map((el) => el.textContent?.trim())
        .filter((text) => text && text.length > 0)
        .join('\n\n');

      return notes.length > 0 ? notes : undefined;
    });
  }

  // Utility method for testing individual slides
  async extractCurrentSlide(): Promise<SlideContent> {
    const position = await this.navigator.getCurrentPosition();
    return await this.extractSlideContent(position.h, position.v);
  }

  // Utility method to test navigation
  async testNavigation(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    let success = true;

    try {
      const navMap = await this.navigator.detectStructure();
      console.log(`Detected ${navMap.totalHorizontal} horizontal slides`);

      // Test navigation to a few slides
      const testSlides = [
        { h: 0 },
        { h: Math.min(1, navMap.totalHorizontal - 1) },
        { h: Math.min(2, navMap.totalHorizontal - 1) },
      ];

      for (const slide of testSlides) {
        try {
          await this.navigator.navigateToSlide(slide.h);
          const position = await this.navigator.getCurrentPosition();
          if (position.h !== slide.h) {
            errors.push(
              `Navigation mismatch: expected ${slide.h}, got ${position.h}`
            );
            success = false;
          }
        } catch (error) {
          errors.push(
            `Failed to navigate to slide ${slide.h}: ${
              (error as Error).message
            }`
          );
          success = false;
        }
      }
    } catch (error) {
      errors.push(`Navigation test failed: ${(error as Error).message}`);
      success = false;
    }

    return { success, errors };
  }
}
