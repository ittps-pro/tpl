// Type definitions for Keenetic router API

// System information
export interface SystemInfo {
  name: string
  version: string
  hardware: string
  serialNumber: string
  uptime: string
  cpuUsage: number
  memoryUsage: number
  temperature: number
}

// Network interface
export interface NetworkInterface {
  name: string
  type: "ethernet" | "wifi" | "bridge" | "ppp" | "usb" | "sfp"
  status: "up" | "down"
  enabled: boolean
  address?: string
  mask?: string
  gateway?: string
  mac?: string
  mtu?: number
  speed?: number
  duplex?: "full" | "half"
  statistics: {
    rxBytes: number
    txBytes: number
    rxPackets: number
    txPackets: number
    rxErrors: number
    txErrors: number
  }
}

// Wi-Fi network
export interface WifiNetwork {
  ssid: string
  enabled: boolean
  band: "2.4GHz" | "5GHz"
  channel: number
  bandwidth: number
  security: "none" | "wep" | "wpa" | "wpa2" | "wpa3"
  password?: string
  hidden: boolean
  clients: number
  maxClients: number
  statistics: {
    rxBytes: number
    txBytes: number
    rxPackets: number
    txPackets: number
  }
}

// Connected client
export interface ConnectedClient {
  mac: string
  ip: string
  hostname?: string
  interface: string
  connected: string // ISO date
  signal?: number // dBm, for Wi-Fi clients
  txRate?: number // Mbps, for Wi-Fi clients
  rxRate?: number // Mbps, for Wi-Fi clients
  authorized: boolean
  blocked: boolean
  statistics: {
    rxBytes: number
    txBytes: number
    rxPackets: number
    txPackets: number
  }
}

// VPN connection
export interface VpnConnection {
  type: "sstp" | "l2tp" | "pptp" | "openvpn" | "ikev1" | "ikev2"
  enabled: boolean
  status: "connected" | "disconnected" | "connecting" | "error"
  server?: string
  username?: string
  localIp?: string
  remoteIp?: string
  connected?: string // ISO date
  statistics?: {
    rxBytes: number
    txBytes: number
    uptime: number // seconds
  }
}

// USB device
export interface UsbDevice {
  id: string
  type: "storage" | "printer" | "modem" | "other"
  manufacturer: string
  product: string
  serialNumber?: string
  mountPoint?: string // for storage devices
  filesystem?: string // for storage devices
  size?: number // bytes, for storage devices
  used?: number // bytes, for storage devices
}

// Firewall rule
export interface FirewallRule {
  id: number
  enabled: boolean
  name: string
  action: "accept" | "drop" | "reject"
  protocol?: "tcp" | "udp" | "icmp" | "any"
  srcAddress?: string
  srcPort?: string
  dstAddress?: string
  dstPort?: string
  schedule?: string
  description?: string
}

// DNS settings
export interface DnsSettings {
  servers: string[]
  static: Record<string, string> // hostname -> IP mapping
  rebind: boolean
  intercept: boolean
  filter: {
    enabled: boolean
    type: "base" | "standard" | "extended"
    customRules: {
      allow: string[]
      block: string[]
    }
  }
}

// DHCP server
export interface DhcpServer {
  enabled: boolean
  range: {
    start: string
    end: string
  }
  leaseTime: number // seconds
  gateway: string
  dnsServers: string[]
  static: {
    mac: string
    ip: string
    hostname?: string
  }[]
}

// Router configuration
export interface RouterConfiguration {
  system: SystemInfo
  interfaces: NetworkInterface[]
  wifi: WifiNetwork[]
  clients: ConnectedClient[]
  vpn: VpnConnection[]
  usb: UsbDevice[]
  firewall: {
    enabled: boolean
    defaultPolicy: "accept" | "drop"
    rules: FirewallRule[]
  }
  dns: DnsSettings
  dhcp: Record<string, DhcpServer> // interface name -> DHCP server
}
