export interface TrimetClientOptions {
  /** TriMet service root, including the trailing slash. */
  baseUrl: string;
  appId: string;
  useFixtures?: boolean;
}
