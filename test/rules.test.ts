import { describe, expect, it } from 'vitest';
import { RuleGraph } from '../src/rules/engine/graph/rule.graph';
import { IfThenElseRule, IfThenRule } from '../src/rules/rules/conditional.rules';
import { WorkSpace } from '../src/rules/engine/work.space';
import { ExpressionParser } from '../src/rules/parser/expression.parser';
import { LogicalExpression } from '../src/rules/syntax/logical.expression';
import { TernaryExpression } from '../src/rules/syntax/ternary.expression';
import { ComparisonExpression } from '../src/rules/syntax/comparison.expression';
import { ArithmeticExpression } from '../src/rules/syntax/arithmetic.expression';
import { RulesFileReader } from '../src/rules/reader/rules.file.reader';
import { ConstantsFileReader } from '../src/rules/reader/constants.file.reader';
import { RuleParser } from '../src/rules/parser/rule.parser';

describe('rules test', () => {
  it('add rules to graph', async () => {

    const graph = new RuleGraph();
    const r1 = new IfThenRule('if x then y = true');
    expect(r1.required().size).toBe(1);
    const r2 = new IfThenRule('if a then b = true');
    expect(r2.required().size).toBe(1);

    graph.addRule(r1);
    graph.addRule(r2);

    expect(graph.roots.length).toBe(2);
  });

  it('throws errors for invalid syntax', async () => {
    const parser = new ExpressionParser();

    expect(() => parser.parse('')).toThrow("Empty expression");
    expect(() => parser.parse('x > ')).toThrow();
    expect(() => parser.parse('> 10')).toThrow();
    expect(() => parser.parse('x > 10 &&')).toThrow();
    expect(() => parser.parse('&& y < 5')).toThrow();
    expect(() => parser.parse('x > 10 ? y')).toThrow();
    expect(() => parser.parse('x > 10 ? y :')).toThrow();
    expect(() => parser.parse('x + * 5')).toThrow();
    expect(() => parser.parse('(x + 5')).toThrow();
    expect(() => parser.parse('x + 5)')).toThrow();

    try {
      new IfThenRule('if x then z');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
    expect(() => new IfThenRule('if x then z')).toThrow();
    expect(() => new IfThenElseRule('if x then y else')).toThrow();
    expect(() => new IfThenElseRule('if x then else z')).toThrow();
    expect(() => new IfThenElseRule('if then y else z')).toThrow();
  });

  it('add rules to workspace and find applicable rules to context', async () => {

    const space = new WorkSpace();
    const graph = space.getGraph();
    const r1 = new IfThenRule('if x then y = true');
    expect(r1.required().size).toBe(1);
    const r2 = new IfThenRule('if a then b = true');
    expect(r2.required().size).toBe(1);

    space.addRule(r1);
    space.addRule(r2);

    expect(graph.roots.length).toBe(2);
    expect(space.getRules().length).toBe(2);

    let ctx = space.loadContext({ x: true });
    expect(space.applicableRules(ctx).length).toBe(1);
    ctx = space.loadContext({ x: 10, a: true });
    expect(space.applicableRules(ctx).length).toBe(2);
  });

  it('add rules to workspace and find applicable rules to context with nested keys', async () => {
    const space = new WorkSpace();
    const graph = space.getGraph();

    space.addRule('if x.y then z = true');
    space.addRule('if a.b then c = true');

    expect(graph.roots.length).toBe(2);
    expect(space.getRules().length).toBe(2);

    let ctx = space.loadContext({ x: { y: true } });
    expect(space.applicableRules(ctx).length).toBe(1);
    ctx = space.loadContext({ x: { y: 10 }, a: { b: true } });
    expect(space.applicableRules(ctx).length).toBe(2);
    ctx = space.loadContext({ a: { y: 10 }, b: { y: true } });
    expect(space.applicableRules(ctx).length).toBe(0);
  });

  it('parse expressions', async () => {
    const parser = new ExpressionParser();

    const expr1 = parser.parse('x > 10 && y < 5');
    expect(expr1).toBeInstanceOf(LogicalExpression);
    expect(expr1.required().size).toBe(2);

    const expr2 = parser.parse('a == 5 || b != 3');
    expect(expr2).toBeInstanceOf(LogicalExpression);
    const expr3 = parser.parse('x > 10 && (y < 5 || z == 0)');
    expect(expr3).toBeInstanceOf(LogicalExpression);
    expect(expr3.required().size).toBe(3);

    const expr4 = parser.parse('x > 10 ? y : z');
    expect(expr4).toBeInstanceOf(TernaryExpression);
    expect(expr4.required().size).toBe(3);

    const expr5 = parser.parse('x + 5 == y * 2');
    expect(expr5).toBeInstanceOf(ComparisonExpression);
    const expr6 = parser.parse('(x + 5) * 2 == (y / 2)');
    expect(expr6).toBeInstanceOf(ComparisonExpression);
    const expr7 = parser.parse('x + y >= 5 * 2');
    expect(expr7).toBeInstanceOf(ComparisonExpression);
    expect(expr7.required().size).toBe(2);

    const expr8 = parser.parse('x + y - 5 * 2');
    expect(expr8).toBeInstanceOf(ArithmeticExpression);
    const expr9 = parser.parse('(x + y) % 5');
    expect(expr9).toBeInstanceOf(ArithmeticExpression);
    expect(expr9.required().size).toBe(2);
  });

  it('parse functions', async () => {
    const space = new WorkSpace();
    space.addRule('if x < avogadro() then approx = floor(pi())');
    space.addRule('if x > max(1, 2, 3) then year = year(now())');
    space.addRule('if x >= 10 then calc = max(5, 10, 15) else result = min(5, 10, 15)');

    const ctx = space.loadContext({ x: 10 });
    expect(space.applicableRules(ctx).length).toBe(3);
    space.process(ctx);
    expect(ctx.getOutput('approx')).toBe(3);
    expect(ctx.getOutput('year')).toEqual(new Date().getFullYear());
    expect(ctx.getOutput('calc')).toBe(15);
  });


  it('evaluate rules', async () => {
    const space = new WorkSpace();
    const r1 = new IfThenRule('if x > 10 then result = 10 + 5 / 2');
    const r2 = new IfThenRule('if a == 5 then result = (10 + 5) / 2');

    space.addRule(r1);
    space.addRule(r2);

    let ctx = space.loadContext({ x: 15 });
    expect(space.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('result')).toBe(12.5);

    ctx = space.loadContext({ x: 9, a: 5 });
    expect(space.applicableRules(ctx).length).toBe(2);
    space.process(ctx);
    expect(ctx.getOutput('result')).toBe(7.5);

    ctx = space.loadContext({ x: 5, a: 5 });
    expect(space.applicableRules(ctx).length).toBe(2);

    const r3 = new IfThenElseRule('if x > 10 then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2');
    space.addRule(r3);
    ctx = space.loadContext({ x: 15 });
    expect(space.applicableRules(ctx).length).toBe(2);
    space.process(ctx);
    expect(ctx.getOutput('nested.value')).toBe(12.5);
    const output = ctx.getOutput();
    expect(output.nested.value).toBe(12.5);
  });

  it('read from rules file', async () => {
    const parser = new RulesFileReader({ accept: 'partial' });
    const content = `
      if x > 10 then result = 10 + 5 / 2
      if a == 5 then result = (10 + 5) / 2
      if x > 10 then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2
      if invalid syntax
    `;
    const result = parser.parse(content);
    // console.debug('Rules file parsing result:', result);
    expect(result.read).toBe(4);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.rules.length).toBe(3);
    expect(result.errors.length).toBe(1);

    const strictParser = new RulesFileReader({ accept: 'all' });
    const strictResult = strictParser.parse(content);
    // console.debug('Strict rules file parsing result:', strictResult);
    expect(strictResult.read).toBe(4);
    expect(strictResult.passed).toBe(0);
    expect(strictResult.failed).toBe(4);
    expect(strictResult.rules.length).toBe(0);
    expect(strictResult.errors.length).toBe(1);

    const blockParser = new RulesFileReader({ accept: 'partial', read_by: 'block' });
    const blockContent = `
      if x > 10 then result = 10 + 5 / 2
      
      if a == 5 then result = (10 + 5) / 2
      
      @name(Split over lines)
      if x > 10 
      then nested.value = 10 + 5 / 2 else nested.value = (10 + 5) / 2
      
      @name(Invalid Rule)
      if invalid syntax
    `;

    const blockResult = blockParser.parse(blockContent);
    expect(blockResult.read).toBe(4);
    expect(blockResult.passed).toBe(3);
    expect(blockResult.failed).toBe(1);
    expect(blockResult.rules.length).toBe(3);
    expect(blockResult.errors.length).toBe(1);

    const space = new WorkSpace();
    blockResult.rules.forEach(rule => space.addRule(rule));
    const r1 = space.getRule('Split over lines');
    expect(r1).toBeDefined();
    expect(r1!.name).toBe('Split over lines');
    const r2 = space.getRule('Valid Rule');
    expect(r2).toBeUndefined();
  });

  it('evaluate rules in iterations', async () => {
    const space = new WorkSpace({ debugging: false });
    space.addRule('if x > 10 then y = 15');

    let ctx = space.loadContext({ x: 12 });
    expect(space.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('y')).toBe(15);

    space.addRule('if y > 10 then z = 20');
    ctx = space.loadContext({ x: 12 });
    expect(space.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
    expect(ctx.getOutput('z')).toBe(20);

    // test oscillating data
    space.clearRules();
    space.addRule('if x > 10 then y = 15');
    space.addRule('if y > 10 then y = 20');
    ctx = space.loadContext({ x: 12 });
    expect(space.applicableRules(ctx).length).toBe(1);
    space.process(ctx);
  });

  it('read from constants file', async () => {
    const parser = new ConstantsFileReader({ accept: 'partial' });
    const content = `
      CONST YEAR=365
      AVOGADRO = 6.022e23
      CONST PI= 3.14159
      INVALID SYNTAX
    `;
    const result = parser.parse(content);
    // console.debug('Constants file parsing result:', result);
    expect(result.read).toBe(4);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.constants.YEAR).toBe('365');
    expect(result.constants.AVOGADRO).toBe('6.022e23');
    expect(result.constants.PI).toBe('3.14159');
    expect(result.errors.length).toBe(1);

    const strictResult = new ConstantsFileReader({ accept: 'all' }).parse(content);
    // console.debug('Strict constants file parsing result:', strictResult);
    expect(strictResult.read).toBe(4);
    expect(strictResult.passed).toBe(0);
    expect(strictResult.failed).toBe(4);
    expect(Object.keys(strictResult.constants).length).toBe(0);
    expect(strictResult.errors.length).toBe(1);

    const space = new WorkSpace();
    space.addConstants(result.constants);
    expect(space.getConstant('YEAR')).toBe('365');
    expect(space.getConstant('AVOGADRO')).toBe('6.022e23');
    expect(space.getConstant('PI')).toBe('3.14159');
  });

  it('handle conflicting rule effects', async () => {
    // Conflicting rules can be prevented by setting strict_conflicts to true in the workspace options. 
    // In this case, if two or more applicable rules have the same highest salience and affect the same output key, 
    // an error will be thrown to prevent non-deterministic behavior.
    const space = new WorkSpace({ strict_conflicts: true });
    space.addRule('if x > 10 then y = 15');
    space.addRule('if x > 20 then y = 20');

    let ctx = space.loadContext({ x: 12 });
    expect(() => space.process(ctx)).toThrow(/Conflict detected.*/);

    // If we set different salience values for the rules, the one with the higher salience will take precedence 
    // without throwing an error.
    space.addRule('if x > 30 then y = 25', 5);
    ctx = space.loadContext({ x: 35 });
    expect(space.process(ctx).y).toBe(25);

    const rmeta = new RuleParser().parse('@salience(7) @name(Highest Priority) if x > 30 then y = 30');
    expect(rmeta).toBeInstanceOf(IfThenRule);
    expect(rmeta!.name).toBe('Highest Priority');
    expect(rmeta!.getSalience()).toBe(7);

    space.addRule(rmeta!);
    ctx = space.loadContext({ x: 35 });
    expect(space.process(ctx).y).toBe(30);
  });

});
