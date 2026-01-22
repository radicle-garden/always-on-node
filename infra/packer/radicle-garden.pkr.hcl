packer {
  required_plugins {
    vagrant = {
      version = "~> 1"
      source  = "github.com/hashicorp/vagrant"
    }
    virtualbox = {
      version = "~> 1"
      source  = "github.com/hashicorp/virtualbox"
    }
    ansible = {
      version = "~> 1"
      source  = "github.com/hashicorp/ansible"
    }
    scaleway = {
      version = "~> 1"
      source  = "github.com/hashicorp/scaleway"
    }
  }
}

variable "version" {
  type    = string
  default = "1.0.0"
}

variable "scaleway_access_key" {
  type      = string
  default   = env("SCW_ACCESS_KEY")
  sensitive = true
}

variable "scaleway_secret_key" {
  type      = string
  default   = env("SCW_SECRET_KEY")
  sensitive = true
}

variable "scaleway_project_id" {
  type      = string
  default   = env("SCW_PROJECT_ID")
  sensitive = true
}

variable "hcp_client_id" {
  type      = string
  default   = env("HCP_CLIENT_ID")
  sensitive = true
}

variable "hcp_client_secret" {
  type      = string
  default   = env("HCP_CLIENT_SECRET")
  sensitive = true
}

source "vagrant" "ubuntu" {
  communicator = "ssh"
  source_path  = "bento/ubuntu-24.04"
  box_version  = "202510.26.0"
  provider     = "virtualbox"

  add_force = true
}

source "scaleway" "ubuntu" {
  access_key      = var.scaleway_access_key
  secret_key      = var.scaleway_secret_key
  project_id      = var.scaleway_project_id
  zone            = "fr-par-2"
  commercial_type = "BASIC2-A4C-8G"
  image           = "ubuntu_noble"
  ssh_username    = "root"
  snapshot_name   = "radicle-garden-{{timestamp}}"
  image_name      = "radicle-garden-${var.version}"
}

build {
  name = "radicle-garden"

  sources = [
    "source.vagrant.ubuntu",
    "source.scaleway.ubuntu"
  ]

  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y ansible"
    ]
  }

  provisioner "ansible-local" {
    playbook_file     = "infra/ansible/plays/0_setup.yml"
    playbook_dir      = "infra/ansible"
    role_paths        = ["infra/ansible/roles"]
    group_vars        = "infra/ansible/group_vars"
    galaxy_file       = "infra/ansible/roles/requirements.yml"
    inventory_file    = source.type == "vagrant" ? "infra/ansible/dev.inventory" : "infra/ansible/prod.inventory"
    extra_arguments   = source.type == "vagrant" ? [] : ["--vault-password-file .vault-password"]

  }

  provisioner "ansible-local" {
    playbook_files     = ["infra/ansible/plays/10_app_setup.yml", "infra/ansible/plays/2_podman.yml"]
    playbook_dir      = "infra/ansible"
    role_paths        = ["infra/ansible/roles"]
    group_vars        = "infra/ansible/group_vars"
    inventory_file    = source.type == "vagrant" ? "infra/ansible/dev.inventory" : "infra/ansible/prod.inventory"
    extra_arguments   = source.type == "vagrant" ? [] : ["--vault-password-file .vault-password"]
  }

  post-processors {

    post-processor "vagrant-registry" {
      only           = ["vagrant.ubuntu"]
      client_id      = var.hcp_client_id
      client_secret  = var.hcp_client_secret
      box_tag        = "radicle_garden/gardener"
      version        = var.version
      architecture = "arm64"
    }
  }
}
