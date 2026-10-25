/**
 * Searches GitHub's public API for repositories matching search terms.
 * Returns curated cards for the Market Intelligence tab.
 */
export async function searchGitHubRepos(terms = []) {
  // Clean terms: remove noise prefixes like 'i-need-create-', raw prompt slugs, and short words
  const cleanTerms = (terms || [])
    .map(t => String(t || '').trim().toLowerCase())
    .map(t => t.replace(/^(i-need-create-|i-want-to-|my-idea-is-|build-a-|create-a-)/g, ''))
    .map(t => t.replace(/[^a-z0-9\s-]/g, ' ').trim().replace(/\s+/g, '-'))
    .filter(t => t.length > 2 && !t.includes('blueprint') && !t.includes('starter-template'));

  const searchCandidates = [...new Set(cleanTerms)];
  if (searchCandidates.length === 0) searchCandidates.push('fullstack-starter', 'fastapi-react');

  // Try queries in order of specificity
  for (const query of searchCandidates.slice(0, 3)) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}+stars:>1&sort=stars&order=desc&per_page=6`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        console.warn(`[searchGitHubRepos]: GitHub API query '${query}' status:`, res.status);
        continue;
      }

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items.map(repo => ({
          name: repo.full_name,
          description: repo.description || 'Modern open-source repository in this space.',
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language || 'TypeScript',
          topics: repo.topics || [],
          updatedAt: new Date(repo.updated_at).toLocaleDateString(),
        }));
      }
    } catch (err) {
      console.warn(`[searchGitHubRepos]: Search error for '${query}':`, err.message);
    }
  }

  return [];
}
