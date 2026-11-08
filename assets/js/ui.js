/* Small DOM helpers; content is always assigned as text, never parsed as HTML. */
const CarePulseUI = {
  element(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  },
  setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  },
  button(text, className = "") {
    const button = this.element("button", className, text);
    button.type = "button";
    return button;
  }
};
