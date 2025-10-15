import * as vscode from 'vscode'
import { startBridgeServer } from './lib/server'
import { createWebviewManager } from './lib/webview'
import { createConfigRegistry } from './lib/config'
import type { CommandDefinition, CommandContext } from './types'
import bridgeStartCmd from './commands/bridge.start'
import bridgeStopCmd from './commands/bridge.stop'

// Global output channel
let outputChannel: vscode.OutputChannel | undefined
let workspaceRootCache: string | undefined

// Terminal start times tracking
const terminalStartTimes = new Map<vscode.Terminal, number>()

// Bridge state (use global for command access)
declare global {
	var bridgeInstance: any
	var bridgeConfig: any
}
global.bridgeInstance = undefined
global.bridgeConfig = undefined

function getOutputChannel(): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('ClarityOS Bridge')
	}
	return outputChannel
}

function logState(type: string, context: any): void {
	const timestamp = new Date().toISOString()
	const log = `[${timestamp}] ${type}: ${JSON.stringify(context)}`
	getOutputChannel().appendLine(log)
}

export function activate(context: vscode.ExtensionContext) {
	workspaceRootCache = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''

	logState('extension_activated', {
		workspace: workspaceRootCache,
		extensionPath: context.extensionPath
	})

	// Track terminals
	vscode.window.onDidOpenTerminal(terminal => {
		terminalStartTimes.set(terminal, Date.now())
	})

	vscode.window.onDidCloseTerminal(terminal => {
		terminalStartTimes.delete(terminal)
	})

	// Initialize webview manager
	const webviewManager = createWebviewManager({ workspaceRoot: workspaceRootCache })

	// Initialize config registry
	const bridgeStartTime = Date.now()
	const configRegistry = createConfigRegistry({
		vscode,
		context,
		workspaceRoot: workspaceRootCache,
		bridgeStartTime
	})

	// Store bridge config for manual start
	global.bridgeConfig = {
		vscode,
		context,
		terminalStartTimes,
		webviewManager,
		configHandlers: {
			register: configRegistry.register,
			unregister: configRegistry.unregister,
			list: configRegistry.list
		},
		outputChannel: vscode.window.createOutputChannel('ClarityOS Bridge Server')
	}

	// Event broadcaster: Terminal changes → webhooks
	vscode.window.onDidChangeActiveTerminal(async terminal => {
		if (!terminal || !global.bridgeInstance) return

		const processId = await terminal.processId
		global.bridgeInstance.broadcast({
			event: 'terminal-changed',
			timestamp: Date.now(),
			data: {
				name: terminal.name,
				processId: processId
			}
		})
	})

	// Status bar
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
	statusBar.text = '$(plug) ClarityOS Bridge'

	function updateStatusBar() {
		if (!global.bridgeInstance) {
			statusBar.tooltip = 'ClarityOS Bridge (stopped)\nRun: clarityos.bridge.start'
			return
		}

		const uptimeSeconds = Math.floor((Date.now() - global.bridgeInstance.startTime) / 1000)
		const hours = Math.floor(uptimeSeconds / 3600)
		const minutes = Math.floor((uptimeSeconds % 3600) / 60)
		const uptimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

		statusBar.tooltip = `ClarityOS Bridge\nPort: 9485\nUptime: ${uptimeFormatted}`
	}

	updateStatusBar()
	const interval = setInterval(updateStatusBar, 30000)
	context.subscriptions.push({ dispose: () => clearInterval(interval) })

	statusBar.show()
	context.subscriptions.push(statusBar)

	// Command context
	const commandContext: CommandContext = {
		extensionContext: context,
		workspaceRoot: workspaceRootCache || '',
		logState
	}

	// Register bridge control commands
	const builtinCommands: CommandDefinition[] = [
		bridgeStartCmd,
		bridgeStopCmd
	]

	for (const cmd of builtinCommands) {
		const disposable = vscode.commands.registerCommand(cmd.id, () => cmd.execute(commandContext))
		context.subscriptions.push(disposable)
	}

	getOutputChannel().appendLine('✓ ClarityOS Bridge activated')
	logState('extension_ready', { mode: 'manual_start', port: 9485 })

	console.log('ClarityOS Bridge activated')
}

export async function deactivate() {
	if (global.bridgeInstance) {
		global.bridgeInstance.dispose()
	}
	console.log('ClarityOS Bridge deactivating...')
}
