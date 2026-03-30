export interface SingleResult {

    valid: boolean;

    field?: string | number | null | undefined;

    hint?: string;

    warn?: string;

    err?: string;
}

export interface ResultSet extends SingleResult {

    input?: any;

    results?: IResult[];

    hints?: string[];

    warnings?: string[];

    errors?: string[];
}

export type IResult = SingleResult | ResultSet;

export interface CheckOptions {

    hint?: string | string[];

    warn?: string | string[];

    err?: string;
}

export interface TolerantCheckOptions extends CheckOptions {

    tolerant?: boolean;
}

export interface StringCheckOptions extends CheckOptions {

    case?: 'sensitive' | 'insensitive';
}

export interface ResultOptions {

    language?: string;

    raw?: boolean;

    nested?: boolean;

    flattened?: boolean;
}

export interface Check {

    result(options?: ResultOptions): IResult;
}
