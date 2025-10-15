import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'
import { startBridgeServer } from '../lib/server'

// Access global bridge state
declare global {
	var bridgeInstance: any
	var bridgeConfig: any
}

async function execute(context: CommandContext): Promise<void> {
	const { logState } = context

	if (global.bridgeInstance) {
		vscode.window.showInformationMessage('Bridge already running')
		logState('bridge_already_running', {})
		return
	}

	if (!global.bridgeConfig) {
		vscode.window.showErrorMessage('Bridge config not initialized')
		logState('bridge_config_missing', {})
		return
	}

	try {
		global.bridgeInstance = startBridgeServer(global.bridgeConfig)

		context.extensionContext.subscriptions.push({
			dispose: () => {
				if (global.bridgeInstance) {
					global.bridgeInstance.dispose()
				}
			}
		})

		vscode.window.showInformationMessage('ClarityOS Bridge started on port 9485')
		logState('bridge_started', { port: 9485 })
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		vscode.window.showErrorMessage(`Failed to start bridge: ${errorMessage}`)
		logState('bridge_start_error', { error: errorMessage })
	}
}

const command: CommandDefinition = {
	id: 'clarityos.bridge.start',
	execute
}

export default command
