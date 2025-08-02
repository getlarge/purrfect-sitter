/**
 * @see https://developers.forem.com/api/v1#tag/articles/operation/createArticle
 * Run with:
 * - npx run @purrfect-sitter/dev-to:build
 * - node --experimental-strip-types tools/scripts/publish-to-devto.js
 */

import {
  getMyArticles,
  getOrganization,
  publishArticle,
} from '@purrfect-sitter/dev-to';
import fm from 'front-matter';
import fs from 'node:fs';

const articlePath =
  process.argv[2] ||
  './docs/articles/how-to-protect-your-api-with-openfga/README.md';

const articleContent = fs.readFileSync(articlePath, 'utf8');
const { attributes } = fm.default<{ title: string }>(articleContent);

const articles = await getMyArticles();
const foundArticle = articles.find((a) => a.title === attributes.title);
const articleId = foundArticle ? foundArticle.id : undefined;
console.log(
  `Article ${attributes.title} found: ${!!foundArticle}, ID: ${articleId}`
);
// ? maybe go deeper and check tags, etc. to find the right article ?
let organizationId: number | undefined = undefined;
if (!articleId) {
  const organization = await getOrganization();
  organizationId = organization?.id;
}
await publishArticle(articleContent, articleId, organizationId);
