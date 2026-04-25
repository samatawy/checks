export class Exception {

    public message: string;

    public context?: any;

    constructor(message: string, context?: any) {
        this.message = message;
        this.context = context;
    }

}