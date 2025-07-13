import * as vscode from 'vscode';
import * as path from 'path';
import { EndpointDatabase, EndpointRecord } from './database';
import { FastAPIIndexer } from './indexer';

class FastAPIEndpointTreeItem extends vscode.TreeItem {
    constructor(
        public readonly endpoint: EndpointRecord,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(`${endpoint.method.toUpperCase()} ${endpoint.path}`, collapsibleState);
        
        this.tooltip = `${endpoint.method.toUpperCase()} ${endpoint.path}\nFunction: ${endpoint.functionName}\nRouter: ${endpoint.routerName}\nFile: ${path.basename(endpoint.filePath)}:${endpoint.lineNumber}`;
        this.description = `${endpoint.functionName} (${endpoint.routerName})`;
        this.contextValue = 'endpoint';
        
        // Set icon based on HTTP method
        this.iconPath = this.getIconForMethod(endpoint.method);
        
        // Set command to open the endpoint location
        this.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [
                vscode.Uri.file(endpoint.filePath),
                {
                    selection: new vscode.Range(
                        new vscode.Position(endpoint.lineNumber - 1, 0),
                        new vscode.Position(endpoint.lineNumber - 1, 0)
                    )
                }
            ]
        };
    }

    private getIconForMethod(method: string): vscode.ThemeIcon {
        switch (method.toLowerCase()) {
            case 'get':
                return new vscode.ThemeIcon('arrow-down', new vscode.ThemeColor('charts.green'));
            case 'post':
                return new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('charts.blue'));
            case 'put':
                return new vscode.ThemeIcon('arrow-both', new vscode.ThemeColor('charts.orange'));
            case 'delete':
                return new vscode.ThemeIcon('trash', new vscode.ThemeColor('charts.red'));
            case 'patch':
                return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.yellow'));
            case 'head':
                return new vscode.ThemeIcon('info', new vscode.ThemeColor('charts.purple'));
            case 'options':
                return new vscode.ThemeIcon('settings', new vscode.ThemeColor('charts.gray'));
            default:
                return new vscode.ThemeIcon('symbol-method');
        }
    }
}

class FastAPIEndpointProvider implements vscode.TreeDataProvider<FastAPIEndpointTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FastAPIEndpointTreeItem | undefined | null | void> = new vscode.EventEmitter<FastAPIEndpointTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FastAPIEndpointTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private database: EndpointDatabase;
    private indexer: FastAPIIndexer;
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private isIndexing: boolean = false;

    constructor(storagePath: string) {
        this.database = new EndpointDatabase(storagePath);
        this.indexer = new FastAPIIndexer(this.database);
        this.setupFileWatcher();
        
        // Initial indexing
        this.performInitialIndexing();
    }

    private async performInitialIndexing(): Promise<void> {
        if (!vscode.workspace.workspaceFolders) {
            return;
        }

        this.isIndexing = true;
        
        try {
            const config = vscode.workspace.getConfiguration('fastapi-endpoint-detector');
            const excludePatterns = config.get<string[]>('excludePatterns', []);

            for (const workspaceFolder of vscode.workspace.workspaceFolders) {
                await this.indexer.indexWorkspace(workspaceFolder.uri.fsPath, excludePatterns);
            }
            
            // Refresh tree view after indexing
            this._onDidChangeTreeData.fire();
            
            // Show stats
            const stats = await this.database.getStats();
            vscode.window.showInformationMessage(
                `FastAPI Indexing complete! Found ${stats.totalEndpoints} endpoints in ${stats.indexedFiles} files.`
            );

        } catch (error) {
            console.error('Error during initial indexing:', error);
            vscode.window.showErrorMessage('Error indexing FastAPI endpoints: ' + error);
        } finally {
            this.isIndexing = false;
        }
    }

    async refresh(): Promise<void> {
        if (this.isIndexing) {
            vscode.window.showInformationMessage('Indexing in progress, please wait...');
            return;
        }

        await this.performInitialIndexing();
    }

    getTreeItem(element: FastAPIEndpointTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FastAPIEndpointTreeItem): Promise<FastAPIEndpointTreeItem[]> {
        if (!element) {
            // Return root items (endpoints)
            try {
                const endpoints = await this.database.getAllEndpoints();
                
                return endpoints.map(endpoint => 
                    new FastAPIEndpointTreeItem(endpoint, vscode.TreeItemCollapsibleState.None)
                );
            } catch (error) {
                console.error('Error getting endpoints:', error);
                return [];
            }
        }
        return [];
    }

    private setupFileWatcher(): void {
        const config = vscode.workspace.getConfiguration('fastapi-endpoint-detector');
        const autoRefresh = config.get<boolean>('autoRefresh', true);
        
        if (autoRefresh) {
            this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.py');
            this.fileWatcher.onDidChange((uri) => this.onFileChanged(uri.fsPath));
            this.fileWatcher.onDidCreate((uri) => this.onFileChanged(uri.fsPath));
            this.fileWatcher.onDidDelete((uri) => this.onFileDeleted(uri.fsPath));
        }
    }

    private async onFileChanged(filePath: string): Promise<void> {
        if (this.isIndexing) {
            return;
        }

        try {
            console.log(`File changed: ${filePath}`);
            await this.indexer.reindexFile(filePath);
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Error re-indexing file:', error);
        }
    }

    private async onFileDeleted(filePath: string): Promise<void> {
        try {
            console.log(`File deleted: ${filePath}`);
            await this.database.clearEndpointsForFile(filePath);
            this._onDidChangeTreeData.fire();
        } catch (error) {
            console.error('Error handling file deletion:', error);
        }
    }

    async searchEndpoints(searchTerm: string): Promise<EndpointRecord[]> {
        try {
            return await this.database.searchEndpoints(searchTerm);
        } catch (error) {
            console.error('Error searching endpoints:', error);
            return [];
        }
    }

    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
        }
        this.database.close();
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 FastAPI Endpoint Detector is activating...');

    const provider = new FastAPIEndpointProvider(context.globalStorageUri.fsPath);
    const treeView = vscode.window.createTreeView('fastapi-endpoints', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.refresh', async () => {
        await provider.refresh();
    });

    const openEndpointCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.openEndpoint', (item: FastAPIEndpointTreeItem) => {
        const endpoint = item.endpoint;
        const uri = vscode.Uri.file(endpoint.filePath);
        vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(
                new vscode.Position(endpoint.lineNumber - 1, 0),
                new vscode.Position(endpoint.lineNumber - 1, 0)
            )
        });
    });

    const copyEndpointUrlCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.copyEndpointUrl', (item: FastAPIEndpointTreeItem) => {
        const config = vscode.workspace.getConfiguration('fastapi-endpoint-detector');
        const baseUrl = config.get<string>('baseUrl', 'http://localhost:8000');
        const fullUrl = `${baseUrl}${item.endpoint.path}`;
        
        vscode.env.clipboard.writeText(fullUrl);
        vscode.window.showInformationMessage(`Copied to clipboard: ${fullUrl}`);
    });

    const searchCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.search', async () => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder = 'Type to search FastAPI endpoints...';
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.busy = false;
        quickPick.title = 'FastAPI Endpoint Search';

        // Show all endpoints initially
        try {
            const allEndpoints = await provider.searchEndpoints('');
            quickPick.items = allEndpoints.map(endpoint => ({
                label: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
                description: `${endpoint.functionName} (${endpoint.routerName})`,
                detail: `${path.basename(endpoint.filePath)}:${endpoint.lineNumber}`,
                endpoint: endpoint
            }));
        } catch (error) {
            console.error('Error getting all endpoints:', error);
            quickPick.items = [];
        }

        // Live search as user types
        quickPick.onDidChangeValue(async (value) => {
            if (value.length === 0) {
                // Show all endpoints when search is empty
                try {
                    const allEndpoints = await provider.searchEndpoints('');
                    quickPick.items = allEndpoints.map(endpoint => ({
                        label: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
                        description: `${endpoint.functionName} (${endpoint.routerName})`,
                        detail: `${path.basename(endpoint.filePath)}:${endpoint.lineNumber}`,
                        endpoint: endpoint
                    }));
                } catch (error) {
                    console.error('Error getting all endpoints:', error);
                    quickPick.items = [];
                }
                return;
            }

            quickPick.busy = true;
            try {
                const results = await provider.searchEndpoints(value);
                quickPick.items = results.map(endpoint => ({
                    label: `${endpoint.method.toUpperCase()} ${endpoint.path}`,
                    description: `${endpoint.functionName} (${endpoint.routerName})`,
                    detail: `${path.basename(endpoint.filePath)}:${endpoint.lineNumber}`,
                    endpoint: endpoint
                }));
            } catch (error) {
                console.error('Error searching endpoints:', error);
                quickPick.items = [];
            } finally {
                quickPick.busy = false;
            }
        });

        // Handle selection
        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0] as any;
            if (selectedItem && selectedItem.endpoint) {
                const uri = vscode.Uri.file(selectedItem.endpoint.filePath);
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(
                        new vscode.Position(selectedItem.endpoint.lineNumber - 1, 0),
                        new vscode.Position(selectedItem.endpoint.lineNumber - 1, 0)
                    )
                });
            }
            quickPick.hide();
        });

        // Handle hide
        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.show();
    });

    // Register disposables
    context.subscriptions.push(
        treeView,
        refreshCommand,
        openEndpointCommand,
        copyEndpointUrlCommand,
        searchCommand,
        provider
    );

    console.log('✅ FastAPI Endpoint Detector activated successfully!');
}

export function deactivate() {
    console.log('FastAPI Endpoint Detector is now deactivated!');
} 