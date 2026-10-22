export function mergeProps<T extends string = any>(...args: any[]) {
  const result: Record<string, any> = {};

  for (const props of args) {
    if (!props) continue;
    for (const key of Object.keys(props)) {
      if (key === "className") {
        result.className = [result.className, props.className].filter(Boolean).join(" ");
      } else if (key.startsWith("on") && typeof props[key] === "function") {
        const prev = result[key];
        const next = props[key];
        result[key] = prev
          ? (...eArgs: any[]) => {
              prev(...eArgs);
              next(...eArgs);
            }
          : next;
      } else {
        result[key] = props[key];
      }
    }
  }

  return result as any;
}
