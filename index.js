
const _ = require('underscore');
const request = require('request');

const config = require('./config');
if (!config.token) {
 return console.log('A valid Github token is required. Please use npm run help for instructions.');
}

const req = request.defaults({
  headers: {
    'Authorization': `token ${config.token}`,
    'User-Agent': 'github-org-wide-repo-crawler'
  },
  qs: {
    'per_page': 100
  }
});

function url(path) {
  return `https://api.github.com/${path}`;
}

function getPaginateHeaderData(headerStr) {
  const nextRegExp = new RegExp(/repos\?per_page=100\&page=(\d+)\>\; rel=\"next\"/);
  const lastRegExp = new RegExp(/repos\?per_page=100\&page=(\d+)\>\; rel=\"last\"/);

  const nextMatch = headerStr.match(nextRegExp);
  const lastMatch = headerStr.match(lastRegExp);

  return {
    next: +nextMatch[1] || undefined,
    last: +lastMatch[1] || undefined
  };
}

function fetch(opts) {
  return new Promise((resolve, reject) => {
    req.get(opts, (err, res, body) => {
      if (err) reject(err);
      let status = res.headers.status;
      let statusCode = +status.split(' ')[0];

      if (+res.headers['x-ratelimit-remaining'] === 0) {
        let resetTimestamp = res.headers['x-ratelimit-reset'] * 1000;
        let resetTime =  new Date(resetTimestamp);
        reject(`Github shut us off. Access will be restored at ${resetTime}`);
      }

      resolve({
        headers: res.headers,
        json: JSON.parse(body),
        statusCode: statusCode
      });
    });
  });
}

function fetchOrgReposByPage(org, page) {
  let opts = {
    uri: url(['orgs', org, 'repos'].join('/')),
    qs: {
      page: page
    }
  };

  return fetch(opts);
}

function fetchAllOrgRepos(org) {
  console.log(`Fetching all repos for the ${org} org on Github`)
  return fetchOrgReposByPage(org, 1)
    .then((val) => {
      let repos = [].concat(val.json);
      let pagination = getPaginateHeaderData(val.headers.link);

      let promises = _.range(2, pagination.last + 1).map((p) => {
        return fetchOrgReposByPage(org, p);
      });

      return Promise.all(promises).then((values) => {
        let rs = _.flatten(values.map((v) => v.json));
        return repos.concat(rs);
      });
    })
}

function fetchJsonFileFromRepo(repoOwnerName, repoName, filePath) {
  console.log(`\tFetching ${filePath} for ${repoOwnerName}/${repoName}`);
  const path = ['repos', repoOwnerName, repoName, `contents/${filePath}`].join('/')
  return fetch({ uri: url(path) });
}

function hasValuedDeps(deps) {
  let intersection = _.intersection(config.valuedDeps, deps);
  if (intersection.length === 0) return false;
  return intersection;
}

function jsonifyBase64(bstring) {
  let buf = new Buffer(bstring, 'base64');
  return JSON.parse(buf.toString());
}

fetchAllOrgRepos(config.githubOrg)
.then((repos) => {
  console.log(`\nFound ${repos.length} repos in the ${config.githubOrg} org`);
  return repos.map((r) => {
    return {
      id: r.id,
      name: r.name,
      language: r.language
    }
  });
})
.then((repos) => {
  let packages = _.flatten(config.depFiles.map((file) => {
    return repos.map((r) => {
      return fetchJsonFileFromRepo(config.githubOrg, r.name, file)
      .then((res) => {
        let p = {};
        if (res.statusCode === 404) {
          console.log(`\tDid not find ${file} in ${r.name}`);
          return;
        }
        p[file.split('.')[0]] = jsonifyBase64(res.json.content);
        console.log(`\tFound ${file} in ${r.name}`);
        return Object.assign(r, p);
      });
    });
  }));

  return Promise.all(packages).then((package) => {
    return package.filter((p) => !_.isUndefined(p));
  });
})
.then((reposWithDuplicates) => {
  let ids = [];
  let repos = reposWithDuplicates.filter((r) => {
    if (_.contains(ids, r.id)) return false;
    ids.push(r.id);
    return true;
  });

  return repos;
})
.then((repos) => {
  console.log(`\nFound ${repos.length} repos with listed Javascript dependencies`);
  return repos.map((repo) => {

    let packageDeps = (repo.package) ? repo.package.dependencies : {};
    let packageDevDeps = (repo.package) ? repo.package.devDependencies : {};
    let bowerDeps = (repo.bower) ? repo.bower.dependencies : {};
    let bowerDevDeps = (repo.bower) ? repo.bower.devDependencies : {};
    let allDeps = Object.assign({}, packageDeps, packageDevDeps, bowerDeps, bowerDevDeps);
    let has = hasValuedDeps(Object.keys(allDeps));

    return Object.assign({}, repo, { valuedDeps: has });
  });
})
.then((repos) => {
  return {
    withFrameworks: repos.filter((r) => r.valuedDeps ),
    withoutFrameworks: repos.filter((r) => !r.valuedDeps )
  };
})
.then((sortedRepos) => {
  sortedRepos.withoutFrameworks.forEach((r) => {
    console.log(`\t${r.name} doesn't use a front end framework`);
  });

  console.log('\n');

  sortedRepos.withFrameworks.forEach((r) => {
    console.log(`\t${r.name} uses the following frameworks:`)
    r.valuedDeps.forEach((f) => {
      console.log(`\t* ${f}`);
    });
  });

  return sortedRepos.withFrameworks;
})
.then((reposWithFrameworks) => {
  let sortedByFramework = {};
  config.valuedDeps.forEach((d) => sortedByFramework[d] = []);

  reposWithFrameworks.forEach((r) => {
    r.valuedDeps.forEach((d) => {
      sortedByFramework[d].push(r.name);
    });
  });
  console.log('\nThe usage of each framework across the org')

  for (f in sortedByFramework) {
    let projects = sortedByFramework[f];
    console.log(`\t${f} is used in ${projects.length} projects`);
    if (projects.length > 0) {
      projects.forEach((p) => {
        console.log(`\t\t*${p}`);
      });
    }
  }
})
.catch((err) => {
  console.log('\nError: \t', err);
});
