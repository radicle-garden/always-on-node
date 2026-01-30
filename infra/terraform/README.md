# Infrastructure

This directory contains the Terraform configuration for the Always-on-Node (AON) infrastructure.

## Architecture Diagram

```text
                                     +------------------------------------------+
                                     |            Cloudflare (DNS)              |
                                     |                                          |
                                     |  nodes.domain.tld -> A -> Public IP      |
                                     |  *.nodes.domain.tld -> A -> Public IP    |
                                     +----------------------+-------------------+
                                                            |
                                                            | (Public Internet)
                                                            v
+-----------------------------------------------------------+--------------------------------------------------------+
| Scaleway Cloud                                            |                                                        |
|                                                  +--------+--------+                                               |
|                                                  |    Public IP    |                                               |
|                                                  +--------+--------+                                               |
|                                                           |                                                        |
|                                                           v                                                        |
|  +--------------------------------------------------------+-----------------------------------------------------+  |
|  | Instance: always-on-node (ARM)                         | Security Group                                      |  |
|  |                                                        | - Inbound: 80, 443, non-standard SSH, nodes (public)|  |
|  |  +-------------------------+                           | - Inbound: All from Private NW                      |  |
|  |  | OS (Root Volume 50GB)   |                           +-----------------------------------------------------+  |
|  |  +-------------------------+                                                                                 |  |
|  |  | App & Node Data         | <--- Mounts: /opt/radicle (Block Volume 100GB)                                  |  |
|  |  +-------------------------+                                                                                 |  |
|  |  | Logs                    | <--- Mounts: /var/log    (Block Volume 50GB)                                    |  |
|  |  +-------------------------+                                                                                 |  |
|  |                                                                                                              |  |
|  |                                          (Private Network)                                                   |  |
|  +----------------------+---------------------------------------------------------------------------------------+  |
|                         |                                                                                          |
|                         |                                                                                          |
|                         v                                                                                          |
|  +----------------------+-----------------------+                                                                  |
|  | Managed Database (RDB)                       |                                                                  |
|  | - PostgreSQL 17                              |                                                                  |
|  | - always-on-node app database                |                                                                  |
|  | - Accessible only via Private NW             |                                                                  |
|  +----------------------------------------------+                                                                  |
+--------------------------------------------------------------------------------------------------------------------+
```

## Components

- **Scaleway Instance**: An ARM64 instance running the Always-on-Node application.
- **Block Storage**: 
    - 100GB for Radicle node data and application storage (mounted at `/opt/radicle`).
    - 50GB for system and application logs (mounted at `/var/log`).
- **Managed Database**: PostgreSQL 17 instance, secured within a VPC private network.
- **Networking**:
    - **VPC Private Network**: Used for secure communication between the instance and the database (`radworks-internal`).
    - **Security Group**: Restricts inbound traffic to essential ports (80, 443, a non-standard ssh port, and a port range for connecting to managed radicle nodes).
- **DNS (Cloudflare)**: Manages DNS records for the AON service and its nodes.
- **Terraform Backend**: State is stored remotely in a Scaleway S3 bucket (`garden-terraform-state`).

## Host Key Management

Terraform manages the Scaleway Secret Manager resources (empty shells) for host 
keys, but the actual secret values are populated manually. To generate and 
upload new host keys (can also be used to rotate keys):

1. **Generate an Ed25519 keypair:**
   ```bash
   ssh-keygen -t ed25519 -f aon_host_key -N ""
   ```

2. **Sign the public key with the Host CA:**
   ```bash
   ssh-keygen -s <ca_key> -I "always-on-node" -h \
     -n app.radiclegarden.xyz,app-staging.radiclegarden.xyz,nodes.radiclegarden.xyz,nodes-staging.radiclegarden.xyz \
     aon_host_key.pub
   ```
   This produces `aon_host_key-cert.pub`. `<ca_key>` can also be retrieved from Scaleway Secret Manager. 

3. **Upload to Scaleway Secret Manager:**
   ```bash
   scw secret version create $(scw secret secret list name=aon-host-private-key -o json | jq -r '.[0].id') data="$(base64 < aon_host_key)"
   scw secret version create $(scw secret secret list name=aon-host-public-key -o json | jq -r '.[0].id') data="$(base64 < aon_host_key.pub)"
   scw secret version create $(scw secret secret list name=aon-host-certificate -o json | jq -r '.[0].id') data="$(base64 < aon_host_key-cert.pub)"
   ```

4. **Clean up local files:**
   ```bash
   rm -f aon_host_key aon_host_key.pub aon_host_key-cert.pub
   ```

5. **Deploy:** Run `terraform apply` to pick up the new secret versions in cloud-init.
