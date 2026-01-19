# Scaleway

variable "scaleway_project_id" {
  sensitive = true
  type = string
  default = null
}
variable "scaleway_zone" {
  default = ""
}
variable "scaleway_region" {
  default = ""
}
variable "vm_image_name" {
  type = string
  default = null
}


# Cloudflare


variable "cloudflare_api_token" {
  sensitive = true
  type = string
  default = null
}
variable "cloudflare_zone_id" {
  description = "Zone ID of Cloudflare zone where you will create the FQDNs."
}

variable "garden_domain" {
  type = string
  default = null
}

# App ports

variable "ssh_port" {
  sensitive = true
  type      = string
}

variable "nodes_port_range" {
  sensitive = true
  type      = string
}
