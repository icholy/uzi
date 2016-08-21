module Robin {

  export class Variable {

    private relationships: Relationship[] = [];
    private flexibility = 0.001;
    private digestID    = -1;

    constructor(
      private name: string,
      private value: number = null
    ) {}

    /**
     * Assigns a value to the variable.
     */
    assignValue(v: number): void {
      this.value = v;
      this.digestID = -1;
    }

    /**
     * Attempts to set the value. This method will throw an Error
     * if attempting to set a different value than already set.
     */
    setValue(v: number, digestID: number): void {
      if (this.hasValue(digestID)) {
        if (this.isCloseEnough(v)) {
          return;
        }
        throw new Error(`Contradiction: ${this} is already set (attempting to set ${v})`);
      }
      this.digestID = digestID;
      this.value = v;
      this.notify(digestID);
    }

    /**
     * Get the variables value or null of not set.
     */
    getValue(): number {
      return this.value;
    }

    /**
     * Check if variable has value.
     */
    hasValue(digestID: number): boolean {
      if (this.digestID !== digestID && !this.isAssigned()) {
        return false;
      }
      return this.value !== null;
    }

    /**
     * Clear the variables value
     *
     * @param force clear the value even if it's been assigned
     */
    clearValue(): void {
      this.value = null;
    }

    /**
     * Add a relationship to be notified when the
     * variable's value changes.
     */
    attach(relationship: Relationship): void {
      this.relationships.push(relationship);
    }

    /**
     * Remove a relationship and stop getting notifications
     * when the value changes.
     */
    detach(relationship: Relationship): void {
      let index = this.relationships.indexOf(relationship);
      if (index !== -1) {
        this.relationships.splice(index, 1);
      }
    }

    /**
     * Get a list of all attached relationships.
     */
    getRelationships(): Relationship[] {
      return this.relationships;
    }

    /**
     * Check if the current value has been assigned.
     */
    isAssigned(): boolean {
      return this.digestID === -1;
    }

    /**
     * Check if there are any relationships.
     */
    isOrphan(): boolean {
      return this.relationships.length === 0;
    }

    /**
     * Get the variable name.
     */
    getName(): string {
      return this.name;
    }

    /**
     * Get a string representation of the variable.
     */
    toString(): string {
      return `${this.name}(${this.getValue()})`;
    }

    private notify(digestID: number): void {
      for (let relationship of this.relationships) {
        relationship.solve(digestID);
      }
    }

    /**
     * Check if the value is close enough to the current
     * value to be considered equal
     */
    private isCloseEnough(v: number): boolean {
      return Math.abs(v - this.value) <= this.flexibility;
    }

  }

}