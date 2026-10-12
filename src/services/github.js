/**
 * Searches GitHub's public API for repositories matching search terms.
 * Returns curated cards for the Market Intelligence tab.
 */
export async function searchGitHubRepos(terms) {
  const query = terms.slice(0, 3).join('+');
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=6`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!res.ok) {
      console.warn('GitHub API rate limited or error:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.items || []).map(repo => ({
      name: repo.full_name,
      description: repo.description || 'No description provided.',
      url: repo.html_url,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      topics: repo.topics || [],
      updatedAt: new Date(repo.updated_at).toLocaleDateString(),
    }));
  } catch (err) {
    console.error('GitHub search failed:', err);
    return [];
  }
}
