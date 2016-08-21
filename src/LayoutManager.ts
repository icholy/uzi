
interface ElementOptions {
  element:    HTMLElement,
  container?: HTMLElement
}

const attributeMap = {
  "anchorLeft":    "left",
  "anchorRight":   "right",
  "anchorTop":     "top",
  "anchorBottom":  "bottom",
  "anchorWidth":   "width",
  "anchorHeight":  "height",
  "anchorHcenter": "hcenter",
  "anchorVcenter": "vcenter"
};

class LayoutManager {

  system = new Constraints.System();
  managers = [] as RectManager[];

  constructor(root: HTMLElement) {
    let iterator = document.createNodeIterator(root, NodeFilter.SHOW_ELEMENT);
    let el: HTMLElement;
    while (el = iterator.nextNode() as any) {
      let isRegistered = false;
      let manager = null;
      Object.keys(el.dataset).forEach(key => {
        if (!attributeMap[key]) {
          return;
        }
        if (!isRegistered) {
          manager = this.register(el, null);
          isRegistered = true;
        }
        let property = attributeMap[key];
        manager.constrain(property, el.dataset[key]);
      });
    }
  }

  /**
   * Register an element with the layout
   */
  register(element: HTMLElement, container?: HTMLElement): ElementManager {
    let m = new ElementManager(this.system, element, container);
    this.managers.push(m);
    return m;
  }

  /**
   * Update the system from the element's actual values
   */
  updateSystem(): void {
    for (let manager of this.managers) {
      manager.updateSystem();
    }
  }

  /**
   * Update the elements with the system's value
   */
  updateLayout(): void {
    this.system.solve();
    for (let manager of this.managers) {
      manager.updateRect();
    }
  }

}
