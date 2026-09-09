interface SectionWithOfficialTariff {
  readonly official: {
    readonly tariff_per_sotka_month: number;
  };
}

export const reglamentSectionsByOfficialTariff = <Section extends SectionWithOfficialTariff>(
  sections: readonly Section[]
): readonly Section[] =>
  sections
    .map((section, index) => ({ index, section }))
    .sort(
      (left, right) =>
        right.section.official.tariff_per_sotka_month -
          left.section.official.tariff_per_sotka_month || left.index - right.index
    )
    .map(({ section }) => section);
