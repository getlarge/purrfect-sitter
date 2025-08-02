/**
 * HalfStack Talk Slides Generator
 * Run with:
 * - npx run @purrfect-sitter/slides-com:build
 * - node --experimental-strip-types tools/scripts/halfstack-slides-generator.ts
 * - npx light-server -s .  -p 9080
 * - open http://localhost:9080/tools/scripts/halfstack-submitter.html
 */

import {
  DeckBuilder,
  textBlock,
  codeBlock,
  exportDeckWithSubmitter,
  type DeckTheme,
} from '@purrfect-sitter/slides-com';

const THEME: DeckTheme = {
  colors: {
    primary: '#4CAF50',
    accent: '#FFD600',
    text: '#212121',
    textLight: '#FFFFFF',
    background: '#FAFAFA',
  },
};

class HalfStackSlidesGenerator {
  private builder: DeckBuilder;

  constructor() {
    this.builder = new DeckBuilder({
      title:
        'Who Let the Cats Out?: Solving the Authorization Mystery with ReBAC',
      description: 'HalfStack Vienna - September 2025',
      theme: THEME,
      themeColor: 'white-blue',
      themeFont: 'montserrat',
      transition: 'slide',
      visibility: 'all',
    });
  }

  generate() {
    // Title slide with custom HTML
    this.builder.addHtmlSlide(
      `
      <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; position: relative;">
        <div style="transform: rotate(-15deg); position: absolute; top: 10%; left: 5%; font-size: 2em; opacity: 0.8; color: white;">
          Bonjour!
        </div>

        <h1 style="font-size: 4em; font-weight: 900; text-align: center; margin: 0; line-height: 1.2; color: white;">
          Who Let the <span style="color: #FFD600">Cats</span> Out?
        </h1>
        <h2 style="font-size: 2em; font-weight: 400; opacity: 0.8; color: white; margin: 0.5em 0;">
          Solving the Authorization Mystery with ReBAC
        </h2>

        <div style="position: absolute; bottom: 15%; font-size: 4em;">🐱</div>

        <div style="position: absolute; bottom: 5%; font-size: 1.2em; opacity: 0.7; color: white;">
          HalfStack Vienna • September 2025
        </div>
      </div>
    `,
      {
        'background-color': THEME.colors?.primary,
      }
    );

    // Speaker intro
    this.builder
      .addChapterSlide(
        'Bonjour! 👋',
        undefined,
        THEME.colors?.primary,
        THEME.colors?.accent,
        'white'
      )
      .addBlockSlide(
        [
          textBlock(
            '**Edouard Maleix**\n\nEngineering @ GetLarge\n\nCat enthusiast & authorization detective 🕵️',
            {
              format: 'h2',
              align: 'center',
              color: 'white',
            }
          ),
        ],
        {
          'background-color': THEME.colors?.primary,
        }
      );

    // Agenda
    this.builder.addBlockSlide(
      [
        textBlock('AGENDA', {
          format: 'h1',
          align: 'center',
          color: THEME.colors?.accent,
        }),
        textBlock('→ OWASP API Security Risks (with cats!)', {
          format: 'h2',
          align: 'left',
          color: 'white',
        }),
        textBlock('― Live Exploitation Demos', {
          format: 'h2',
          align: 'left',
          color: 'white',
        }),
        textBlock('― The Authorization Horror Story', {
          format: 'h2',
          align: 'left',
          color: 'white',
        }),
        textBlock('― Enter ReBAC: Relationships > Roles', {
          format: 'h2',
          align: 'left',
          color: 'white',
        }),
        textBlock('― PurrfectSitter Demo with OpenFGA', {
          format: 'h2',
          align: 'left',
          color: 'white',
        }),
      ],
      {
        'background-color': THEME.colors?.primary,
      }
    );

    // Chapter 1: OWASP API Security Top 10
    this.builder.addVerticalSlides([
      // Chapter title
      {
        'background-color': THEME.colors?.primary,
        blocks: [
          textBlock('Conference & Cat Edition 🐱', {
            format: 'h2',
            align: 'center',
            color: 'white',
          }),
          textBlock('OWASP API Security Top 10', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
        ],
      },
      // API1: Broken Object Level Authorization
      {
        'background-color': THEME.colors?.background,
        blocks: [
          textBlock('API1:2023 - Broken Object Level Authorization', {
            format: 'h1',
            align: 'center',
          }),
          textBlock('**"Taking Someone Else\'s Stuff"** 🎒', {
            format: 'h2',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          textBlock(
            `**Conference example:**
✓ You're a speaker (correct role)
✗ But you can't take MY backpack!

Just because you can access \`/api/backpacks/\`
doesn't mean you can access \`/api/backpacks/mine\``,
            {
              format: 'p',
              'font-size': '120%',
            }
          ),
          codeBlock(
            `// Vulnerable: Only checks if user is a sitter
GET /api/cats/romeo/health-updates
Authorization: Bearer <anne-token>
// Anne is a sitter, but is she Romeo's sitter? 🤔`,
            {
              language: 'javascript',
              theme: 'monokai',
              'line-numbers': true,
            }
          ),
        ],
      },
      // Additional OWASP slides...
      {
        'background-color': THEME.colors?.background,
        blocks: [
          textBlock('API5:2023 - Broken Function Level Authorization', {
            format: 'h1',
            align: 'center',
          }),
          textBlock('**"Wrong Time Slot, Wrong Stage"** ⏰', {
            format: 'h2',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          textBlock(
            `**Conference example:**
✓ You're a speaker (correct role)
✗ But it's NOT your time slot (wrong context)

*"Hey, I'm also a speaker!" waves from audience*
Audience: "Wait, two speakers?"`,
            {
              format: 'p',
              'font-size': '120%',
            }
          ),
          codeBlock(
            `// Anne tries to post updates at 3 AM when her sitting ended at 6 PM
POST /api/sittings/123/updates
Authorization: Bearer <anne-token>
// Is Anne an ACTIVE sitter right now?`,
            {
              language: 'javascript',
              theme: 'monokai',
            }
          ),
        ],
      },
    ]);

    // Chapter 2: Live Demos
    this.builder.addVerticalSlides([
      // Chapter title
      {
        'background-color': THEME.colors?.primary,
        blocks: [
          textBlock('Breaking PurrfectSitter 🔴', {
            format: 'h2',
            align: 'center',
            color: 'white',
          }),
          textBlock('Live Exploitation Demos', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
        ],
      },
      // Demo slides...
      {
        'background-color': THEME.colors?.background,
        blocks: [
          textBlock('🔴 LIVE: The Curious Case of the Wrong Cat Owner', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          textBlock('**Setup:** Bob owns Romeo, Anne is a sitter', {
            format: 'p',
            'font-size': '120%',
          }),
          codeBlock(
            `// Vulnerable endpoint
app.get('/api/cats/:catId', authenticateUser, async (req, res) => {
  const { catId } = req.params;
  // ❌ Only checks if user is authenticated, not if they own this cat
  const cat = await db.cats.findById(catId);
  res.json(cat);
});`,
            {
              language: 'javascript',
              theme: 'monokai',
            }
          ),
          textBlock(
            '🎯 **Audience participation:** "What cat IDs should we try?"',
            {
              format: 'h2',
              align: 'center',
              color: THEME.colors?.accent,
            }
          ),
        ],
      },
    ]);

    // Chapter 3: ReBAC Solution
    this.builder.addVerticalSlides([
      // Chapter title
      {
        'background-color': THEME.colors?.primary,
        blocks: [
          textBlock('Enter ReBAC 🌟', {
            format: 'h2',
            align: 'center',
            color: 'white',
          }),
          textBlock('There Has To Be A Better Way!', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
        ],
      },
      // ReBAC explanation
      {
        'background-color': THEME.colors?.primary,
        blocks: [
          textBlock('What If We Could Express This Naturally?', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          textBlock(
            `Bob **owns** Romeo
Anne **sits** Romeo
Jenny **administers** system`,
            {
              format: 'h2',
              align: 'center',
              color: 'white',
            }
          ),
          textBlock('↓', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          codeBlock(
            `user:bob → owner → cat:romeo
user:anne → sitter → cat:romeo
user:jenny → admin → system`,
            {
              language: 'yaml',
              theme: 'solarized-light',
            }
          ),
          textBlock(
            `Welcome to **ReBAC**
*Relation-Based Access Control*`,
            {
              format: 'h2',
              align: 'center',
              color: 'white',
            }
          ),
        ],
      },
      // ReBAC code example
      {
        'background-color': THEME.colors?.primary,
        blocks: [
          textBlock('From 127 Lines to This', {
            format: 'h1',
            align: 'center',
            color: THEME.colors?.accent,
          }),
          textBlock('**The Model:**', {
            format: 'h2',
            color: 'white',
          }),
          codeBlock(
            `type cat
  relations
    define owner: [user]
    define admin: admin from system
    define active_sitter: [cat_sitting#sitter with is_active]
    define can_update: owner or admin or active_sitter`,
            {
              language: 'yaml',
              theme: 'monokai',
            }
          ),
          textBlock('**The Check:**', {
            format: 'h2',
            color: 'white',
          }),
          codeBlock(
            `const canUpdate = await fga.check({
  user: \`user:\${userId}\`,
  relation: 'can_update',
  object: \`cat:\${catId}\`,
  context: { current_time: new Date().toISOString() }
});`,
            {
              language: 'javascript',
              theme: 'monokai',
            }
          ),
          textBlock(
            '*"Raise your hand if you\'d rather debug 6 lines than 127 lines at 3 AM 🙋"*',
            {
              format: 'p',
              align: 'center',
              color: THEME.colors?.accent,
            }
          ),
        ],
      },
    ]);

    return this.builder.build();
  }
}

async function main() {
  const generator = new HalfStackSlidesGenerator();
  const deck = generator.generate();

  const { deckPath, submitterPath } = await exportDeckWithSubmitter(deck, {
    outputPath: 'halfstack-deck.json',
    submitterPath: 'tools/scripts/halfstack-submitter.html',
  });

  console.log('🎨 Generated HalfStack presentation deck');
  console.log(`📄 Deck: ${deckPath}`);
  console.log(`🌐 Submitter: ${submitterPath}`);
  console.log(
    '\n💡 Open the submitter HTML file in your browser to submit to slides.com'
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
