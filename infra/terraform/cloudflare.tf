
resource "cloudflare_dns_record" "aon_record" {
  provider = cloudflare
  zone_id = var.cloudflare_zone_id
  comment = "always-on-node"
  content = scaleway_instance_ip.aon_public_ip.address
  name = "aon.${var.garden_domain}"
  proxied = false
  ttl = 3600
  type = "A"
}
resource "cloudflare_dns_record" "nodes_record" {
  provider = cloudflare
  zone_id = var.cloudflare_zone_id
  comment = "always-on-node"
  content = scaleway_instance_ip.aon_public_ip.address
  name = "nodes.${var.garden_domain}"
  proxied = false
  ttl = 3600
  type = "A"
}
resource "cloudflare_dns_record" "wildcard_record" {
  provider = cloudflare
  zone_id = var.cloudflare_zone_id
  comment = "always-on-node"
  content = scaleway_instance_ip.aon_public_ip.address
  name = "*.nodes.${var.garden_domain}"
  proxied = false
  ttl = 3600
  type = "A"
}
