
###########################  always-on-node  ########################################################

data "scaleway_secret" "host_signing_ca" {
  name = "Garden_Host_CA_Key"
}

data "scaleway_secret_version" "host_signing_ca" {
  secret_id = data.scaleway_secret.host_signing_ca.id
  revision  = "latest"
}

resource "local_sensitive_file" "host_signing_ca_temp" {
  filename        = "/tmp/host_ca_key"
  file_permission = "600"
  content         = base64decode(data.scaleway_secret_version.host_signing_ca.data)
}


resource "tls_private_key" "aon_host_key" {
  algorithm = "ED25519"
}

# Store private key in Scaleway Secret Manager
resource "scaleway_secret" "aon_host_private_key" {
  name        = "aon-host-private-key"
  description = "SSH host private key for Always-On Node"
  path = "/terraform/aon-host-private-key"
  tags = ["radiclegarden", "always-on-node"]
}

resource "scaleway_secret_version" "aon_host_private_key" {
  secret_id = scaleway_secret.aon_host_private_key.id
  data      = tls_private_key.aon_host_key.private_key_openssh
}

# Store public key in Scaleway Secret Manager
resource "scaleway_secret" "aon_host_public_key" {
  name        = "aon-host-public-key"
  description = "SSH host public key for Always-On Node"
  path = "/terraform/aon-host-public-key"
  tags = ["radiclegarden", "always-on-node"]
}

resource "scaleway_secret_version" "aon_host_public_key" {
  secret_id = scaleway_secret.aon_host_public_key.id
  data      = tls_private_key.aon_host_key.public_key_openssh
}

# Temporary local file for certificate signing (will be cleaned up)
resource "local_file" "aon_host_public_key_temp" {
  filename        = "/tmp/aon_host_key.pub"
  file_permission = "600"
  content         = tls_private_key.aon_host_key.public_key_openssh
}

resource "null_resource" "aon_generate_ssh_cert" {
  depends_on = [
    local_file.aon_host_public_key_temp,
    local_sensitive_file.host_signing_ca_temp
  ]
  provisioner "local-exec" {
    command = <<EOT
      ssh-keygen \
        -s ${local_sensitive_file.host_signing_ca_temp.filename} \
        -I "nodes.${var.garden_domain}" \
        -h \
        -n app.${var.garden_domain},nodes.${var.garden_domain},aon.${var.garden_domain} \
        ${local_file.aon_host_public_key_temp.filename}
    EOT
  }
}

data "local_file" "aon_host_cert" {
  depends_on = [null_resource.aon_generate_ssh_cert]
  filename   = "/tmp/aon_host_key-cert.pub"
}

# Store certificate in Scaleway Secret Manager
resource "scaleway_secret" "aon_host_cert" {
  name        = "aon-host-certificate"
  description = "SSH host certificate for Always-On Node"
  path        = "/terraform/aon-host-certificate"
}

resource "scaleway_secret_version" "aon_host_cert" {
  secret_id = scaleway_secret.aon_host_cert.id
  data      = data.local_file.aon_host_cert.content
}
