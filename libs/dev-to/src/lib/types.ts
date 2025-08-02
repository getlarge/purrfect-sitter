export interface EmbeddedUser {
  /** The name of the user. */
  name: string;
  /** The username of the user on Dev.to. */
  username: string;
  /** The Twitter username of the user. */
  twitter_username: string;
  /** The GitHub username of the user. */
  github_username: string;
  /** The unique identifier of the user. */
  user_id: number;
  /** The URL of the user's personal website. */
  website_url: string;
  /** The URL of the user's profile image. */
  profile_image: string;
  /** The URL of the user's profile image at 90px size. */
  profile_image_90: string;
}

export interface EmbeddedOrganization {
  /** The name of the organization. */
  name: string;
  /** The username of the organization on Dev.to. */
  username: string;
  /** The unique slug for the organization, used in the URL. */
  slug: string;
  /** The URL of the organization's profile image. */
  profile_image: string;
  /** The URL of the organization's profile image at 90px size. */
  profile_image_90: string;
}

export interface Article {
  /** The type of the entity, which is 'article'. */
  type_of: 'article';
  /** The unique identifier of the article. */
  id: number;
  /** The title of the article. */
  title: string;
  /** A brief description of the article. */
  description: string;
  /** Indicates if the article is published. */
  published: boolean;
  /** The date and time when the article was published. */
  published_at: string;
  /** The unique slug for the article, used in the URL. */
  slug: string;
  /** The path to the article on Dev.to. */
  path: string;
  /** The URL of the article on Dev.to. */
  url: string;
  /** The number of comments on the article. */
  comments_count: number;
  /** The number of public reactions to the article. */
  public_reactions_count: number;
  /** The number of views the article has received. */
  page_views_count: number;
  /** The timestamp when the article was published. */
  published_timestamp: string;
  /** The number of positive reactions to the article. */
  positive_reactions_count: number;
  /** The URL of the cover image for the article. */
  cover_image: string;
  /** An array of tags associated with the article. */
  tag_list: string[];
  /** The canonical URL of the article. */
  canonical_url: string;
  /** The estimated reading time of the article in minutes. */
  reading_time_minutes: number;
  /** The user who authored the article. */
  user: EmbeddedUser;
  /** The organization associated with the article, if any. */
  organization?: EmbeddedOrganization | null;
}

export interface Organization {
  /** The type of the entity, which is 'organization'. */
  type_of: 'organization';
  /** The unique identifier of the organization. */
  id: number;
  /** The name of the organization. */
  name: string;
  /** The username of the organization on Dev.to. */
  username: string;
  /** The Twitter username of the organization. */
  twitter_username: string;
  /** The GitHub username of the organization. */
  github_username: string;
  /** The URL of the organization's Dev.to page. */
  url: string;
  /** The location of the organization. */
  location: string;
  /** The technology stack used by the organization. */
  tech_stack: string;
  /** A brief tagline describing the organization. */
  tag_line: string;
  /** The story or mission of the organization. */
  story: string;
  /** The date and time when the organization joined Dev.to. */
  joined_at: string;
  /** The URL of the organization's profile image. */
  profile_image: string;
}
