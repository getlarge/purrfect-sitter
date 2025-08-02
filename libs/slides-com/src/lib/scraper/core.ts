/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Page } from 'playwright';
import type { DeckDefinition } from '../types.js';

declare global {
  interface Window {
    Reveal: {
      VERSION: string;
      isReady: () => boolean;
      getSlides: () => HTMLElement[];
      getTotalSlides: () => number;
      getConfig: () => any;
      getIndices: () => { h: number; v: number };
      isAutoSliding: () => boolean;
      isPaused: () => boolean;
      getSlide: (h: number, v?: number) => HTMLElement;
      getSlideContent: (h: number, v?: number) => string;
      getSlideBackground: (h: number, v?: number) => string;
      getSlideNotes: (h: number, v?: number) => string;
      getSlideAttributes: (h: number, v?: number) => Record<string, string>;
      getSlideClasses: (h: number, v?: number) => string[];
      getSlideStyles: (h: number, v?: number) => CSSStyleDeclaration;
      getSlideId: (h: number, v?: number) => string | undefined;
      slide: (h: number, v?: number) => void;
      getVerticalSlides: (h: number) => HTMLElement[];
      getHorizontalSlides: () => HTMLElement[];
      getSlideBackgroundElement: (h: number, v?: number) => HTMLElement | null;
      getSlideBackgroundImage: (h: number, v?: number) => string | null;
      getSlideBackgroundColor: (h: number, v?: number) => string | null;
      getSlideBackgroundVideo: (h: number, v?: number) => string | null;
      getSlideBackgroundAudio: (h: number, v?: number) => string | null;
      getSlideBackgroundIframe: (
        h: number,
        v?: number
      ) => HTMLIFrameElement | null;
    };
  }
}

export interface ScrapingOptions {
  waitForAnimation?: boolean;
  maxSlideWait?: number; // ms
  ignoreErrors?: boolean;
  extractSpeakerNotes?: boolean;
  preserveMediaUrls?: boolean;
  validateNavigation?: boolean;
}

export interface ScrapingResult {
  deck: DeckDefinition;
  metadata: {
    totalSlides: number;
    verticalSlides: number;
    errors: string[];
    extractionTime: number;
    slidesUrl: string;
  };
}

export interface SlideNavigationMap {
  totalHorizontal: number;
  verticalSlides: Map<number, number>; // horizontal index -> vertical count
  currentPosition: { h: number; v: number };
}

export class ScrapingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly slideIndex?: number,
    public readonly retryable = false
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class SlidesDetector {
  static async isValidSlidesComUrl(url: string): Promise<boolean> {
    return url.includes('slides.com') && !url.includes('/edit');
  }

  static async detectRevealJsVersion(page: Page): Promise<string> {
    return await page.evaluate(() => {
      return window.Reveal?.VERSION || 'unknown';
    });
  }

  static async waitForPresentation(page: Page, timeout = 10000): Promise<void> {
    await page.waitForSelector('.reveal', { timeout });
    await page.waitForFunction(
      () => {
        const reveal = window.Reveal;
        return reveal && reveal.isReady && reveal.isReady();
      },
      { timeout }
    );
  }
}

export class SlidesNavigator {
  constructor(private page: Page) {}

  async detectStructure(): Promise<SlideNavigationMap> {
    return await this.page
      .evaluate(() => {
        const reveal = window.Reveal;
        if (!reveal) {
          throw new Error('Reveal.js not found');
        }

        const slides = reveal?.getSlides?.();
        const totalHorizontal = reveal.getTotalSlides();
        const verticalSlides = new Map<number, number>();

        // Detect vertical slides by analyzing the slide structure
        slides.forEach((slide) => {
          const parent = slide.parentElement;
          if (parent && parent.tagName === 'SECTION') {
            // This is a vertical slide
            const horizontalIndex = Array.from(
              parent.parentElement!.children
            ).indexOf(parent);
            const verticalIndex = Array.from(parent.children).indexOf(slide);

            if (!verticalSlides.has(horizontalIndex)) {
              verticalSlides.set(horizontalIndex, 0);
            }
            verticalSlides.set(
              horizontalIndex,
              Math.max(verticalSlides.get(horizontalIndex)!, verticalIndex + 1)
            );
          }
        });

        const indices = reveal.getIndices();

        return {
          totalHorizontal,
          verticalSlides: Object.fromEntries(verticalSlides), // Convert Map to object for serialization
          currentPosition: { h: indices.h, v: indices.v },
        };
      })
      .then((result) => ({
        ...result,
        verticalSlides: new Map(
          Object.entries(result.verticalSlides).map(([k, v]) => [
            parseInt(k),
            v as number,
          ])
        ),
      }));
  }

  async navigateToSlide(h: number, v?: number): Promise<boolean> {
    try {
      await this.page.evaluate(
        ({ h, v }) => {
          const reveal = window.Reveal;
          if (!reveal) throw new Error('Reveal.js not available');

          if (v !== undefined) {
            reveal.slide(h, v);
          } else {
            reveal.slide(h);
          }
        },
        { h, v }
      );

      await this.waitForSlideTransition();
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new ScrapingError(
        `Failed to navigate to slide ${h}${
          v !== undefined ? `,${v}` : ''
        }: ${errorMessage}`,
        'NAVIGATION_FAILED',
        h,
        true
      );
    }
  }

  async getCurrentPosition(): Promise<{ h: number; v: number }> {
    return await this.page.evaluate(() => {
      const reveal = window.Reveal;
      if (!reveal) throw new Error('Reveal.js not available');

      const indices = reveal.getIndices();
      return { h: indices.h, v: indices.v };
    });
  }

  async waitForSlideTransition(timeout = 3000): Promise<void> {
    // Wait for any ongoing transitions to complete
    await this.page.waitForFunction(
      () => {
        const reveal = window.Reveal;
        return reveal && !reveal.isAutoSliding() && !reveal.isPaused();
      },
      { timeout }
    );

    // Additional wait for animations
    await this.page.waitForTimeout(300);
  }
}

export class ErrorHandler {
  // private static readonly RETRY_CODES = [
  //   'NAVIGATION_TIMEOUT',
  //   'ELEMENT_NOT_FOUND',
  // ];
  private static readonly MAX_RETRIES = 3;

  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = ErrorHandler.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (error instanceof ScrapingError && !error.retryable) {
          throw error;
        }

        if (attempt === maxRetries) break;

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
    // @ts-expect-error this is fine 🔥
    const errorMessage = lastError
      ? lastError.message
      : 'Unknown error occurred';
    throw new ScrapingError(
      `Failed after ${maxRetries} attempts in ${context}: ${errorMessage}`,
      'MAX_RETRIES_EXCEEDED'
    );
  }
}
