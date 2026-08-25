export type RequiredProperties<T> = {
  readonly [Key in keyof T as undefined extends T[Key] ? never : Key]: true;
};
