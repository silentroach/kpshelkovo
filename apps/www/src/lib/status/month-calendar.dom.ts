const MONTH_SELECTOR = '[data-status-calendar-month]';
const DAY_ID_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

let installed = false;

const focusStatusCalendarDay = (): void => {
  const dayId = window.location.hash.slice(1);

  if (!DAY_ID_PATTERN.test(dayId)) {
    return;
  }

  const heading = document.getElementById(dayId);
  const section = heading?.parentElement;
  const month = section?.parentElement;

  if (
    !(heading instanceof HTMLHeadingElement) ||
    heading.tagName !== 'H2' ||
    section?.dataset.statusCalendarDay !== dayId ||
    !month?.matches(MONTH_SELECTOR)
  ) {
    return;
  }

  heading.focus({ preventScroll: true });
};

export const installStatusCalendarMonthFocus = (): void => {
  if (installed) {
    return;
  }

  installed = true;
  document.addEventListener('astro:page-load', focusStatusCalendarDay);
};
