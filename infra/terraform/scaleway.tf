# Existing private network
data "scaleway_vpc_private_network" "aon_private_network" {
  name = "radworks-internal"
}

data "scaleway_secret" "user_cert" {
  name = "Garden_User_CA_Key.pub"
}

data "scaleway_secret_version" "user_cert" {
  secret_id = data.scaleway_secret.user_cert.id
  revision  = "latest"
}

resource "scaleway_instance_ip" "aon_public_ip" {
  project_id = var.scaleway_project_id
  zone = var.scaleway_zone
  tags = ["radiclegarden", "always-on-node"]
}

resource "scaleway_instance_security_group" "aon_security_group" {
  project_id              = var.scaleway_project_id
  inbound_default_policy  = "drop"
  outbound_default_policy = "accept"
  zone = var.scaleway_zone

  inbound_rule {
    action   = "accept"
    port     = "22"
    ip_range = "0.0.0.0/0"
  }

  inbound_rule {
    action   = "accept"
    port     = var.ssh_port
    ip_range = "0.0.0.0/0"
  }

  inbound_rule {
    action   = "accept"
    ip_range = data.scaleway_vpc_private_network.aon_private_network.ipv4_subnet[0].subnet
  }

  inbound_rule {
    action = "accept"
    port   = "80"
  }

  inbound_rule {
    action = "accept"
    port   = "443"
  }

  inbound_rule {
    action     = "accept"
    port_range = var.nodes_port_range
    ip_range   = "0.0.0.0/0"
  }

  tags = ["radiclegarden", "always-on-node"]

}

resource "scaleway_block_volume" "aon_nodes_data" {
  name = "aon_nodes_data"
  tags = ["radiclegarden", "always-on-node", "data"]
  size_in_gb = 100
  iops       = 5000
  zone = var.scaleway_zone
}

resource "scaleway_block_volume" "aon_logs" {
  name = "node_logs"
  tags = ["radiclegarden", "always-on-node", "logs"]
  size_in_gb = 50
  iops       = 5000
  zone = var.scaleway_zone
}


data "scaleway_instance_image" "packer_vm" {
  name = "radicle-garden-2026.01.15-6e3fe49"
  architecture = "arm64"
  zone = var.scaleway_zone
}


resource "scaleway_instance_server" "aon" {

  project_id = var.scaleway_project_id
  name       = "always-on-node"
  type       = "BASIC2-A4C-8G"
  image      = data.scaleway_instance_image.packer_vm.image_id
  zone       = var.scaleway_zone

  tags = ["radiclegarden", "always-on-node"]

  ip_id = scaleway_instance_ip.aon_public_ip.id

  root_volume {
    volume_type = "sbs_volume"
    sbs_iops = 5000
    size_in_gb = 50
  }

  additional_volume_ids = [
    scaleway_block_volume.aon_logs.id,
    scaleway_block_volume.aon_nodes_data.id,
  ]

  security_group_id = scaleway_instance_security_group.aon_security_group.id
  protected = false

  private_network {
    pn_id = data.scaleway_vpc_private_network.aon_private_network.private_network_id
  }

  user_data = {
    cloud-init = <<EOT
    #cloud-config
    # allow_public_ssh_keys: true
    ssh_deletekeys: true
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICOPSO6Z78oTpA9ofRx2akV238+nA8OxxGweyzjq3sDM
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBq1N4INNjwLE5bwMrh+BMsHJEKBYIyojgQFpUu7tb9K Kuehle
    # ssh_genkeytypes: [rsa, ecdsa, ed25519]
    ssh_keys:
      ed25519_private: |
        ${indent(8, chomp(tls_private_key.aon_host_key.private_key_openssh))}
      ed25519_public: |
        ${chomp(tls_private_key.aon_host_key.public_key_openssh)}
      ed25519_certificate: |
        ${chomp(data.local_file.aon_host_cert.content)}
    ssh_publish_hostkeys:
      blacklist: [rsa]
      enabled: true
    #ssh:
    #  emit_keys_to_console: false
    bootcmd:
      - set -ex
      - cloud-init-per once ssh-users-ca echo "TrustedUserCAKeys /etc/ssh/users_ca.pub" >> /etc/ssh/sshd_config
      - cloud-init-per once ssh-host-cert echo "HostCertificate /etc/ssh/ssh_host_ed25519_key-cert.pub" >> /etc/ssh/sshd_config
    runcmd:

      - |
        # 1. Identify devices dynamically
        logs_vol=$(lsblk --fs --json | jq -r '[.blockdevices[] | select(.children == null and .fstype == null) | .name][0]')
        nodes_vol=$(lsblk --fs --json | jq -r '[.blockdevices[] | select(.children == null and .fstype == null) | .name][1]')

        # 2. LOGS SETUP
        # Check if the logical volume already exists
        if [ ! -e /dev/logs/log ]; then
          # If not, initialize LVM and Format
        pvcreate /dev/$logs_vol
          vgcreate logs /dev/$logs_vol
          lvcreate --name log --size 45g logs
          mkfs -t ext4 /dev/logs/log
        else
          # If it exists, ensure the Volume Group is active
          vgchange -ay logs
        fi

        # 3. MOUNT /VAR/LOG SAFELY
        # Always sync logs to ensure existing boot logs (until time runcmd has run) aren't hidden
        mkdir -p /mnt/tmp_log
        mount /dev/logs/log /mnt/tmp_log
        rsync -aX /var/log/ /mnt/tmp_log/
        umount /mnt/tmp_log

        # Mount permanently
        mount /dev/logs/log /var/log
        echo '/dev/logs/log /var/log ext4 defaults 0 2' >> /etc/fstab

        # Fix permissions and restart logger
        chown root:syslog /var/log
        chmod 775 /var/log
        systemctl restart rsyslog

        # 4. DATA SETUP
        if [ ! -e /dev/node_storage/nodedata ]; then
        pvcreate /dev/$nodes_vol
        vgcreate node_storage /dev/$nodes_vol
          lvcreate --name nodedata --size 93g node_storage
          mkfs -t ext4 /dev/node_storage/nodedata
        else
           vgchange -ay node_storage
        fi

        mkdir -p /opt/radicle
        mount /dev/node_storage/nodedata /opt/radicle
        echo '/dev/node_storage/nodedata /opt/radicle ext4 defaults 0 2' >> /etc/fstab
        chown -R radicle:radicle /opt/radicle

    write_files:
      - path: /etc/ssh/users_ca.pub
        content: |
          ${indent(8, chomp(base64decode(data.scaleway_secret_version.user_cert.data)))}
      - path: /etc/ssh/ssh_host_ed25519_key-cert.pub
        permissions: '0644'
        owner: root:root
        content: |
          ${indent(10, chomp(data.local_file.aon_host_cert.content))}
      - path: /etc/environment
        content: |
          DATABASE_URL="postgres://${base64decode(data.scaleway_secret_version.pg_user.data)}:${base64decode(data.scaleway_secret_version.pg_pass.data)}@${scaleway_rdb_instance.main.private_ip[0].address}:5432/${scaleway_rdb_database.main.name}"
        append: true

    EOT
  }
}





######################### DB

data "scaleway_secret" "pg_user" {
  name = "PG_USER"
}
data "scaleway_secret_version" "pg_user" {
  secret_id = data.scaleway_secret.pg_user.id
  revision  = "latest"
}
data "scaleway_secret" "pg_pass" {
  name = "PG_PASS"
}
data "scaleway_secret_version" "pg_pass" {
  secret_id = data.scaleway_secret.pg_pass.id
  revision  = "latest"
}

resource "scaleway_rdb_instance" "main" {
  name           = "garden-db-server"
  node_type      = "DB-DEV-S"
  engine         = "PostgreSQL-17"
  is_ha_cluster  = false
  disable_backup = false
  user_name      = base64decode(data.scaleway_secret_version.pg_user.data)
  password       = base64decode(data.scaleway_secret_version.pg_pass.data)

  private_network {
    pn_id = data.scaleway_vpc_private_network.aon_private_network.private_network_id
    enable_ipam = true
  }

}

resource "scaleway_rdb_acl" "main" {
  instance_id = scaleway_rdb_instance.main.id
  acl_rules {
    ip          = data.scaleway_vpc_private_network.aon_private_network.ipv4_subnet[0].subnet
    description = "internal network"
  }
}


resource "scaleway_rdb_database" "main" {
  instance_id = scaleway_rdb_instance.main.id
  name        = "always-on-node"
}

resource "scaleway_rdb_privilege" "main" {
  instance_id   = scaleway_rdb_instance.main.id
  user_name     = base64decode(data.scaleway_secret_version.pg_user.data)
  database_name = scaleway_rdb_database.main.name
  permission    = "all"
}