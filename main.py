import os
import requests
from dotenv import load_dotenv

# Load token
load_dotenv()
TOKEN = os.getenv("GITHUB_TOKEN")
if not TOKEN:
    raise ValueError("❌ GitHub token not found. Please set GITHUB_TOKEN in .env")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}
BASE_URL = "https://api.github.com"


class GitHubClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _request(self, method, endpoint, **kwargs):
        url = f"{BASE_URL}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        if response.status_code >= 400:
            raise Exception(f"❌ API error {response.status_code}: {response.text}")
        return response.json()

    # --- User ---
    def get_authenticated_user(self):
        return self._request("GET", "/user")

    # --- Repos ---
    def get_repo(self, owner: str, repo: str):
        """Fetch details of a specific repo."""
        return self._request("GET", f"/repos/{owner}/{repo}")

    def list_branches(self, owner: str, repo: str):
        """List all branches of a repository."""
        return self._request("GET", f"/repos/{owner}/{repo}/branches")

    def list_files(self, owner: str, repo: str, branch: str = "main", path: str = ""):
        """
        List files in a repo branch (path optional).
        - branch: branch name (default = main)
        - path: directory path (default = root)
        """
        return self._request(
            "GET",
            f"/repos/{owner}/{repo}/contents/{path}?ref={branch}"
        )


# ---- Example Usage ----
if __name__ == "__main__":
    client = GitHubClient()

    me = client.get_authenticated_user()
    print(f"👤 Authenticated as: {me['login']}")

    repo_name = "main"   # change to your repo
    repo = client.get_repo(me["login"], repo_name)
    print(f"📂 Repo: {repo['full_name']} (Private: {repo['private']})")

    branches = client.list_branches(me["login"], repo_name)
    print("🌿 Branches:")
    for b in branches:
        print("   -", b["name"])

    files = client.list_files(me["login"], repo_name, branch="main")
    print("📑 Files in main branch:")
    for f in files:
        print("   -", f["path"], f["type"])
