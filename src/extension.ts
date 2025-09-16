import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './helpers/logger';
import { uploadMSAppFile, readData, getNamingStandards, saveNameStandardsData, downloadControlNameFile, uploadControlNameFile, resetNameStandards } from './helpers/storage';
import { FileStore } from './helpers/filestore';
import { processFiles } from './helpers/fileprocess';

let currentPanel: vscode.WebviewPanel | undefined;
const filestore = new FileStore();


export function activate(context: vscode.ExtensionContext) {

	// Register the main command for the extension
	context.subscriptions.push(
		vscode.commands.registerCommand('powercodevalidator.validatecode', () => {

			// If the webview panel is already open, reveal it
			if (currentPanel) {
				currentPanel.reveal(vscode.ViewColumn.One);
				return;
			}

			// Create and show a new webview panel
			currentPanel = vscode.window.createWebviewPanel(
				'PowerCodeValidator',
				'Power Code Validator',
				vscode.ViewColumn.One, {
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
			});

			// Set the HTML content for the webview
			currentPanel.webview.html = getWebviewContent(context, currentPanel);

			// Listen for changes in the filestore and update the webview accordingly
			filestore.onDidChange(files => {
				currentPanel?.webview.postMessage({ type: "updateFiles", payload: files });
			});

			// Load configuration settings
			const config = vscode.workspace.getConfiguration("powercodevalidator");
			const enableLogging = config.get<boolean>("enableLogging", false);

			// Enable or disable logging based on configuration
			Logger.enableLogging(enableLogging);

			// Handle panel disposal
			currentPanel.onDidDispose(() => {
				currentPanel = undefined;
			}, null, context.subscriptions);

			// Send naming standards data to the webview
			const output = getNamingStandards(context, false);
			currentPanel?.webview.postMessage({ type: 'setNameStandards', payload: output, });

			// Handle messages received from the webview
			currentPanel.webview.onDidReceiveMessage(
				async message => {
					// Handle file upload request
					if (message.type === 'uploadMSAppFile') {
						const fileUris = await vscode.window.showOpenDialog({
							canSelectMany: false,
							openLabel: 'Select a msapp file',
							filters: {
								'Canvas App files': ['msapp']
							}
						});

						if (fileUris && fileUris.length > 0) {
							currentPanel?.webview.postMessage({ type: "selectedFile", payload: fileUris[0].path });
							const filePath = fileUris[0].fsPath;
							const fileName = path.basename(filePath);
							const retValues: any = await uploadMSAppFile(context, filePath);
							const result = retValues.files;
							const targetFolder = retValues.targetFolder;
							if (result[0].status.includes('error')) {
								vscode.window.showErrorMessage(result[0].fullPath);
							}
							else {
								// Update filestore and notify webview
								filestore.setFiles(result);
								currentPanel?.webview.postMessage({ type: "initFiles", payload: { data: result, targetFolder: targetFolder, fileName: fileName } });
								// Start processing the uploaded files
								processFiles(context, currentPanel, result, targetFolder);
							}
						}
						else {
							vscode.window.showErrorMessage('Selected file is not a valid JSON file');
						}
					}
					// Handle file clicked event
					else if (message.type === "fileClicked") {
						vscode.window.showInformationMessage(`You clicked ${message.file}`);
					}
					// Handle request to get control tree data
					else if (message.type === "getControlTree") {
						const filePath = path.join(`${message.filePath}`, 'Processed', `${message.screenName}.json`);
						const data = await readData(filePath);
						const templateNames = collectTemplateNames(data);
						currentPanel?.webview.postMessage({ type: "controlTree", payload: data, templateNames });
					}
					// Handle saving of naming standards data
					else if (message.type === "saveNameStandards") {
						const result = await saveNameStandardsData(context, message.data);
						if (result) {
							const output = getNamingStandards(context, false);
							currentPanel?.webview.postMessage({ type: 'setNameStandards', payload: output, });
							vscode.window.showInformationMessage(`Data saved successfully`);
						}
						else {
							vscode.window.showErrorMessage(`Unable to save data`);
						}
					}
					// Handle resetting naming standards to default
					else if (message.type === "resetNameStandards") {
						const choice = await vscode.window.showWarningMessage(
							"Are you sure you want to reset? This would overwrite your existing changes if any.",
							{ modal: true }, // makes it a blocking dialog
							"Yes"
						);

						if (choice === "Yes") {
							const result = await resetNameStandards(context);
							if (result) {
								const output = getNamingStandards(context, true);
								currentPanel?.webview.postMessage({ type: 'setNameStandards', payload: output });
								vscode.window.showInformationMessage(`Data has been reset successfully`);
							}
							else {
								vscode.window.showErrorMessage(`Unable to reset data`);
							}
						}
						else {
							vscode.window.showInformationMessage('Reset action cancelled');
						}
					}
					// Download control names as a file
					else if (message.type === "downloadControlNameFile") {
						downloadControlNameFile(context);
					}

					else if (message.type === 'uploadControlNameFile') {
						const fileUris = await vscode.window.showOpenDialog({
							canSelectMany: false,
							openLabel: 'Select a json file',
							filters: {
								'Naming Standards': ['json']
							}
						});

						if (fileUris && fileUris.length > 0) {
							const filePath = fileUris[0].fsPath;
							const success = await uploadControlNameFile(context, filePath);
							if (success) {
								const output = getNamingStandards(context, false);
								currentPanel?.webview.postMessage({ type: 'setNameStandards', payload: output, });
								vscode.window.showInformationMessage('Control names uploaded successfully');
							}
						}
					}

				},
				undefined,
				context.subscriptions
			);
		})
	);
}


function getWebviewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
	const filePath = vscode.Uri.file(
		path.join(context.extensionPath, 'media', 'html', 'panel.html')
	);

	let html = fs.readFileSync(filePath.fsPath, 'utf8');

	// Replace local resource paths (e.g. scripts, styles) with webview URIs
	html = html.replace(/(src|href)="(.+?)"/g, (_, attr, src) => {
		const resourcePath = (panel.webview as any).asWebviewUri(
			vscode.Uri.file(path.join(context.extensionPath, 'media', src))
		);
		return `${attr}="${resourcePath}"`;
	});

	return html;
}

function collectTemplateNames(node: any, result: any = []) {
	if (node.templateName) {
		result.push(node.templateName);
	}

	if (Array.isArray(node._children)) {
		node._children.forEach((child: any) => collectTemplateNames(child, result));
	}

	// Remove duplicates with Set, then sort
	return [...new Set(result)].sort((a, b) => String(a).localeCompare(String(b)));

}