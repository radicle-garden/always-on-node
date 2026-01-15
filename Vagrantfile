# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # The most common configuration options are documented and commented below.
  # For a complete reference, please see the online documentation at
  # https://docs.vagrantup.com.

  config.vm.box = "radicle_garden/gardener"
  config.vm.box_version = "0.2.0"

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  # NOTE: This will enable public access to the opened port
  # config.vm.network "forwarded_port", guest: 80, host: 8080

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine and only allow access
  # via 127.0.0.1 to disable public access
  config.vm.network "forwarded_port", guest: 80, host: 3080, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 8776, host: 38776, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 5173, host: 5173, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 5432, host: 55432, host_ip: "127.0.0.1"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network "private_network", ip: "192.168.33.10"

  # Create a public network, which generally matched to bridged network.
  # Bridged networks make the machine appear as another physical device on
  # your network.
  # config.vm.network "public_network"

  # Share an additional folder to the guest VM. The first argument is
  # the path on the host to the actual folder. The second argument is
  # the path on the guest to mount the folder. And the optional third
  # argument is a set of non-required options.
  # config.vm.synced_folder ".", "/home/local/gardener", owner: "local", group: "local"

  # Sync the project folder, but we'll handle node_modules separately
  # to ensure correct architecture (Linux) dependencies
  config.vm.synced_folder ".", "/vagrant", mount_options: ["dmode=775,fmode=664"]

  # Create a VM-local node_modules and bind mount it into /vagrant
  # This ensures native dependencies are built for Linux, not macOS
  config.vm.provision "shell", privileged: true, run: "always", inline: <<-SHELL
    # Create VM-local node_modules directory
    mkdir -p /home/vagrant/node_modules_cache/garden-ui
    chown vagrant:vagrant /home/vagrant/node_modules_cache/garden-ui

    # Create mount point in /vagrant (needs to be a real directory for bind mount)
    mkdir -p /vagrant/node_modules

    # Bind mount the VM-local directory over /vagrant/node_modules
    if ! mountpoint -q /vagrant/node_modules; then
      mount --bind /home/vagrant/node_modules_cache/garden-ui /vagrant/node_modules
      echo "node_modules bind-mounted from /home/vagrant/node_modules_cache/garden-ui"
    else
      echo "node_modules already mounted"
    fi
  SHELL

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  # Example for VirtualBox:
  #
  config.vm.provider "virtualbox" do |vb|
  #   # Display the VirtualBox GUI when booting the machine
  #    vb.gui = true
  #
  #   # Customize the amount of memory on the VM:
    vb.memory = "8192"
    vb.cpus = 6
  end

  # Post-up message
  config.vm.post_up_message = <<-MSG
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                         Radicle Gardener Dev Environment                     ║
    ║                                                                              ║
    ║  VM IP Address: 192.168.33.10                                                ║
    ║                                                                              ║
    ║  To connect to the VM:                                                       ║
    ║    vagrant ssh                                                               ║
    ║                                                                              ║
    ║  To start the development server:                                            ║
    ║    cd /vagrant                                                               ║
    ║    pnpm install                                                              ║
    ║    pnpm dev                                                                  ║
    ║                                                                              ║
    ║                                                                              ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
  MSG
end
