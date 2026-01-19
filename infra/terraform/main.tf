terraform {
  backend "s3" {
    bucket                      = "garden-terraform-state"
    key                         = "always-on-node/terraform.tfstate"
    region                      = "fr-par"
    endpoint                    = "https://s3.fr-par.scw.cloud"
    skip_credentials_validation = true
    skip_region_validation      = true
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
    scaleway = {
      source = "scaleway/scaleway"
      version = "~> 2.66"
    }
  }
}

provider "scaleway" {}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

