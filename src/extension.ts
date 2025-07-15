import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
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

type SortField = 'name' | 'method' | 'default';
type SortOrder = 'asc' | 'desc';

interface SortState {
    field: SortField;
    order: SortOrder;
}

class FastAPIEndpointProvider implements vscode.TreeDataProvider<FastAPIEndpointTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<FastAPIEndpointTreeItem | undefined | null | void> = new vscode.EventEmitter<FastAPIEndpointTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<FastAPIEndpointTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    public database: EndpointDatabase;
    private indexer: FastAPIIndexer;
    private fileWatcher: vscode.FileSystemWatcher | undefined;
    private isIndexing: boolean = false;
    private sortState: SortState = { field: 'default', order: 'asc' };

    constructor(storagePath: string, workspaceId?: string) {
        this.database = new EndpointDatabase(storagePath, workspaceId);
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
                const sortedEndpoints = this.applySorting(endpoints);
                
                return sortedEndpoints.map(endpoint => 
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
            const endpoints = await this.database.searchEndpoints(searchTerm);
            return this.applySorting(endpoints);
        } catch (error) {
            console.error('Error searching endpoints:', error);
            return [];
        }
    }

    private applySorting(endpoints: EndpointRecord[]): EndpointRecord[] {
        if (this.sortState.field === 'default') {
            return endpoints;
        }

        return [...endpoints].sort((a, b) => {
            let comparison = 0;
            
            switch (this.sortState.field) {
                case 'name':
                    comparison = a.functionName.localeCompare(b.functionName);
                    break;
                case 'method':
                    comparison = a.method.localeCompare(b.method);
                    break;
                default:
                    return 0;
            }
            
            return this.sortState.order === 'asc' ? comparison : -comparison;
        });
    }

    public setSortState(field: SortField): void {
        // Toggle order if same field, otherwise default to asc
        if (this.sortState.field === field) {
            this.sortState.order = this.sortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortState.field = field;
            this.sortState.order = 'asc';
        }
        
        this._onDidChangeTreeData.fire();
    }

    public setSortField(field: SortField, order: SortOrder): void {
        this.sortState.field = field;
        this.sortState.order = order;
        this._onDidChangeTreeData.fire();
    }

    public resetSort(): void {
        this.sortState = { field: 'default', order: 'asc' };
        this._onDidChangeTreeData.fire();
    }

    public getSortState(): SortState {
        return { ...this.sortState };
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

    // Use workspace-specific storage instead of global storage
    const storageUri = context.storageUri || context.globalStorageUri;
    
    // Generate workspace ID from workspace folder
    let workspaceId = 'default';
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        workspaceId = crypto.createHash('md5').update(workspacePath).digest('hex').substring(0, 8);
    }
    
    const provider = new FastAPIEndpointProvider(storageUri.fsPath, workspaceId);
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

    const showDatabasePathCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.showDatabasePath', async () => {
        const dbPath = provider.database.getDbPath();
        const exists = require('fs').existsSync(dbPath);
        const message = `Database file: ${dbPath}\nExists: ${exists ? 'Yes' : 'No'}`;
        
        const result = await vscode.window.showInformationMessage(
            message,
            'Copy Path',
            'Open Folder'
        );
        
        if (result === 'Copy Path') {
            vscode.env.clipboard.writeText(dbPath);
            vscode.window.showInformationMessage('Database path copied to clipboard!');
        } else if (result === 'Open Folder') {
            const folderPath = require('path').dirname(dbPath);
            vscode.env.openExternal(vscode.Uri.file(folderPath));
        }
    });

    const sortEndpointsCommand = vscode.commands.registerCommand('fastapi-endpoint-detector.sortEndpoints', async () => {
        const currentSort = provider.getSortState();
        const currentSortText = currentSort.field === 'default' ? 'Default' : 
                               currentSort.field === 'name' ? `Name (${currentSort.order === 'asc' ? '↑' : '↓'})` :
                               currentSort.field === 'method' ? `Method (${currentSort.order === 'asc' ? '↑' : '↓'})` : 'Default';
        
        interface SortOption {
            label: string;
            description: string;
            action: () => void;
        }
        
        const sortOptions: SortOption[] = [
            {
                label: '📝 Name (Ascending)',
                description: 'Sort by function name A-Z',
                action: () => {
                    provider.setSortField('name', 'asc');
                }
            },
            {
                label: '📝 Name (Descending)',
                description: 'Sort by function name Z-A',
                action: () => {
                    provider.setSortField('name', 'desc');
                }
            },
            {
                label: '🔗 Method (Ascending)',
                description: 'Sort by HTTP method A-Z',
                action: () => {
                    provider.setSortField('method', 'asc');
                }
            },
            {
                label: '🔗 Method (Descending)',
                description: 'Sort by HTTP method Z-A',
                action: () => {
                    provider.setSortField('method', 'desc');
                }
            },
            {
                label: '🔄 Reset to Default',
                description: 'Reset to default sorting',
                action: () => {
                    provider.resetSort();
                }
            }
        ];

        const quickPick = vscode.window.createQuickPick();
        quickPick.title = `Sort Endpoints (Current: ${currentSortText})`;
        quickPick.placeholder = 'Select sorting option';
        quickPick.items = sortOptions.map(option => ({
            label: option.label,
            description: option.description,
            option: option
        }));

        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0] as any;
            if (selectedItem && selectedItem.option) {
                selectedItem.option.action();
                const newSort = provider.getSortState();
                const newSortText = newSort.field === 'default' ? 'Default' : 
                                   newSort.field === 'name' ? `Name (${newSort.order === 'asc' ? 'A-Z' : 'Z-A'})` :
                                   newSort.field === 'method' ? `Method (${newSort.order === 'asc' ? 'A-Z' : 'Z-A'})` : 'Default';
                vscode.window.showInformationMessage(`Sorted by: ${newSortText}`);
            }
            quickPick.hide();
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
        });

        quickPick.show();
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
        showDatabasePathCommand,
        sortEndpointsCommand,
        searchCommand,
        provider
    );

    console.log('✅ FastAPI Endpoint Detector activated successfully!');
}

export function deactivate() {
    console.log('FastAPI Endpoint Detector is now deactivated!');
} 