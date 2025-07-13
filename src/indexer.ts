import * as fs from 'fs';
import * as path from 'path';
import { EndpointDatabase, EndpointRecord } from './database';

export class FastAPIIndexer {
    private database: EndpointDatabase;

    constructor(database: EndpointDatabase) {
        this.database = database;
    }

    public async indexWorkspace(workspacePath: string, excludePatterns: string[] = []): Promise<void> {
        console.log('🚀 Starting FastAPI indexer...');
        console.log('📁 Workspace:', workspacePath);
        console.log('🚫 Exclude patterns:', excludePatterns);

        const pythonFiles = await this.findPythonFiles(workspacePath, excludePatterns);
        console.log(`📄 Found ${pythonFiles.length} Python files`);

        let indexedCount = 0;
        let skippedCount = 0;
        let endpointCount = 0;

        for (const filePath of pythonFiles) {
            try {
                const isAlreadyIndexed = await this.database.isFileIndexed(filePath);
                
                if (isAlreadyIndexed) {
                    console.log(`⏭️  Skipping ${path.basename(filePath)} (already indexed)`);
                    skippedCount++;
                    continue;
                }

                console.log(`📝 Indexing ${path.relative(workspacePath, filePath)}...`);
                const endpoints = await this.indexFile(filePath);
                
                if (endpoints.length > 0) {
                    // Clear old endpoints for this file
                    await this.database.clearEndpointsForFile(filePath);
                    
                    // Add new endpoints
                    for (const endpoint of endpoints) {
                        await this.database.addEndpoint(endpoint);
                    }
                    
                    console.log(`  ✅ Found ${endpoints.length} endpoint(s)`);
                    endpointCount += endpoints.length;
                } else {
                    console.log(`  ℹ️  No endpoints found`);
                }

                // Mark file as indexed
                await this.database.addOrUpdateFile(filePath);
                indexedCount++;

            } catch (error) {
                console.error(`❌ Error indexing ${filePath}:`, error);
            }
        }

        const stats = await this.database.getStats();
        console.log('\n📊 Indexing complete:');
        console.log(`  📄 Files processed: ${indexedCount}`);
        console.log(`  ⏭️  Files skipped: ${skippedCount}`);
        console.log(`  🎯 New endpoints found: ${endpointCount}`);
        console.log(`  💾 Total endpoints in database: ${stats.totalEndpoints}`);
        console.log(`  📁 Total files in database: ${stats.totalFiles}`);
    }

    private async findPythonFiles(dirPath: string, excludePatterns: string[]): Promise<string[]> {
        const pythonFiles: string[] = [];

        const scanDirectory = async (currentPath: string): Promise<void> => {
            try {
                const items = await fs.promises.readdir(currentPath);

                for (const item of items) {
                    const fullPath = path.join(currentPath, item);
                    
                    // Skip if matches exclude patterns
                    if (this.matchesExcludePattern(fullPath, excludePatterns)) {
                        continue;
                    }

                    const stat = await fs.promises.stat(fullPath);

                    if (stat.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (item.endsWith('.py')) {
                        pythonFiles.push(fullPath);
                    }
                }
            } catch (error) {
                console.warn(`Warning: Cannot scan directory ${currentPath}:`, error);
            }
        };

        await scanDirectory(dirPath);
        return pythonFiles;
    }

    private matchesExcludePattern(filePath: string, excludePatterns: string[]): boolean {
        for (const pattern of excludePatterns) {
            // Simple pattern matching - can be enhanced
            const normalizedPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
            if (filePath.includes(normalizedPattern)) {
                return true;
            }
        }
        return false;
    }

    private async indexFile(filePath: string): Promise<EndpointRecord[]> {
        const endpoints: EndpointRecord[] = [];
        
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            const fileHash = await this.database.getFileHash(filePath);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNumber = i + 1;

                // First check: does line start with @ ?
                const trimmedLine = line.trim();
                if (!trimmedLine.startsWith('@')) {
                    continue;
                }

                // Try to parse as endpoint
                const endpoint = this.parseEndpointLine(line, lines, filePath, lineNumber, fileHash);
                if (endpoint) {
                    endpoints.push(endpoint);
                    console.log(`    🎯 ${endpoint.method.toUpperCase()} ${endpoint.path} → ${endpoint.functionName}`);
                }
            }

        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
        }

        return endpoints;
    }

    private parseEndpointLine(
        line: string, 
        lines: string[], 
        filePath: string, 
        lineNumber: number,
        fileHash: string
    ): EndpointRecord | null {
        const trimmedLine = line.trim();
        
        // Must start with @
        if (!trimmedLine.startsWith('@')) {
            return null;
        }

        // Remove @ and find the method call
        const withoutAt = trimmedLine.substring(1);
        
        // Look for pattern: something.method('path'
        const dotIndex = withoutAt.indexOf('.');
        if (dotIndex === -1) {
            return null;
        }

        const routerName = withoutAt.substring(0, dotIndex).trim();
        const rest = withoutAt.substring(dotIndex + 1);

        // Find opening parenthesis
        const parenIndex = rest.indexOf('(');
        if (parenIndex === -1) {
            return null;
        }

        const methodName = rest.substring(0, parenIndex).trim();
        const argsSection = rest.substring(parenIndex + 1);

        // Valid HTTP methods
        const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'api_route'];
        if (!validMethods.includes(methodName.toLowerCase())) {
            return null;
        }

        // Extract path from first string literal
        const path = this.extractStringLiteral(argsSection);
        if (!path) {
            return null;
        }

        // Handle api_route special case
        let finalMethod = methodName.toLowerCase();
        if (finalMethod === 'api_route') {
            const extractedMethod = this.extractMethodFromApiRoute(argsSection);
            if (extractedMethod) {
                finalMethod = extractedMethod;
            } else {
                finalMethod = 'get'; // default
            }
        }

        // Skip if not a valid HTTP method (after api_route processing)
        const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
        if (!httpMethods.includes(finalMethod)) {
            return null;
        }

        // Find function name in following lines
        const functionName = this.findFunctionName(lines, lineNumber);

        return {
            method: finalMethod,
            path: path,
            functionName: functionName,
            filePath: filePath,
            lineNumber: lineNumber,
            routerName: routerName,
            fileHash: fileHash,
            createdAt: Date.now()
        };
    }

    private extractStringLiteral(argsSection: string): string | null {
        // Look for quotes
        const singleQuoteIndex = argsSection.indexOf("'");
        const doubleQuoteIndex = argsSection.indexOf('"');
        
        let quoteIndex = -1;
        let quoteChar = '';
        
        if (singleQuoteIndex !== -1 && doubleQuoteIndex !== -1) {
            if (singleQuoteIndex < doubleQuoteIndex) {
                quoteIndex = singleQuoteIndex;
                quoteChar = "'";
            } else {
                quoteIndex = doubleQuoteIndex;
                quoteChar = '"';
            }
        } else if (singleQuoteIndex !== -1) {
            quoteIndex = singleQuoteIndex;
            quoteChar = "'";
        } else if (doubleQuoteIndex !== -1) {
            quoteIndex = doubleQuoteIndex;
            quoteChar = '"';
        }

        if (quoteIndex === -1) {
            return null;
        }

        // Find closing quote
        const pathStart = quoteIndex + 1;
        const pathEnd = argsSection.indexOf(quoteChar, pathStart);
        if (pathEnd === -1) {
            return null;
        }

        return argsSection.substring(pathStart, pathEnd);
    }

    private extractMethodFromApiRoute(argsSection: string): string | null {
        // Try to extract method from methods= parameter
        const patterns = [
            /methods\s*=\s*\[\s*["'](\w+)["']/i,
            /methods\s*=\s*\[\s*["'](\w+)["']\s*\]/i,
        ];

        for (const pattern of patterns) {
            const match = argsSection.match(pattern);
            if (match) {
                return match[1].toLowerCase();
            }
        }

        return null;
    }

    private findFunctionName(lines: string[], startLineNumber: number): string {
        // Look for function definition in next few lines
        for (let i = startLineNumber; i < Math.min(startLineNumber + 10, lines.length); i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('def ') || line.startsWith('async def ')) {
                const match = line.match(/(?:async\s+)?def\s+(\w+)/);
                if (match) {
                    return match[1];
                }
            }
        }

        return 'unknown';
    }

    public async reindexFile(filePath: string): Promise<void> {
        console.log(`🔄 Re-indexing ${path.basename(filePath)}...`);
        
        try {
            // Clear old endpoints
            await this.database.clearEndpointsForFile(filePath);
            
            // Index again
            const endpoints = await this.indexFile(filePath);
            
            // Add new endpoints
            for (const endpoint of endpoints) {
                await this.database.addEndpoint(endpoint);
            }
            
            // Update file record
            await this.database.addOrUpdateFile(filePath);
            
            console.log(`✅ Re-indexed ${endpoints.length} endpoint(s)`);
            
        } catch (error) {
            console.error(`❌ Error re-indexing ${filePath}:`, error);
        }
    }
} 