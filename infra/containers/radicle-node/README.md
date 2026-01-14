# Heartwood Container Packaging

This produces and publishes:

- the upstream container image from Heartwood itself, for its binaries:
  `quay.io/radicle_garden/heartwood` and
- a container image for Radicle Node: `quay.io/radicle_garden/radicle-node`.

## Git Submodule: Heartwood

The `heartwood` directory is a git submodule pointing to the upstream
[Radicle Heartwood](https://seed.radicle.xyz/z3gqcJUoA1n9HaHKufZs5FCSGazv5.git)
repository, for which this directory provides container image packaging.

### Why a Git Submodule?

The submodule is used to:

1. **Track the exact version** of the Radicle source code that corresponds to
   the container build.
2. **Extract metadata**: The `Makefile` uses the submodule to retrieve the
   latest commit timestamp (`git log -1 --pretty=%ct`), which can be used for
   versioning or as a build argument.
3. **Ensure reproducibility**: By pinning the submodule to a specific commit, we
   ensure that the build environment can be consistently recreated.

### How to Create/Initialize the Submodule

If you have just cloned the repository, the submodule directory might be empty.
To initialize and clone the submodule, for the first time (if it isn't already
present):

```bash
git submodule add -b master https://seed.radicle.xyz/z3gqcJUoA1n9HaHKufZs5FCSGazv5.git infra/containers/radicle-node/heartwood
```

### How to Update the Submodule

To update the `heartwood` submodule to the latest commit on the tracked branch (
`master` by default):

```bash
make submodule-update
```

To pin the submodule to a specific tag or commit, you can use the below command,
e.g. for the 1.5.0 release:

```bash
make submodule-checkout HEARTWOOD_VERSION=releases/1.5.0
```

And then commit the change:

```bash
git add infra/containers/radicle-node/heartwood
git commit -m "Update heartwood submodule to <tag-or-commit>"
```


