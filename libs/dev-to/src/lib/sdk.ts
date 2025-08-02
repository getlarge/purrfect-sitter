import axios, { isAxiosError } from 'axios';
import { Organization } from './types.js';

const apiKey = process.env.DEVTO_API_KEY;

export const devToClient = axios.create({
  baseURL: 'https://dev.to/api',
  headers: {
    'api-key': apiKey,
    'Content-Type': 'application/json',
    accept: 'application/vnd.forem.api-v1+json',
  },
});

function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.error || error.message;
  } else if (error instanceof Error) {
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
}

/**
 * Fetches the organization details from Dev.to.
 */
export async function getOrganization(
  username = 'this-is-learning'
): Promise<Organization | null> {
  try {
    const response = await devToClient.get(`/organizations/${username}`);
    return response.data;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Error fetching organization ${username}:`, errorMessage);

    return null;
  }
}

/**
 * Fetches the articles authored by the user.
 */
export async function getMyArticles(): Promise<Article[]> {
  try {
    const response = await devToClient.get('/articles/me/all', {
      params: {
        per_page: 50,
      },
    });
    return response.data;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error('Error fetching articles:', errorMessage);
    return [];
  }
}

export async function publishArticle(
  articleContent: string,
  articleId: string | number | undefined = undefined,
  organizationId: string | number | undefined = undefined
) {
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
    const response = await devToClient({
      method: articleId ? 'put' : 'post',
      url: articleId ? `/articles/${articleId}` : '/articles',
      data: payload,
    });

    console.log(`Article ${articleId ? 'updated' : 'published'}`);
    console.log(`URL: ${response.data.url}`);
    return response.data;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(
      `Error ${articleId ? 'updating' : 'publishing'} article:`,
      errorMessage
    );
  }
}
