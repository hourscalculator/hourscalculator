export function setFieldError(control: HTMLInputElement | HTMLSelectElement, message: string) {
    const errorId = control.dataset.errorId ?? `field-error-${crypto.randomUUID()}`;
    const existing = document.getElementById(errorId);
    if (!message) {
      existing?.remove();
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
      return;
    }
    control.dataset.errorId = errorId;
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", errorId);
    const text = existing ?? document.createElement("span");
    text.id = errorId;
    text.className = "field-message";
    text.textContent = message;
    if (!existing) {
      const timeHeading = control.closest(".time-field")?.querySelector(".time-field-heading");
      (timeHeading ?? control.closest("label") ?? control.parentElement)!.append(text);
    }
  }
