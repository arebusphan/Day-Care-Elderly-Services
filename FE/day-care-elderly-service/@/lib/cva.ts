export type VariantProps<T extends (...args: any) => any> = Parameters<T>[0];

export function cva(
  base?: string,
  config?: {
    variants?: Record<string, Record<string, string>>;
    defaultVariants?: Record<string, string>;
  }
) {
  return (props?: Record<string, any>) => {
    const classes = [base || ""];
    if (config?.variants) {
      for (const [variantName, variantOptions] of Object.entries(config.variants)) {
        const selected = props?.[variantName] ?? config.defaultVariants?.[variantName];
        if (selected && variantOptions[selected]) {
          classes.push(variantOptions[selected]);
        }
      }
    }
    if (props?.className) {
      classes.push(props.className);
    }
    return classes.filter(Boolean).join(" ");
  };
}
