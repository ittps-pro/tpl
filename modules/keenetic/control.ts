/**
 * Keenetic Control Module
 *
 * A comprehensive module for interacting with Keenetic routers via their API,
 * providing a clean interface for all router operations.
 */

import type {
  SystemInfo,
  NetworkInterface,
  WifiNetwork,
  ConnectedClient,
  VpnConnection,
  FirewallRule,
  DnsSettings,
  DhcpServer,
  RouterConfiguration,
  UsbDevice,
} from "../types/keenetic-api-types"

export interface KeeneticCredentials {
  host: string
  username: string
  password: string
  port?: number
  secure?: boolean
}

export interface KeeneticControlOptions {
  credentials: KeeneticCredentials
  timeout?: number
  retryCount?: number
  retryDelay?: number
  debug?: boolean
}

export class KeeneticControl {
  private credentials: KeeneticCredentials
  private timeout: number
  private retryCount: number
  private retryDelay: number
  private debug: boolean
  private token: string | null = null
  private tokenExpiry = 0

  constructor(options: KeeneticControlOptions) {
    this.credentials = options.credentials
    this.timeout = options.timeout || 10000
    this.retryCount = options.retryCount || 3
    this.retryDelay = options.retryDelay || 1000
    this.debug = options.debug || false
  }

  /**
   * Get the base URL for API requests
   */
  private getBaseUrl(): string {
    const { host, port, secure } = this.credentials
    const protocol = secure !== false ? "https" : "http"
    const portStr = port ? `:${port}` : ""
    return `${protocol}://${host}${portStr}`
  }

  /**
   * Create authorization header
   */
  private getAuthHeader(): { Authorization: string } {
    const { username, password } = this.credentials
    return {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
    }
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log("[KeeneticControl]", ...args)
    }
  }

  /**
   * Make an API request with retry logic
   */
  private async request<T>(endpoint: string, options: RequestInit = {}, retries = this.retryCount): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`
    const headers = {
      ...this.getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }

    try {
      this.log(`Requesting ${options.method || "GET"} ${url}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      return (await response.json()) as T
    } catch (error) {
      if (retries > 0) {
        this.log(`Request failed, retrying (${retries} retries left)...`, error)
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        return this.request<T>(endpoint, options, retries - 1)
      }

      this.log("Request failed after all retries", error)
      throw error
    }
  }

  /**
   * Test connection to the router
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ status: string }>("/rci/system/status")
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    return this.request<SystemInfo>("/rci/show/system")
  }

  /**
   * Get all network interfaces
   */
  async getInterfaces(): Promise<NetworkInterface[]> {
    return this.request<NetworkInterface[]>("/rci/show/interface")
  }

  /**
   * Get a specific network interface
   */
  async getInterface(name: string): Promise<NetworkInterface> {
    return this.request<NetworkInterface>(`/rci/show/interface/${name}`)
  }

  /**
   * Configure a network interface
   */
  async configureInterface(name: string, config: Partial<NetworkInterface>): Promise<NetworkInterface> {
    return this.request<NetworkInterface>(`/rci/interface/${name}`, {
      method: "PATCH",
      body: JSON.stringify(config),
    })
  }

  /**
   * Get all Wi-Fi networks
   */
  async getWifiNetworks(): Promise<WifiNetwork[]> {
    return this.request<WifiNetwork[]>("/rci/show/interface/wireless")
  }

  /**
   * Configure a Wi-Fi network
   */
  async configureWifiNetwork(ssid: string, config: Partial<WifiNetwork>): Promise<WifiNetwork> {
    return this.request<WifiNetwork>(`/rci/wireless/ssid/${ssid}`, {
      method: "PATCH",
      body: JSON.stringify(config),
    })
  }

  /**
   * Create a new Wi-Fi network
   */
  async createWifiNetwork(config: WifiNetwork): Promise<WifiNetwork> {
    return this.request<WifiNetwork>("/rci/wireless/ssid", {
      method: "POST",
      body: JSON.stringify(config),
    })
  }

  /**
   * Delete a Wi-Fi network
   */
  async deleteWifiNetwork(ssid: string): Promise<void> {
    await this.request<void>(`/rci/wireless/ssid/${ssid}`, {
      method: "DELETE",
    })
  }

  /**
   * Get all connected clients
   */
  async getConnectedClients(): Promise<ConnectedClient[]> {
    return this.request<ConnectedClient[]>("/rci/show/ip/hotspot")
  }

  /**
   * Block a client by MAC address
   */
  async blockClient(mac: string): Promise<void> {
    await this.request<void>(`/rci/ip/hotspot/mac/${mac}/block`, {
      method: "POST",
    })
  }

  /**
   * Unblock a client by MAC address
   */
  async unblockClient(mac: string): Promise<void> {
    await this.request<void>(`/rci/ip/hotspot/mac/${mac}/unblock`, {
      method: "POST",
    })
  }

  /**
   * Get all VPN connections
   */
  async getVpnConnections(): Promise<VpnConnection[]> {
    return this.request<VpnConnection[]>("/rci/show/vpn")
  }

  /**
   * Configure a VPN connection
   */
  async configureVpn(type: string, config: Partial<VpnConnection>): Promise<VpnConnection> {
    return this.request<VpnConnection>(`/rci/vpn/${type}`, {
      method: "PATCH",
      body: JSON.stringify(config),
    })
  }

  /**
   * Get all firewall rules
   */
  async getFirewallRules(): Promise<FirewallRule[]> {
    return this.request<FirewallRule[]>("/rci/show/ip/firewall")
  }

  /**
   * Add a firewall rule
   */
  async addFirewallRule(rule: FirewallRule): Promise<FirewallRule> {
    return this.request<FirewallRule>("/rci/ip/firewall/rule", {
      method: "POST",
      body: JSON.stringify(rule),
    })
  }

  /**
   * Update a firewall rule
   */
  async updateFirewallRule(id: number, rule: Partial<FirewallRule>): Promise<FirewallRule> {
    return this.request<FirewallRule>(`/rci/ip/firewall/rule/${id}`, {
      method: "PATCH",
      body: JSON.stringify(rule),
    })
  }

  /**
   * Delete a firewall rule
   */
  async deleteFirewallRule(id: number): Promise<void> {
    await this.request<void>(`/rci/ip/firewall/rule/${id}`, {
      method: "DELETE",
    })
  }

  /**
   * Get DNS settings
   */
  async getDnsSettings(): Promise<DnsSettings> {
    return this.request<DnsSettings>("/rci/show/ip/dns")
  }

  /**
   * Configure DNS settings
   */
  async configureDns(settings: Partial<DnsSettings>): Promise<DnsSettings> {
    return this.request<DnsSettings>("/rci/ip/dns", {
      method: "PATCH",
      body: JSON.stringify(settings),
    })
  }

  /**
   * Get DHCP server settings
   */
  async getDhcpServers(): Promise<Record<string, DhcpServer>> {
    return this.request<Record<string, DhcpServer>>("/rci/show/ip/dhcp/server")
  }

  /**
   * Configure a DHCP server
   */
  async configureDhcpServer(interface_name: string, config: Partial<DhcpServer>): Promise<DhcpServer> {
    return this.request<DhcpServer>(`/rci/ip/dhcp/server/${interface_name}`, {
      method: "PATCH",
      body: JSON.stringify(config),
    })
  }

  /**
   * Get USB devices
   */
  async getUsbDevices(): Promise<UsbDevice[]> {
    return this.request<UsbDevice[]>("/rci/show/usb")
  }

  /**
   * Execute a CLI command
   */
  async executeCliCommand(command: string): Promise<string> {
    const response = await this.request<{ output: string }>("/rci/cli/execute", {
      method: "POST",
      body: JSON.stringify({ command }),
    })

    return response.output
  }

  /**
   * Execute an SSH command
   */
  async executeSshCommand(command: string): Promise<string> {
    const response = await this.request<{ output: string }>("/rci/ssh/execute", {
      method: "POST",
      body: JSON.stringify({ command }),
    })

    return response.output
  }

  /**
   * Backup router configuration
   */
  async backupConfiguration(): Promise<Blob> {
    const url = `${this.getBaseUrl()}/rci/system/configuration/export`

    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeader(),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.blob()
  }

  /**
   * Restore router configuration
   */
  async restoreConfiguration(configFile: File | Blob): Promise<void> {
    const url = `${this.getBaseUrl()}/rci/system/configuration/import`

    const formData = new FormData()
    formData.append("file", configFile)

    const response = await fetch(url, {
      method: "POST",
      headers: this.getAuthHeader(),
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Update router firmware
   */
  async updateFirmware(firmwareFile: File | Blob): Promise<void> {
    const url = `${this.getBaseUrl()}/rci/system/firmware/update`

    const formData = new FormData()
    formData.append("file", firmwareFile)

    const response = await fetch(url, {
      method: "POST",
      headers: this.getAuthHeader(),
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Reboot the router
   */
  async reboot(): Promise<void> {
    await this.request<void>("/rci/system/reboot", {
      method: "POST",
    })
  }

  /**
   * Get complete router configuration
   */
  async getFullConfiguration(): Promise<RouterConfiguration> {
    const [system, interfaces, wifi, clients, vpn, usb, firewall, dns, dhcp] = await Promise.all([
      this.getSystemInfo(),
      this.getInterfaces(),
      this.getWifiNetworks(),
      this.getConnectedClients(),
      this.getVpnConnections(),
      this.getUsbDevices(),
      this.getFirewallRules(),
      this.getDnsSettings(),
      this.getDhcpServers(),
    ])

    return {
      system,
      interfaces,
      wifi,
      clients,
      vpn,
      usb,
      firewall: {
        enabled: true, // This would come from the actual API
        defaultPolicy: "drop", // This would come from the actual API
        rules: firewall,
      },
      dns,
      dhcp,
    }
  }

  /**
   * Export router configuration as JSON
   */
  async exportAsJson(): Promise<string> {
    const config = await this.getFullConfiguration()
    return JSON.stringify(config, null, 2)
  }

  /**
   * Export router configuration as YAML
   */
  async exportAsYaml(): Promise<string> {
    const config = await this.getFullConfiguration()
    return this.jsonToYaml(config)
  }

  /**
   * Export router configuration as ZUD (Keenetic's proprietary format)
   * Note: This is a simplified implementation as the actual ZUD format is proprietary
   */
  async exportAsZud(): Promise<Blob> {
    // In a real implementation, this would create a proper ZUD file
    // For now, we'll just get the backup which is effectively a ZUD file
    return this.backupConfiguration()
  }

  /**
   * Convert JSON to YAML
   * Simple implementation for demonstration purposes
   */
  private jsonToYaml(json: any, indent = 0): string {
    if (json === null || json === undefined) return "null"

    const spaces = " ".repeat(indent)

    if (typeof json !== "object") {
      if (typeof json === "string") {
        // Quote strings that need it
        if (json.match(/[:#{}[\],&*?|<>=!%@`]/)) {
          return `"${json.replace(/"/g, '\\"')}"`
        }
        return json
      }
      return String(json)
    }

    if (Array.isArray(json)) {
      if (json.length === 0) return "[]"

      return json.map((item) => `${spaces}- ${this.jsonToYaml(item, indent + 2).trimStart()}`).join("\n")
    }

    const keys = Object.keys(json)
    if (keys.length === 0) return "{}"

    return keys
      .map((key) => {
        const value = json[key]
        if (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length > 0) {
          return `${spaces}${key}:\n${this.jsonToYaml(value, indent + 2)}`
        }
        if (Array.isArray(value) && value.length > 0) {
          return `${spaces}${key}:\n${this.jsonToYaml(value, indent + 2)}`
        }
        return `${spaces}${key}: ${this.jsonToYaml(value, indent + 2)}`
      })
      .join("\n")
  }
}

// Create a singleton instance for use throughout the application
let keeneticControlInstance: KeeneticControl | null = null

export function getKeeneticControl(options?: KeeneticControlOptions): KeeneticControl {
  if (!keeneticControlInstance && options) {
    keeneticControlInstance = new KeeneticControl(options)
  } else if (!keeneticControlInstance && !options) {
    throw new Error("KeeneticControl not initialized. Provide options for first call.")
  }

  return keeneticControlInstance!
}

export function initKeeneticControl(options: KeeneticControlOptions): KeeneticControl {
  keeneticControlInstance = new KeeneticControl(options)
  return keeneticControlInstance
}
