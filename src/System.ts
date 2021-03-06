module uzi {

  export type Value = string | number | Variable;

  export interface FuncEntry {
    name: string;
    func: Function;
  }

  /**
   * The default empty context.
   */
  let emptyContext = new Context();

  export class System {

    // A debugging tool for interrogating the system.
    public $: any;

    private relationships: Relationship[];
    private variables:     { [name: string]: Variable; };
    private funcs:         { [name: string]: FuncEntry; };
    private sequence:      Sequence;

    constructor() {
      this.reset();
      this.$ = this.proxy();
    }

    /**
     * Check if a function has been registered
     */
    hasFunction(name: string): boolean {
      return name in this.funcs;
    }

    /**
     * Register a function
     */
    func(name: string, func: Function): void {
      if (this.hasFunction(name)) {
        throw new Error(`${name} function already registered`);
      }
      this.funcs[name] = { name, func };
    }

    /**
     * Checks if a variable exists
     */
    has(name: string): boolean {
      return name in this.variables;
    }

    /**
     * Get a variable's value
     */
    get(name: string): number {
      return this.getVariable(name).getValue();
    }

    /**
     * Assign a variable's value
     */
    assign(name: string, v: number): void {
      this.getVariable(name).assignValue(v);
    }

    /**
     * Set a variable's value
     */
    set(name: string, v: number|string): void {
      if (v === "") {
        throw new Error(`it's not a value ${v}`);
      }
      this.clear(name);
      if (typeof v === "number") {
        this.getVariable(name).setValue(v, 0);
        return;
      }
      if (typeof v === "string") {
        this.equals(name, this.parse(v));
        return;
      }
      throw new Error(`it's not a value value ${v}`);
    }

    /**
     * Set a variables value to the evaluated node
     */
    setNode(name: string, node: any, ctx: Context = emptyContext): void {
      ctx.link(this.equals(name, this.evaluate(node, ctx)));
    }

    /**
     * Destroy a variable
     */
    destroy(name: string): void {
      if (this.has(name)) {
        this.destroyVariable(this.variables[name]);
      }
    }

    /**
     * Reset all transient variables
     */
    solve(digestID: number): void {
      for (let relationship of this.relationships) {
        relationship.notify(digestID);
      }
    }

    /**
     * Clear a variable's value. If a variable name is not passed, all are cleared.
     */
    clear(name?: string): void {
      if (name) {
        this.getVariable(name).clearValue();
      } else {
        for (let name of Object.keys(this.variables)) {
          this.clear(name);
        }
      }
    }

    /**
     * Reset the system
     */
    reset(): void {
      this.sequence = new Sequence();
      this.variables = Object.create(null);
      this.funcs = Object.create(null);
      this.relationships = [];
    }

    /**
     * left = right
     */
    equals(left: Value, right: Value): Relationship {
      let r = new Equality(
        this.variableFor(left),
        this.variableFor(right));
      this.relationships.push(r);
      return r;
    }

    /**
     * sum = addend1 + addend2
     */
    add(sum: Value, addend1: Value, addend2: Value): Relationship {
      let r = new Addition(
        this.variableFor(addend1),
        this.variableFor(addend2),
        this.variableFor(sum));
      this.relationships.push(r);
      return r;
    }

    /**
     * difference = minuend - subtrahend
     */
    subtract(difference: Value, minuend: Value, subtrahend: Value): Relationship {
      let r = new Subtraction(
        this.variableFor(minuend),
        this.variableFor(subtrahend),
        this.variableFor(difference));
      this.relationships.push(r);
      return r;
    }

    /**
     * product = mult1 * mult2
     */
    multiply(product: Value, mult1: Value, mult2: Value): Relationship {
      let r = new Multiplication(
        this.variableFor(mult1),
        this.variableFor(mult2),
        this.variableFor(product));
      this.relationships.push(r);
      return r;
    }

    /**
     * quotient = dividend / divisor
     */
    divide(quotient: Value, dividend: Value, divisor: Value): Relationship {
      let r = new Division(
        this.variableFor(dividend),
        this.variableFor(divisor),
        this.variableFor(quotient));
      this.relationships.push(r);
      return r;
    }

    /**
     * max = max(a, b)
     */
    call(funcName: string, out: Value, params: Value[], ctx: Context = emptyContext): Relationship {
      let entry = this.getFunction(funcName, ctx);
      let r = new CustomRelationship(
        entry.name,
        entry.func,
        params.map(p => this.variableFor(p)),
        this.variableFor(out));
      this.relationships.push(r);
      return r;
    }

    /**
     * Dump all the relationships as strings
     */
    toString(filter: string = null): string {
      let expressions = this.relationships.map(r => r.toString());
      if (filter) {
        expressions = expressions.filter(expr => expr.indexOf(filter) !== -1);
      }
      return expressions.join("\n");
    }

    /**
     * Destroy a relationship and any variables that were orphaned
     * in the process. Don't touch assigned variables.
     */
    destroyRelationship(r: Relationship): void {
      let index = this.relationships.indexOf(r);
      if (index === -1) {
        return;
      }
      this.relationships.splice(index, 1);
      for (let v of r.getVariables()) {
        v.detach(r);
        if (v.canDestroy()) {
          this.destroyVariable(v);
        }
      }
    }

    /**
     * Parse an expression with the provided context.
     */
    private parse(expr: string, ctx: Context = emptyContext): Variable {
      let root = Parser.parse<Expression>(expr, { startRule: "expression" });
      return this.evaluate(root, ctx);
    }

    /**
     * Evaluate an expression with the provided context.
     */
    private evaluate(node: Expression, ctx: Context): Variable {
      switch (node.tag) {
        case "ident":
        case "property":
          let name = ctx.identToName(node);
          return this.getVariable(name, ctx);
        case "number":
          return new Constant(node.value);
        case "op":
          return this.evaluateOperation(node, ctx);
        case "func_call":
          return this.evaluateFuncCall(node, ctx);
        default:
          throw new Error("invalid expression");
      }
    }

    /**
     * Get a function by name.
     */
    private getFunction(name: string, ctx: Context): FuncEntry {
      if (ctx.hasFunction(name)) {
        return ctx.getFunction(name);
      }
      if (this.hasFunction(name)) {
        return this.funcs[name];
      }
      throw new Error(`${name} is not a function`);
    }

    /**
     * Evaluate a function call node.
     */
    private evaluateFuncCall(node: FuncCallNode, ctx: Context): Variable {
      let result = this.createTransient();
      let params = node.params.map(p => this.evaluate(p, ctx));
      ctx.link(this.call(node.name, result, params, ctx));
      return result;
    }

    /**
     * Evaluate an operation node.
     */
    private evaluateOperation(node: OperationNode, ctx: Context): Variable {
      let left = this.evaluate(node.left, ctx);
      let right = this.evaluate(node.right, ctx);
      let result = this.createTransient();
      switch (node.op) {
        case "+":
          ctx.link(this.add(result, left, right));
          break;
        case "-":
          ctx.link(this.subtract(result, left, right));
          break;
        case "*":
          ctx.link(this.multiply(result, left, right));
          break;
        case "/":
          ctx.link(this.divide(result, left, right));
          break;
        default:
          throw new Error(`Syntax Error: invalid operator ${node.op}`);
      }
      return result;
    }

    /**
     * Get or create a variable.
     */
    getVariable(name: string, ctx: Context = emptyContext): Variable {
      if (ctx.hasVariable(name)) {
        return ctx.getVariable(name);
      }
      if (!this.has(name)) {
        this.variables[name] = new Variable(name);
      }
      return this.variables[name];
    }

    /**
     * Destroy a variable and any relationships that depend on it.
     */
    destroyVariable(v: Variable): void {
      let name = v.getName();
      if (!this.has(name)) {
        return;
      }
      delete this.variables[name];
      for (let r of v.getRelationships()) {
        this.destroyRelationship(r);
      }
    }

    /**
     * Create a variable with an unique name.
     */
    private createTransient(): Variable {
      let id   = this.sequence.next(),
          name = `$${id}`,
          v    = new Transient(name);
      this.variables[name] = v;
      return v;
    }

    /**
     * Create a variable for the provided value.
     */
    private variableFor(v: Value): Variable {
      if (typeof v === "string") {
        return this.getVariable(v);
      }
      else if (typeof v === "number") {
        return new Constant(v);
      }
      else {
        return v;
      }
    }

    /**
     * Creates a proxy object that can be used to play with the
     * constraint system interactively.
     */
    private proxy(): any {

      if (typeof Proxy === "undefined") {
        return null;
      }

      return new Proxy(this, {
        get(target: System, property: string, receiver: any): number {
          if (target.has(property)) {
            return target.get(property);
          }
          return undefined;
        },
        set(target: System, property: string, value: any, receiver: any): boolean {
          target.set(property, value);
          return true;
        },
        has(target: System, property: string): boolean {
          return target.has(property);
        },
        deleteProperty(target: System, property: string): boolean {
          target.destroy(property);
          return true;
        },
        ownKeys(target: System): string[] {
          return Object.keys(target.variables);
        }
      });
    }

  }

}
