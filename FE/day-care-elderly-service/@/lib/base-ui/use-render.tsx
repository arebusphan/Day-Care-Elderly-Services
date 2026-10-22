import * as React from "react";

export namespace useRender {
  export type ComponentProps<T extends React.ElementType> = React.ComponentProps<T> & {
    render?: React.ReactNode;
  };
}

export function useRender({
  defaultTagName: Tag = "span",
  props,
  render,
}: {
  defaultTagName?: any;
  props: any;
  render?: any;
  state?: any;
}) {
  if (React.isValidElement(render)) {
    return React.cloneElement(render, props);
  }
  return <Tag {...props} />;
}
