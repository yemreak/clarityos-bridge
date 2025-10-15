import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'

// Access global bridge state
declare global {
	var bridgeInstance: any
}

async function execute(context: CommandContext): Promise<void> {
	const { logState } = context

	if (!global.bridgeInstance) {
		vscode.window.showInformationMessage('Bridge not running')
		logState('bridge_not_running', {})
		return
	}

	try {
		global.bridgeInstance.dispose()
		global.bridgeInstance = undefined

		vscode.window.showInformationMessage('ClarityOS Bridge stopped')
		logState('bridge_stopped', {})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		vscode.window.showErrorMessage(`Failed to stop bridge: ${errorMessage}`)
		logState('bridge_stop_error', { error: errorMessage })
	}
}

const command: CommandDefinition = {
	id: 'clarityos.bridge.stop',
	execute
}

export default command
