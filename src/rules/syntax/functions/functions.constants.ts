import type { WorkingContext } from "../../types";
import { DateFunctionExpression, NumericFunctionExpression } from "../function.expression";

export class ConstantNumbers extends NumericFunctionExpression {

    constructor(name: string) {
        super(name, []);
    }

    public evaluate(context: WorkingContext): number {
        switch (this.name) {
            case 'pi':
                return Math.PI;
            case 'e':
                return Math.E;
            case 'phi':
                return (1 + Math.sqrt(5)) / 2;
            case 'tau':
                return 2 * Math.PI;
            case 'c':
                return 299792458;
            case 'speedOfLight':
                return 299792458;
            case 'g':
                return 9.80665;
            case 'goldenRatio':
                return (1 + Math.sqrt(5)) / 2;
            case 'avogadro':
                return 6.02214076e23;
            case 'planck':
                return 6.62607015e-34;
            case 'electronMass':
                return 9.10938356e-31;
            case 'protonMass':
                return 1.6726219e-27;
            case 'neutronMass':
                return 1.674927471e-27;
            case 'boltzmann':
                return 1.380649e-23;
            case 'gasConstant':
                return 8.314462618;
            case 'faraday':
                return 96485.33212;
            case 'gravitationalConstant':
                return 6.67430e-11;

            default:
                throw new Error(`Unknown numeric constant: ${this.name}`);
        }
    }

    static names = ['pi', 'e', 'phi', 'tau', 'c', 'speedOfLight', 'g', 'goldenRatio', 'avogadro', 'planck', 'electronMass', 'protonMass', 'neutronMass', 'boltzmann', 'gasConstant', 'faraday', 'gravitationalConstant'];
}

export class ConstantDates extends DateFunctionExpression {

    constructor(name: string) {
        super(name, []);
    }

    public evaluate(context: WorkingContext): Date {
        switch (this.name) {
            case 'now':
                return new Date();
            case 'today':
                const now = new Date();
                return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case 'yearStart':
                const currentYear = new Date().getFullYear();
                return new Date(currentYear, 0, 1);
            case 'yearEnd':
                const currentYearEnd = new Date().getFullYear();
                return new Date(currentYearEnd, 11, 31);
            case 'monthStart':
                const nowMonth = new Date();
                return new Date(nowMonth.getFullYear(), nowMonth.getMonth(), 1);
            case 'monthEnd':
                const nowMonthEnd = new Date();
                return new Date(nowMonthEnd.getFullYear(), nowMonthEnd.getMonth() + 1, 0);

            default:
                throw new Error(`Unknown date function: ${this.name}`);
        }
    }

    static names = ['now', 'today', 'yearStart', 'yearEnd', 'monthStart', 'monthEnd'];

}