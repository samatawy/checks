import type { WorkSpace } from "../engine/work.space";

export interface FileReaderOptions {
    /**
     * Determines whether to read the file content line by line or block by block (separated by empty lines). This allows for flexible formatting of the file, where each entry can either be defined on a single line or as a block of text.
     * - 'line': Read the file content line by line, where each line is considered a separate entry to parse. Empty lines will be skipped.
     * - 'block': Read the file content block by block, where blocks are separated by one or more empty lines. Each block (which can consist of multiple lines) is considered a separate entry to parse. Empty blocks will be skipped.
     */
    read_by: 'line' | 'block';

    /**
     * Optional reference to the WorkSpace instance, which can be used by the RuleParser 
     * to access existing rules, types, functions, and constants when parsing rules from the file. 
     * This allows for more complex rule definitions that can reference other components within the WorkSpace.
     */
    workspace?: WorkSpace;
}

/**
 * Abstract base class for file readers that parse text files.
 * You should not use this class directly, but rather use the specific file reader implementations like RulesFileReader and ConstantsFileReader.
 * This class provides common functionality for reading file content either line by line or block by block (separated by empty lines), 
 * and defines the abstract parse method that must be implemented by subclasses to handle the specific parsing logic for rules or constants.    
 */
export abstract class AbstractFileReader {

    protected options: Partial<FileReaderOptions>;

    constructor(options?: Partial<FileReaderOptions>) {
        this.options = options || {};
    }

    public abstract parse(fileContent: string): any;

    protected readLine(content: string): { line: string, remainder: string } {
        const newlineIndex = content.indexOf('\n');
        if (newlineIndex === -1) {
            return { line: content, remainder: '' };
        }
        const line = content.slice(0, newlineIndex).trim();
        const remainder = content.slice(newlineIndex + 1).trim();
        // Ignore comments and empty lines
        const isComment = line.startsWith('#') || line.startsWith('//');

        if (line.length === 0 || isComment) {
            return this.readLine(remainder);
        } else {
            return { line, remainder };
        }
    }

    protected readBlock(content: string): { line: string, remainder: string } {
        // Normalize line endings to \n for consistent processing
        let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Remove comments
        normalizedContent = normalizedContent.split('\n')
            .filter(line => !line.trim().startsWith('#') && !line.trim().startsWith('//'))
            .join('\n');

        // Find the first occurrence of an empty line (allowing whitespace)
        // This regex matches: \n + any whitespace + \n
        const match = /\n\s*\n/.exec(normalizedContent);

        if (match === null) {
            // No empty line found - return entire content as the block
            const line = normalizedContent.trim().replace(/\n/g, ' ');
            return { line, remainder: '' };
        }

        const blockEndIndex = match.index;
        const line = normalizedContent.slice(0, blockEndIndex).trim().replace(/\n/g, ' ');
        const remainder = normalizedContent.slice(match.index + match[0].length).trim();

        if (line.length === 0) {
            return this.readBlock(remainder);
        } else {
            return { line, remainder };
        }
    }
}