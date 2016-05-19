
# github-org-wide-repo-crawler

This is a script that crawls all repos within a Github organization and checks the `package.json` files for dependencies.

## Background

The [18F front end guild](https://pages.18f.gov/frontend/) was conducting research about the Javascript dependencies being used across the organization and this script helps in the data gathering.

## Usage

0. `git clone git@github.com:jeremiak/github-org-wide-repo-crawler.git repo-crawler`
0. `cd repo-crawler && npm install`
0. `export TOKEN=REPLACE_WITH_YOUR_GITHUB_AUTH_TOKEN`
0. Take a look at `./config.js`. You may want to alter `valuedDeps` as it is the array of dependencies to take note of. You can just `> output.txt` for further analysis.
0. `npm run install`
0. `npm run start`

Use `npm run help` to display this message.
