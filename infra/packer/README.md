# VM images

This directory contains Packer configuration to build VM images for Radicle Garden.

## Prerequisites

- [Packer](https://www.packer.io/downloads) (>= 1.14.3)
- Plugins (installed automatically via `packer init`):
  - Vagrant
  - VirtualBox
  - Ansible

## Variables

The following variables can be set via environment variables or the `-var` command-line flag:

| Variable | Description | Default / Env Var |
| --- | --- | --- |
| `version` | Version of the image | `1.0.0` |
| `hcp_client_id` | HashiCorp Cloud Platform Client ID | `HCP_CLIENT_ID` |
| `hcp_client_secret` | HashiCorp Cloud Platform Client Secret | `HCP_CLIENT_SECRET` |

## Usage

### 1. Initialize Packer

First, initialize the required plugins:

```bash
packer init radicle-garden.pkr.hcl
```

### 2. Build Images

To build all sources (Vagrant and Scaleway):

```bash
packer build radicle-garden.pkr.hcl
```

To build only a specific source, use the `-only` flag:

#### Build / Upload Vagrant box (for dev env)

This will: 
- spin up a virtualbox VM, with vagrant, 
- run the configured provisioners, 
- package into a vagrant box, 
- upload to Vagrant Registry (Docker Hub equivalent).

> Note: Replace `1.0.0` with the desired version.

```bash
HCL_CLIENT_ID=some HCL_CLIENT_SECRET=secret packer build -var "version=1.0.0" -only=source.vagrant.ubuntu radicle-garden.pkr.hcl
```

