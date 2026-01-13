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
  }
}

variable "version" {
  type    = string
  default = "1.0.0"
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


build {
  name = "radicle-garden"

  sources = [
    "source.vagrant.ubuntu",
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
    host_vars         = "infra/ansible/host_vars"
    galaxy_file       = "infra/ansible/roles/requirements.yml"
    inventory_file    = "infra/ansible/inventory_local"
    extra_arguments   = ["--limit", "default"]
  }

  provisioner "ansible-local" {
    playbook_files     = ["infra/ansible/plays/10_gardener_setup.yml", "infra/ansible/plays/2_podman.yml"]
    playbook_dir      = "infra/ansible"
    role_paths        = ["infra/ansible/roles"]
    group_vars        = "infra/ansible/group_vars"
    host_vars         = "infra/ansible/host_vars"
    inventory_file    = "infra/ansible/inventory_local"
    extra_arguments   = ["--limit", "default"]
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
