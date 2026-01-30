
###########################  always-on-node  ########################################################

data "scaleway_secret" "host_signing_ca" {
  name = "Garden_Host_CA_Key"
}

data "scaleway_secret_version" "host_signing_ca" {
  secret_id = data.scaleway_secret.host_signing_ca.id
  revision  = "latest"
}

resource "scaleway_secret" "aon_host_private_key" {
  name        = "aon-host-private-key"
  description = "SSH host private key for Always-On Node"
  path        = "/terraform/aon-host-private-key"
  tags        = ["radiclegarden", "always-on-node"]
}

resource "scaleway_secret" "aon_host_public_key" {
  name        = "aon-host-public-key"
  description = "SSH host public key for Always-On Node"
  path        = "/terraform/aon-host-public-key"
  tags        = ["radiclegarden", "always-on-node"]
}

resource "scaleway_secret" "aon_host_cert" {
  name        = "aon-host-certificate"
  description = "SSH host certificate for Always-On Node"
  path        = "/terraform/aon-host-certificate"
}

data "scaleway_secret_version" "aon_host_private_key" {
  secret_id = scaleway_secret.aon_host_private_key.id
  revision  = "latest"
}

data "scaleway_secret_version" "aon_host_public_key" {
  secret_id = scaleway_secret.aon_host_public_key.id
  revision  = "latest"
}

data "scaleway_secret_version" "aon_host_cert" {
  secret_id = scaleway_secret.aon_host_cert.id
  revision  = "latest"
}
