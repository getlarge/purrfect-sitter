/**
 * @see https://developers.forem.com/api/v1#tag/articles/operation/createArticle
 */
import axios from 'axios';
import fm from 'front-matter';
import fs from 'node:fs';

const apiKey = process.env.DEVTO_API_KEY;
const articlePath =
  process.argv[2] ||
  './docs/articles/taming-authorization-with-openfga/README.md';

const axiosInstance = axios.create({
  baseURL: 'https://dev.to/api',
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    accept: 'application/vnd.forem.api-v1+json',
  },
});

/**
 * @typedef {Object} EmbeddedUser
 * @property {string} name - The name of the user.
 * @property {string} username - The username of the user on Dev.to.
 * @property {string} twitter_username - The Twitter username of the user.
 * @property {string} github_username - The GitHub username of the user.
 * @property {number} user_id - The unique identifier of the user.
 * @property {string} website_url - The URL of the user's personal website.
 * @property {string} profile_image - The URL of the user's profile image.
 * @property {string} profile_image_90 - The URL of the user's profile image at 90px size.
 */

/**
 * @typedef {Object} EmbeddedOrganization
 * @property {string} name - The name of the organization.
 * @property {string} username - The username of the organization on Dev.to.
 * @property {string} slug - The unique slug for the organization, used in the URL.
 * @property {string} profile_image - The URL of the organization's profile image.
 * @property {string} profile_image_90 - The URL of the organization's profile image at 90px size.
 */

/**
 * @typedef {Object} Article
 * @property {string} type_of - The type of the entity, which is 'article'.
 * @property {number} id - The unique identifier of the article.
 * @property {string} title - The title of the article.
 * @property {string} description - A brief description of the article.
 * @property {boolean} published - Indicates if the article is published.
 * @property {string} published_at - The date and time when the article was published.
 * @property {string} slug - The unique slug for the article, used in the URL.
 * @property {string} path - The path to the article on Dev.to.
 * @property {string} url - The URL of the article on Dev.to.
 * @property {number} comments_count - The number of comments on the article.
 * @property {number} public_reactions_count - The number of public reactions to the article.
 * @property {number} page_views_count - The number of views the article has received.
 * @property {string} published_timestamp - The timestamp when the article was published.
 * @property {number} positive_reactions_count - The number of positive reactions to the article.
 * @property {string} cover_image - The URL of the cover image for the article.
 * @property {string[]} tag_list - An array of tags associated with the article.
 * @property {string} canonical_url - The canonical URL of the article.
 * @property {number} reading_time_minutes - The estimated reading time of the article in minutes.
 * @property {EmbeddedUser} user - The user who authored the article.
 * @property {EmbeddedOrganization} organization - The organization associated with the article, if any.
 */

/**
 * @typedef {Object} Organization
 * @property {string} type_of - The type of the entity, which is 'organization'.
 * @property {number} id - The unique identifier of the organization.
 * @property {string} name - The name of the organization.
 * @property {string} username - The username of the organization.
 * @property {string} twitter_username - The Twitter username of the organization.
 * @property {string} github_username - The GitHub username of the organization.
 * @property {string} url - The URL of the organization's Dev.to page.
 * @property {string} location - The location of the organization.
 * @property {string} tech_stack - The technology stack used by the organization.
 * @property {string} tag_line - A brief tagline describing the organization.
 * @property {string} story - The story or mission of the organization.
 * @property {string} joined_at - The date and time when the organization joined Dev.to.
 * @property {string} profile_image - The URL of the organization's profile image.
 */

/**
 * Fetches the organization details from Dev.to.
 * @param {string} [username='this-is-learning'] - The username of the organization to fetch.
 * @returns {Promise<Organization|null>} The organization details or null if not found.
 */
async function getOrganization(username = 'this-is-learning') {
  try {
    const response = await axiosInstance.get(`/organizations/${username}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching organization:', error.message);
    return null;
  }
}

/**
 * Fetches the articles authored by the user.
 * @returns {Promise<Article[]>} A list of articles authored by the user.
 */
async function getMyArticles() {
  try {
    const response = await axiosInstance.get('/articles/me/all', {
      params: {
        per_page: 50,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching articles:', error.message);
    return [];
  }
}

/**
 *
 * @param {string} articleContent - The content of the article in Markdown format.
 * @param {string|number} [articleId]
 * @param {string|number} [organizationId]
 * @returns
 */
async function publishArticle(articleContent, articleId, organizationId) {
  if (articleId) {
    console.log(`Updating article with ID: ${articleId}`);
  } else {
    console.log('Creating a new article');
  }
  try {
    const payload = {
      article: {
        body_markdown: articleContent,
        ...(organizationId && { organization_id: organizationId }),
      },
    };
    const response = await axiosInstance({
      method: articleId ? 'put' : 'post',
      url: articleId ? `/articles/${articleId}` : '/articles',
      data: payload,
    });

    console.log(`Article ${articleId ? 'updated' : 'published'}`);
    console.log(`URL: ${response.data.url}`);
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

const articleContent = fs.readFileSync(articlePath, 'utf8');
const { attributes } = fm(articleContent);

const articles = await getMyArticles();
const foundArticle = articles.find((a) => a.title === attributes.title);
const articleId = foundArticle ? foundArticle.id : null;
console.log(
  `Article ${attributes.title} found: ${!!foundArticle}, ID: ${articleId}`
);
// ? maybe go deeper and check tags, etc. to find the right article ?
let organizationId = null;
if (!articleId) {
  const organization = await getOrganization();
  organizationId = organization?.id;
}
await publishArticle(articleContent, articleId, organizationId);
