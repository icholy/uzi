
module uzi {

  /**
   * Specifies which axis where's operating on.
   */
  export const enum Axis { X, Y }

  /**
   * Specifies the propeties of a rect.
   */
  export const enum Property {
    LEFT, RIGHT, WIDTH, CENTER_X, // X Axis
    TOP, BOTTOM, HEIGHT, CENTER_Y // Y Axis
  }

  /**
   * A RectPosition which also specifies which properties should
   * be used to update the Element.
   */
  export interface RectPositionUpdate extends RectPosition {
    hasAny: boolean;
    hasLeft: boolean;
    hasTop: boolean;
    hasWidth: boolean;
    hasHeight: boolean;
    hasOffset: boolean;
  }

  /**
   * A mapping between property names and the enumerated value.
   */
  export const nameToProperty = {
    "left": Property.LEFT,
    "right": Property.RIGHT,
    "width": Property.WIDTH,
    "center-x": Property.CENTER_X,
    "top": Property.TOP,
    "bottom": Property.BOTTOM,
    "height": Property.HEIGHT,
    "center-y": Property.CENTER_Y
  };

  /**
   * A mapping between the enumerated property values and the
   * axis they're on.
   */
  export let propertyToAxis = {} as { [property: number]: Axis; };
  propertyToAxis[Property.BOTTOM] = Axis.X;
  propertyToAxis[Property.LEFT] = Axis.X;
  propertyToAxis[Property.WIDTH] = Axis.X;
  propertyToAxis[Property.RIGHT] = Axis.X;
  propertyToAxis[Property.CENTER_X] = Axis.X;
  propertyToAxis[Property.TOP] = Axis.Y;
  propertyToAxis[Property.HEIGHT] = Axis.Y;
  propertyToAxis[Property.BOTTOM] = Axis.Y;
  propertyToAxis[Property.CENTER_Y] = Axis.Y;

  /**
   * ContrainedAxis defines the interface for an Axis' state.
   * The implementations form a state-machine which is used to glue together an
   * Element and it's backing Rect.
   */
  export interface ConstrainedAxis {

    /**
     * Take a new property to constrain and return the
     * new constrained axis.
     */
    constrain(property: Property): ConstrainedAxis;

    /**
     * Check if any of the contrained properties of the two
     * positions are different.
     */
    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean;

    /**
     * Check if any of the independent (unconstrained) properties of
     * the two positions are different.
     */
    independentAreDifferent(a: RectPosition, b: RectPosition): boolean;

    /**
     * Update the system with the position's independent (unconstrained)
     * properties.
     */
    updateSystem(rect: ManagedRect, position: RectPosition): void;

    /**
     * Update the element with the position's constrained properties.
     */
    updateRect(update: RectPositionUpdate): void;
  }

  export let XAxisBoth: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      throw new Error(`the x axis already has 2 constraints`);
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.left !== b.left || a.width !== b.width;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return false;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void { },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasLeft = true;
      update.hasWidth = true;
      update.hasOffset = true;
    }
  };

  export let XAxisLeft: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      return XAxisBoth;
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.left !== b.left;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.width !== b.width;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.width.assignValue(position.width, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasLeft = true;
      update.hasOffset = true;
    }
  };

  export let XAxisWidth: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      return XAxisBoth;
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.width !== b.width;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.left !== b.left;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.left.assignValue(position.left, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasWidth = true;
    }
  };

  export let XAxisNone: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      if (property === Property.WIDTH) {
        return XAxisWidth;
      } else {
        return XAxisLeft;
      }
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return false;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.width !== b.width || a.left !== b.left;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.left.assignValue(position.left, VState.ENVIRONMENT);
      rect.width.assignValue(position.width, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void { }
  };

  export let YAxisBoth: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      throw new Error(`the y axis already has 2 constraints`);
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.top !== b.top || a.height !== b.height;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return false;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void { },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasHeight = true;
      update.hasTop = true;
      update.hasOffset = true;
    }
  };

  export let YAxisTop: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      return YAxisBoth;
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.top !== b.top;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.height !== b.height;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.height.assignValue(position.height, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasTop = true;
      update.hasOffset = true;
    }
  };

  export let YAxisHeight: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      return YAxisBoth;
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.height !== b.height;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.top !== b.top;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.top.assignValue(position.top, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void {
      update.hasAny = true;
      update.hasHeight = true;
    }
  };

  export let YAxisNone: ConstrainedAxis = {

    constrain(property: Property): ConstrainedAxis {
      if (property === Property.HEIGHT) {
        return YAxisHeight;
      } else {
        return YAxisTop;
      }
    },

    constrainedAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return false;
    },

    independentAreDifferent(a: RectPosition, b: RectPosition): boolean {
      return a.top !== b.top || a.height !== b.height;
    },

    updateSystem(rect: ManagedRect, position: RectPosition): void {
      rect.top.assignValue(position.top, VState.ENVIRONMENT);
      rect.height.assignValue(position.height, VState.ENVIRONMENT);
    },

    updateRect(update: RectPositionUpdate): void { }
  };

}
