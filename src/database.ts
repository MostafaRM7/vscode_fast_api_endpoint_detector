import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface EndpointRecord {
    id?: number;
    method: string;
    path: string;
    functionName: string;
    filePath: string;
    lineNumber: number;
    routerName: string;
    fileHash: string;
    workspaceId?: string;
    createdAt: number;
}

export interface FileRecord {
    id?: number;
    filePath: string;
    fileHash: string;
    lastModified: number;
    isIndexed: boolean;
    workspaceId?: string;
    createdAt: number;
}

interface DatabaseData {
    endpoints: EndpointRecord[];
    files: FileRecord[];
    nextId: number;
}

export class EndpointDatabase {
    private data: DatabaseData;
    private dbPath: string;
    private workspaceId: string;

    constructor(storagePath: string, workspaceId?: string) {
        this.workspaceId = workspaceId || 'default';
        this.dbPath = path.join(storagePath, `fastapi_endpoints_${this.workspaceId}.json`);
        this.data = {
            endpoints: [],
            files: [],
            nextId: 1
        };
        this.initDatabase();
    }

    private initDatabase(): void {
        try {
            // Ensure directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Load existing data
            if (fs.existsSync(this.dbPath)) {
                const fileContent = fs.readFileSync(this.dbPath, 'utf8');
                this.data = JSON.parse(fileContent);
                
                // Ensure data structure is complete
                if (!this.data.endpoints) this.data.endpoints = [];
                if (!this.data.files) this.data.files = [];
                if (!this.data.nextId) this.data.nextId = 1;
            }
            
            console.log('Database initialized successfully');
        } catch (err) {
            console.error('Error initializing database:', err);
            // Reset to empty state on error
            this.data = {
                endpoints: [],
                files: [],
                nextId: 1
            };
        }
    }

    private saveDatabase(): void {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error('Error saving database:', err);
        }
    }

    public async getFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('md5');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    public async isFileIndexed(filePath: string): Promise<boolean> {
        const fileRecord = this.data.files.find(f => 
            f.filePath === filePath && (f.workspaceId === this.workspaceId || !f.workspaceId)
        );
        
        if (!fileRecord) {
            return false;
        }

        try {
            const stats = await fs.promises.stat(filePath);
            const currentHash = await this.getFileHash(filePath);
            
            // Check if file has changed
            const hasChanged = fileRecord.fileHash !== currentHash || fileRecord.lastModified !== stats.mtimeMs;
            return !hasChanged;
        } catch (error) {
            // File doesn't exist anymore
            return false;
        }
    }

    public async addOrUpdateFile(filePath: string): Promise<void> {
            try {
                const stats = await fs.promises.stat(filePath);
                const fileHash = await this.getFileHash(filePath);
                const now = Date.now();

            const existingIndex = this.data.files.findIndex(f => f.filePath === filePath);
            const fileRecord: FileRecord = {
                id: existingIndex >= 0 ? this.data.files[existingIndex].id : this.data.nextId++,
                filePath,
                fileHash,
                lastModified: stats.mtimeMs,
                isIndexed: true,
                workspaceId: this.workspaceId,
                createdAt: existingIndex >= 0 ? this.data.files[existingIndex].createdAt : now
            };

            if (existingIndex >= 0) {
                this.data.files[existingIndex] = fileRecord;
                    } else {
                this.data.files.push(fileRecord);
                    }

            this.saveDatabase();
            } catch (error) {
            throw error;
            }
    }

    public async clearEndpointsForFile(filePath: string): Promise<void> {
        this.data.endpoints = this.data.endpoints.filter(e => 
            e.filePath !== filePath || (e.workspaceId !== this.workspaceId && e.workspaceId)
        );
        this.saveDatabase();
    }

    public async addEndpoint(endpoint: EndpointRecord): Promise<void> {
        const newEndpoint: EndpointRecord = {
            ...endpoint,
            id: this.data.nextId++,
            workspaceId: this.workspaceId,
            createdAt: Date.now()
        };

        this.data.endpoints.push(newEndpoint);
        this.saveDatabase();
    }

    public async getAllEndpoints(): Promise<EndpointRecord[]> {
        const currentWorkspaceEndpoints = this.data.endpoints.filter(e => 
            e.workspaceId === this.workspaceId || !e.workspaceId
        );
        
        const sortedByFile = [...currentWorkspaceEndpoints].sort((a, b) => {
            if (a.filePath !== b.filePath) {
                return a.filePath.localeCompare(b.filePath);
            }
            return a.lineNumber - b.lineNumber;
        });
        
        return this.sortEndpointsByMethod(sortedByFile);
    }

    public async getEndpointsByFile(filePath: string): Promise<EndpointRecord[]> {
        const filteredByFile = this.data.endpoints
            .filter(e => e.filePath === filePath && (e.workspaceId === this.workspaceId || !e.workspaceId))
            .sort((a, b) => a.lineNumber - b.lineNumber);
            
        return this.sortEndpointsByMethod(filteredByFile);
    }

    public async searchEndpoints(searchTerm: string): Promise<EndpointRecord[]> {
        const searchPattern = searchTerm.toLowerCase();
        
        const results = this.data.endpoints.filter(endpoint => 
            (endpoint.workspaceId === this.workspaceId || !endpoint.workspaceId) &&
            (endpoint.method.toLowerCase().includes(searchPattern) ||
            endpoint.path.toLowerCase().includes(searchPattern) ||
            endpoint.functionName.toLowerCase().includes(searchPattern) ||
            endpoint.filePath.toLowerCase().includes(searchPattern))
        );
        
        return this.sortEndpointsByMethod(results);
    }

    private sortEndpointsByMethod(endpoints: EndpointRecord[]): EndpointRecord[] {
        const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
        
        return endpoints.sort((a, b) => {
            const aIndex = methodOrder.indexOf(a.method);
            const bIndex = methodOrder.indexOf(b.method);
            
            // اگر هر دو method در لیست باشند، بر اساس اولویت سورت کن
            if (aIndex !== -1 && bIndex !== -1) {
                if (aIndex !== bIndex) {
                    return aIndex - bIndex;
                }
            }
            // اگر فقط یکی در لیست باشد، آن را اولویت بده
            else if (aIndex !== -1) {
                return -1;
            }
            else if (bIndex !== -1) {
                return 1;
            }
            // اگر هیچکدام در لیست نباشند، بر اساس اسم سورت کن
            else {
                const methodCompare = a.method.localeCompare(b.method);
                if (methodCompare !== 0) {
                    return methodCompare;
                }
            }
            
            // در صورت یکسان بودن method، بر اساس path سورت کن
            return a.path.localeCompare(b.path);
        });
    }

    public async getStats(): Promise<{ totalEndpoints: number; totalFiles: number; indexedFiles: number }> {
        const workspaceEndpoints = this.data.endpoints.filter(e => 
            e.workspaceId === this.workspaceId || !e.workspaceId
        );
        const workspaceFiles = this.data.files.filter(f => 
            f.workspaceId === this.workspaceId || !f.workspaceId
        );
        
        const totalEndpoints = workspaceEndpoints.length;
        const totalFiles = workspaceFiles.length;
        const indexedFiles = workspaceFiles.filter(f => f.isIndexed).length;

        return {
            totalEndpoints,
            totalFiles,
            indexedFiles
        };
    }

    public async close(): Promise<void> {
        this.saveDatabase();
    }

    public getDbPath(): string {
        return this.dbPath;
    }
} 