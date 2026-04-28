#!/usr/bin/env groovy

folder('radicle-ci') {
}

pipelineJob('radicle-ci/jenkins-example') {
    description('Example pipeline')

    parameters {
        stringParam('repositoryId', '', 'Repository ID ($.repository.id)')
        stringParam('repositoryCloneUrl', '', 'Repository clone URL ($.repository.clone_url)')
        stringParam('repositoryName', '', 'Repository name ($.repository.name)')
        stringParam('repositoryHttpUrl', '', 'Repository HTTP URL ($.repository.http_url)')
        stringParam('nodeId', '', 'Radicle node ID ($.repository.seeder)')
        stringParam('webhookContext', '', 'Webhook context for commit status ($.context)')
        stringParam('commitStatusUrl', '', 'URL where commit status update should be posted back ($.commit_status_url)')
        stringParam('pushAfter', '', 'Commit SHA after push (PushPayload.after)')
        stringParam('pushBranch', '', 'Branch name (PushPayload.branch)')
        stringParam('patchId', '', 'Patch ID (PatchPayload.patch.id)')
        stringParam('patchAfter', '', 'Commit SHA from patch (PatchPayload.patch.after)')
        stringParam('patchTarget', '', 'Target branch of the patch (PatchPayload.patch.target)')
    }

    triggers {
        genericTrigger {
            genericVariables {
                genericVariable {
                    key("repositoryId")
                    value("\$.repository.id")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("repositoryCloneUrl")
                    value("\$.repository.clone_url")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("repositoryName")
                    value("\$.repository.name")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("repositoryHttpUrl")
                    value("\$.repository.http_url")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("nodeId")
                    value("\$.repository.seeder")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("webhookContext")
                    value("\$.context")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("commitStatusUrl")
                    value("\$.commit_status_url")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("pushAfter")
                    value("\$.after")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("pushBranch")
                    value("\$.branch")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("patchId")
                    value("\$.patch.id")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("patchAfter")
                    value("\$.patch.after")
                    expressionType("JSONPath")
                }
                genericVariable {
                    key("patchTarget")
                    value("\$.patch.target")
                    expressionType("JSONPath")
                }
            }
            genericHeaderVariables {
                genericHeaderVariable {
                    key("x-radicle-event-type")
                    regexpFilter("[^A-Za-z]")
                }
            }
            token('radicle-ci-jenkins-example')
            causeString('Triggered on repository $repositoryId (push: $pushAfter, patch: $patchId)')
            printContributedVariables(true)
            printPostContent(true)
            silentResponse(false)
            shouldNotFlatten(false)
        }
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        // For a radicle.garden-seeded repo the clone URL has this shape:
                        //   https://index.radicle.garden/<rid-without-"rad:"-prefix>.git
                        // e.g. rad:z2hCUNw2T1qU31LyGy7VPEiS7BkxW →
                        //   https://index.radicle.garden/z2hCUNw2T1qU31LyGy7VPEiS7BkxW.git
                        url('https://index.radicle.garden/<your-rid>.git')
                    }
                    branches('*/main')
                }
            }
            scriptPath('.jenkins/pipelines/test.jenkinsfile')
            lightweight(false)
        }
    }
}
