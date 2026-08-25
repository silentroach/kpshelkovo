const CONTACT_REVIEW_HIGHLIGHT_TRIGGER_SELECTOR =
  '[data-contact-review-highlight-trigger]';

const contactReviewHighlightTrigger = (
  target: unknown,
): HTMLElement | undefined => {
  if (!(target instanceof Element)) {
    return;
  }

  return (
    target.closest<HTMLElement>(CONTACT_REVIEW_HIGHLIGHT_TRIGGER_SELECTOR) ??
    undefined
  );
};

const contactReviewHighlightTooltip = (
  trigger: HTMLElement,
): HTMLElement | undefined => {
  const tooltipId = trigger.getAttribute('aria-describedby');

  return tooltipId
    ? (document.getElementById(tooltipId) ?? undefined)
    : undefined;
};

const setContactReviewHighlightTooltipHidden = (
  trigger: HTMLElement | undefined,
  hidden: boolean,
): boolean => {
  if (!trigger) {
    return false;
  }

  const tooltip = contactReviewHighlightTooltip(trigger);
  if (!tooltip) {
    return false;
  }

  tooltip.hidden = hidden;
  return true;
};

export const bindContactReviewHighlightTooltips = (): void => {
  let hoveredTrigger: HTMLElement | undefined;

  document.addEventListener('mouseover', (event) => {
    const trigger = contactReviewHighlightTrigger(event.target);
    if (!trigger || trigger === hoveredTrigger) {
      return;
    }

    hoveredTrigger = trigger;
    setContactReviewHighlightTooltipHidden(trigger, false);
  });

  document.addEventListener('mouseout', (event) => {
    const trigger = contactReviewHighlightTrigger(event.target);
    if (
      !trigger ||
      (event.relatedTarget instanceof Node &&
        trigger.contains(event.relatedTarget))
    ) {
      return;
    }

    if (hoveredTrigger === trigger) {
      hoveredTrigger = undefined;
    }
    if (document.activeElement !== trigger) {
      setContactReviewHighlightTooltipHidden(trigger, false);
    }
  });

  document.addEventListener('focusin', (event) => {
    setContactReviewHighlightTooltipHidden(
      contactReviewHighlightTrigger(event.target),
      false,
    );
  });

  document.addEventListener('focusout', (event) => {
    const trigger = contactReviewHighlightTrigger(event.target);
    if (!trigger || trigger === hoveredTrigger) {
      return;
    }

    setContactReviewHighlightTooltipHidden(trigger, false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const focusedTrigger = contactReviewHighlightTrigger(event.target);
    const dismissedFocusedTooltip = setContactReviewHighlightTooltipHidden(
      focusedTrigger,
      true,
    );
    const dismissedHoveredTooltip =
      hoveredTrigger !== focusedTrigger &&
      setContactReviewHighlightTooltipHidden(hoveredTrigger, true);

    if (dismissedFocusedTooltip || dismissedHoveredTooltip) {
      event.stopPropagation();
    }
  });
};
