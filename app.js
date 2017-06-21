const http = require('http');
const WebhookHandler = require('github-webhook-handler');
const _ = require('lodash');
const JiraApi = require('jira').JiraApi;
const moment = require('moment');

const jiraExtractor = new RegExp('([A-Z][A-Z]{1,3}-\\d\\d{1,4})');
const handler = WebhookHandler({path: '/webhook', secret: 'byhiras-jira-setter'});
const jira = new JiraApi('https', 'jira.byhiras.com', 443, '<USER>', '<PASSWORD>', '2', true, false);

const server = http.createServer(function (req, res) {
    handler(req, res, function (err) {
        res.statusCode = 404;
        res.end('no such location')
    })
}).listen(7777, '0.0.0.0');


handler.on('push', function (event) {
    console.log('Received a push event for %s to %s',
        event.payload.repository.name, event.payload.ref);
});

handler.on('pull_request', function (event) {
    const pullRequest = event.payload.pull_request;
    const title = pullRequest.title;
    const jiraForPR = jiraExtractor.exec(title);
    console.log('received an event relating to pull request: ' + pullRequest.url);
    if (event.payload.action === pullRequest.state && pullRequest.state === 'closed' && pullRequest.merged) {
        //this is an interesting PR event;
        if (jiraForPR && jiraForPR[0]) {
            console.log('jira found - attempting to update fixVersions for issue: ' + jiraForPR[0]);
            setFixVersionIfMissing(jiraForPR[0]);
        }
    }
});

async function getIssue(issueId) {
    return new Promise((resolve, reject) => {
        jira.findIssue(issueId, function (error, issue) {
            if (error) {
                reject(error);
            } else {
                resolve(issue);
            }
        })
    });
}

async function getNextUnreleasedVersionForIssue(issue) {
    "use strict";
    return new Promise((resolve, reject) => {
        jira.getVersions(issue.fields.project.key, function (error, versions) {
            if (error) {
                reject(error);
            } else {
                let versionToReturn = _.sortBy(_.filter(versions, function (version) {
                    return !version.released && _.startsWith(version.name, 'Release') && (moment(version.releaseDate, 'YYYY-MM-DD').diff(moment()) > 0);
                }), function (version) {
                    moment(version.releaseDate, 'YYYY-MM-DD').unix();
                })[0];
                console.info('next version for project: "' + issue.fields.project.key + ' is "' + versionToReturn.name + '"');
                resolve(versionToReturn);
            }
        });
    });
}


async function updateIssue(issue, update) {
    "use strict";
    return new Promise((resolve, reject) => {
        jira.updateIssue(issue.key, update, function (error, result) {
            "use strict";
            error ? reject(error) : resolve(result);
        })
    });
}

async function setFixVersionIfMissing(issueId) {
    "use strict";
    let issueToUpdate;
    try {
        getIssue(issueId).then(function (loadedIssue) {
            issueToUpdate = loadedIssue;
            return getNextUnreleasedVersionForIssue(issueToUpdate)
        }).then(function (versionToSet) {
            if (issueToUpdate.fields.fixVersions && issueToUpdate.fields.fixVersions.length) {
                console.info('Issue: ' + issueId + " already has a version set, bailing out");
                return Promise.resolve('Success');
            } else {
                console.info('Updating issue: ' + issueToUpdate.key + " to version " + versionToSet.name);
                return updateIssue(issueToUpdate, {'fields': {'fixVersions': [versionToSet]}})
            }
        })
    } catch (error) {
        console.error('Failed to update ' + issueId + " due to " + error);
        return Promise.reject(error);
    }
}

(async function() {
    let versionForIssue = await getIssue('BYHI-8455').then(function(loadedIssue){
        "use strict";
        return getNextUnreleasedVersionForIssue(loadedIssue);
    })
}());




