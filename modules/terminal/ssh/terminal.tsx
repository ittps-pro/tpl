"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
// import { TerminalIcon, X, Minimize, Maximize } from "lucide-react"
// import { useRouterStore } from "../store/router-store"
// import { getKeeneticControl } from "../modules/keenetic-control"

// Simulated SSH2 client for Keenetic router
class SSH2Client {
  private host: string
  private username: string
  private password: string
  private port: number
  private connected = false
  private onData: ((data: string) => void) | null = null
  private onError: ((error: Error) => void) | null = null
  private onClose: (() => void) | null = null
  private keeneticControl: ReturnType<typeof getKeeneticControl>

  constructor(options: {
    host: string
    username: string
    password: string
    port?: number
    onData?: (data: string) => void
    onError?: (error: Error) => void
    onClose?: () => void
  }) {
    this.host = options.host
    this.username = options.username
    this.password = options.password
    this.port = options.port || 22
    this.onData = options.onData || null
    this.onError = options.onError || null
    this.onClose = options.onClose || null

    try {
      this.keeneticControl = getKeeneticControl()
    } catch (error) {
      console.error("KeeneticControl not initialized:", error)
    }
  }

  async connect(): Promise<void> {
    try {
      // In a real implementation, this would establish an SSH connection
      // For now, we'll simulate a successful connection
      this.connected = true

      // Send initial welcome message
      if (this.onData) {
        this.onData(`SSH2 connection established to ${this.host}:${this.port}\r\n`)
        this.onData(`Welcome to Keenetic Giga (KN-1010)\r\n`)
        this.onData(`${this.username}@${this.host}:~$ `)
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)))
      }
      throw error
    }
  }

  async execute(command: string): Promise<void> {
    if (!this.connected) {
      throw new Error("Not connected")
    }

    try {
      // In a real implementation, this would send the command over SSH
      // For now, we'll use our KeeneticControl module to simulate command execution
      if (this.onData) {
        this.onData(`${command}\r\n`)
      }

      let output: string

      try {
        if (this.keeneticControl) {
          output = await this.keeneticControl.executeSshCommand(command)
        } else {
          // Fallback to simulated responses if KeeneticControl is not available
          output = this.getSimulatedResponse(command)
        }
      } catch (error) {
        output = `Error: ${error instanceof Error ? error.message : String(error)}`
      }

      if (this.onData) {
        this.onData(`${output}\r\n`)
        this.onData(`${this.username}@${this.host}:~$ `)
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  disconnect(): void {
    if (this.connected) {
      this.connected = false
      if (this.onClose) {
        this.onClose()
      }
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  private getSimulatedResponse(command: string): string {
    // Simulate responses for common commands
    const cmd = command.trim().toLowerCase()

    if (cmd === "help" || cmd === "?") {
      return `
Available commands:
  system        - System commands and information
  interface     - Network interface configuration
  ip            - IP configuration
  dns           - DNS settings
  firewall      - Firewall configuration
  vpn           - VPN settings
  wifi          - Wi-Fi configuration
  usb           - USB device management
  show          - Display system information
  restart       - Restart the router
  save          - Save configuration
  exit          - Exit CLI
`
    }

    if (cmd === "show system" || cmd === "system show") {
      return `
Model: Keenetic Giga (KN-1010)
Firmware: 3.7.5
Hardware: KN-1010
Serial Number: S1234567890
Uptime: 4 days, 21:11:41
CPU Usage: 15%
Memory Usage: 42%
Temperature: 48°C
`
    }

    if (cmd === "show interface" || cmd === "interface show") {
      return `
Interfaces:
WAN: Ethernet, Connected, 300 Mbps
LAN1: Ethernet, Connected, 100 Mbps
LAN2: Ethernet, Not connected
LAN3: Ethernet, Not connected
LAN4: Ethernet, Not connected
SFP: Not connected
`
    }

    if (cmd === "show wifi" || cmd === "wifi show") {
      return `
Wi-Fi networks:
prolograms     - 2.4GHz, Channel 6, WPA2-PSK
prolograms_5g  - 5GHz, Channel 36, WPA2-PSK
`
    }

    if (cmd === "exit" || cmd === "quit" || cmd === "logout") {
      return "Logout"
    }

    return `Command executed: ${command}`
  }
}

interface TerminalLine {
  type: "input" | "output"
  content: string
}

interface SSH2TerminalProps {
  initialHeight?: number
  initialWidth?: number
  resizable?: boolean
  fullscreenEnabled?: boolean
}

export function SSH2Terminal({
  initialHeight = 400,
  initialWidth = 600,
  resizable = true,
  fullscreenEnabled = true,
}: SSH2TerminalProps) {
  const [command, setCommand] = useState("")
  const [history, setHistory] = useState<TerminalLine[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dimensions, setDimensions] = useState({
    width: initialWidth,
    height: initialHeight,
  })

  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sshClientRef = useRef<SSH2Client | null>(null)
  const credentials = useRouterStore((state) => state.credentials)
  const isDemoMode = useRouterStore((state) => state.isDemoMode)

  // Connect to SSH when component mounts
  useEffect(() => {
    connectToSSH()

    return () => {
      // Disconnect when component unmounts
      if (sshClientRef.current?.isConnected()) {
        sshClientRef.current.disconnect()
      }
    }
  }, [])

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [history])

  // Focus input when terminal is clicked
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const connectToSSH = async () => {
    if (isConnected || isConnecting) return

    setIsConnecting(true)

    try {
      const client = new SSH2Client({
        host: credentials.host,
        username: credentials.username,
        password: credentials.password,
        onData: (data) => {
          // Process terminal data
          setHistory((prev) => [...prev, { type: "output", content: data }])
        },
        onError: (error) => {
          setHistory((prev) => [...prev, { type: "output", content: `Error: ${error.message}` }])
        },
        onClose: () => {
          setIsConnected(false)
          setHistory((prev) => [...prev, { type: "output", content: "Connection closed" }])
        },
      })

      await client.connect()
      sshClientRef.current = client
      setIsConnected(true)
    } catch (error) {
      setHistory((prev) => [
        ...prev,
        {
          type: "output",
          content: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!command.trim()) return

    // Add to command history for up/down navigation
    setCommandHistory((prev) => [command, ...prev.slice(0, 19)])
    setHistoryIndex(-1)

    try {
      if (sshClientRef.current?.isConnected()) {
        await sshClientRef.current.execute(command)
      } else {
        setHistory((prev) => [
          ...prev,
          { type: "input", content: command },
          { type: "output", content: "Not connected to SSH. Reconnecting..." },
        ])

        await connectToSSH()

        if (sshClientRef.current?.isConnected()) {
          await sshClientRef.current.execute(command)
        }
      }
    } catch (error) {
      setHistory((prev) => [
        ...prev,
        {
          type: "output",
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ])
    }

    // Clear input
    setCommand("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle up/down arrows for command history
    if (e.key === "ArrowUp") {
      e.preventDefault()

      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
      setHistoryIndex(newIndex)

      if (newIndex >= 0 && commandHistory[newIndex]) {
        setCommand(commandHistory[newIndex])
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()

      const newIndex = Math.max(historyIndex - 1, -1)
      setHistoryIndex(newIndex)

      if (newIndex >= 0 && commandHistory[newIndex]) {
        setCommand(commandHistory[newIndex])
      } else {
        setCommand("")
      }
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleResize = (e: React.MouseEvent, direction: string) => {
    if (!resizable) return

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = dimensions.width
    const startHeight = dimensions.height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()

      if (direction === "se" || direction === "e") {
        const newWidth = startWidth + (moveEvent.clientX - startX)
        setDimensions((prev) => ({ ...prev, width: Math.max(300, newWidth) }))
      }

      if (direction === "se" || direction === "s") {
        const newHeight = startHeight + (moveEvent.clientY - startY)
        setDimensions((prev) => ({ ...prev, height: Math.max(200, newHeight) }))
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      className={`bg-black text-green-500 font-mono text-sm rounded-md flex flex-col overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : "relative"
      }`}
      style={isFullscreen ? {} : { width: dimensions.width, height: dimensions.height }}
    >
      {/* Terminal Header */}
      <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center">
          <TerminalIcon className="w-4 h-4 mr-2" />
          <span className="font-bold">SSH2 Terminal - {credentials.host}</span>
        </div>
        <div className="flex items-center space-x-2">
          {fullscreenEnabled && (
            <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => {
              if (sshClientRef.current?.isConnected()) {
                sshClientRef.current.disconnect()
              }
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      <div ref={terminalRef} className="flex-1 p-4 overflow-auto" onClick={focusInput}>
        {history.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap">
            {line.content}
          </div>
        ))}

        {!isConnected && !isConnecting && (
          <div className="flex items-center justify-center h-full">
            <button onClick={connectToSSH} className="bg-green-800 text-green-300 px-4 py-2 rounded hover:bg-green-700">
              Connect to SSH
            </button>
          </div>
        )}

        {isConnecting && <div className="text-yellow-500">Connecting to {credentials.host}...</div>}
      </div>

      {/* Command Input */}
      {isConnected && (
        <form onSubmit={handleSubmit} className="flex items-center px-4 py-2 border-t border-gray-800">
          <span className="text-blue-400 mr-1">$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-green-300"
            autoFocus
          />
        </form>
      )}

      {/* Resize Handle */}
      {resizable && !isFullscreen && (
        <>
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => handleResize(e, "se")}
          />
          <div
            className="absolute bottom-0 right-4 w-full h-2 cursor-s-resize"
            onMouseDown={(e) => handleResize(e, "s")}
          />
          <div
            className="absolute bottom-4 right-0 w-2 h-full cursor-e-resize"
            onMouseDown={(e) => handleResize(e, "e")}
          />
        </>
      )}
    </div>
  )
}
