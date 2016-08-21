module Absolution {

  export class Environment {

    private rulesById      = {} as { [id: string]: Rule[]; };
    private rulesByClass   = {} as { [className: string]: Rule[]; };
    private rulesByVirtual = {} as { [id: string]: Rule[]; };
    private userVariables  = [] as VariableNode[];
    private parserCache    = {} as { [input: string]: any; };

    constructor(stylesheet?: StyleSheet) {
      if (stylesheet) {
        this.parseRulesets(stylesheet.rulesets);
        this.userVariables.push(...stylesheet.variables);
      }
    }

    private parse<T>(input: string, options?: ParseOptions): T {
      let result = this.parserCache[input];
      if (!result) {
        result = Parser.parse<T>(input, options);
        this.parseRulesets[input] = result;
      }
      return result;
    }

    /**
     * Get a list of selectors from the stylesheet.
     */
    getSelectors(): string[] {
      let selectors = [];
      for (let className of Object.keys(this.rulesByClass)) {
        selectors.push(`.${className}`);
      }
      for (let id of Object.keys(this.rulesById)) {
        selectors.push(`#${id}`);
      }
      return selectors;
    }

    private parseRulesets(rulesets: RuleSet[]): void {
      for (let { selector, rules } of rulesets) {
        switch (selector.type) {
          case ".":
            if (this.hasRulesForClass(selector.name)) {
              this.rulesByClass[selector.name].push(...rules);
            } else {
              this.rulesByClass[selector.name] = rules;
            }
            break;
          case "#":
            if (this.hasRulesForId(selector.name)) {
              this.rulesById[selector.name].push(...rules);
            } else {
              this.rulesById[selector.name] = rules;
            }
            break;
          case "~":
            if (this.hasRulesForVirtual(selector.name)) {
              this.rulesByVirtual[selector.name].push(...rules);
            } else {
              this.rulesByVirtual[selector.name] = rules;
            }
            break;
          default:
            throw new Error(`${selector.type} is not a valid selector type`);
        }
      }
    }

    loadStyleSheet(stylesheet: StyleSheet): void {
      this.parseRulesets(stylesheet.rulesets);
      this.userVariables.push(...stylesheet.variables);
    }

    parseStyleSheet(input: string): void {
      try {
        let stylesheet = this.parse<StyleSheet>(input, { startRule: "stylesheet" });
        this.loadStyleSheet(stylesheet);
      } catch (e) {
        if (e instanceof Parser.SyntaxError) {
          throw new Error(Utils.formatParserError(e, input));
        } else {
          throw e;
        }
      }
    }

    private getClassNames(el: HTMLElement): string[] {
      let classNames = el.className.split(" ");
      return classNames.map(name => name.trim());
    }

    /**
     * Get the rect options for an element, or null if it's not valid.
     * You can pass a second parameter which forces it.
     */
    getRectOptions(el: HTMLElement, isRect: boolean = false): RectOptions {

      let options: RectOptions = {
        id:        el.id,
        container: null,
        watcher:   null,
        rules:     []
      };

      if (options.id && this.hasRulesForId(options.id)) {
        for (let rule of this.rulesById[options.id]) {
          this.handleRule(options, rule);
        }
      }

      for (let name of this.getClassNames(el)) {
        if (this.hasRulesForClass(name)) {
          for (let rule of this.rulesByClass[name]) {
            this.handleRule(options, rule);
          }
        }
      }

      if (el.hasAttribute("a-rect")) {
        isRect = true;
      }

      if (el.hasAttribute("a-style")) {
        let style = el.getAttribute("a-style");
        let rules = this.parse<Rule[]>(style, { startRule: "inline_rules" });
        for (let rule of rules) {
          this.handleRule(options, rule);
        }
        isRect = true;
      }

      if (!isRect && options.rules.length === 0) {
        return null;
      }

      // if there's no id, create a GUID
      if (!options.id) {
        options.id = Utils.guid();
      }

      return options;
    }

    private ruleFor(target: string, text: string, expr?: Expression): Rule {
      if (!expr) {
        expr = this.parse<Expression>(text, { startRule: "expression" });
      }
      return { target, text, expr };
    }

    private identFrom({ target, text, expr }: Rule): string {
      if (!expr) {
        expr = this.ruleFor(target, text).expr;
      }
      if (expr.tag !== "ident") {
        throw new Error(`"${text}" is a ${expr.tag} not an identifier`);
      }
      return expr.value;
    }

    private handleRule(options: RectOptions, rule: Rule): void {
      try {
        let ident: string;
        switch (rule.target) {
          case "watch":
            break;
          case "relative-to":
            options.container = this.identFrom(rule);
            break;
          case "center-in":
            ident = this.identFrom(rule);
            this.handleRule(options, this.ruleFor("center-x", `${ident}.center-x`));
            this.handleRule(options, this.ruleFor("center-y", `${ident}.center-y`));
            break;
          case "align-x":
            ident = this.identFrom(rule);
            this.handleRule(options, this.ruleFor("left", `${ident}.left`));
            this.handleRule(options, this.ruleFor("right", `${ident}.right`));
            break;
          case "align-y":
            ident = this.identFrom(rule);
            this.handleRule(options, this.ruleFor("top", `${ident}.top`));
            this.handleRule(options, this.ruleFor("bottom", `${ident}.bottom`));
            break;
          case "size":
            ident = this.identFrom(rule);
            this.handleRule(options, this.ruleFor("width", `${ident}.width`));
            this.handleRule(options, this.ruleFor("height", `${ident}.height`));
            break;
          case "fill":
            ident = this.identFrom(rule);
            this.handleRule(options, this.ruleFor("top", `${ident}.top`));
            this.handleRule(options, this.ruleFor("bottom", `${ident}.bottom`));
            this.handleRule(options, this.ruleFor("left", `${ident}.left`));
            this.handleRule(options, this.ruleFor("right", `${ident}.right`));
            break;
          default:
            options.rules.push(
                this.ruleFor(rule.target, rule.text, rule.expr));
        }
      } catch (e) {
        let reason = e instanceof Error ? e.message : e.toString();
        throw new Error(
          `couldn't create rule ${rule.target}="${rule.text}" because ${reason}`);
      }
    }

    hasRulesForId(id: string): boolean {
      return this.rulesById.hasOwnProperty(id);
    }

    hasRulesForClass(id: string): boolean {
      return this.rulesByClass.hasOwnProperty(id);
    }

    hasRulesForVirtual(id: string): boolean {
      return this.rulesByVirtual.hasOwnProperty(id);
    }

    getUserVariables(): VariableNode[] {
      return this.userVariables;
    }

    getVirtuals(): RectOptions[] {
      return Object.keys(this.rulesByVirtual).map(id => {
        let options: RectOptions = {
          id:        id,
          container: null,
          watcher:   null,
          rules:     []
        };
        for (let rule of this.rulesByVirtual[id]) {
          this.handleRule(options, rule);
        }
        return options;
      });
    }

  }

}
